import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildManifest} from '../tools/import-corpus.mjs';
import {buildImportPlan,parseArgs,main,assertPrivateStorage} from '../tools/execute-corpus-import.mjs';
import {fileURLToPath} from 'node:url';
import {createStore} from '../lib/store.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
async function fixture(t,{large=false}={}) {
  const dir=await mkdtemp(path.join(tmpdir(),'ba-corpus-import-'));
  const stores=[];
  t.after(async()=>{for(const store of stores)store.close();assert.equal(path.dirname(dir),path.resolve(tmpdir()));assert.ok(path.basename(dir).startsWith('ba-corpus-import-'));await rm(dir,{recursive:true,force:true});});
  const sourceRoot=path.join(dir,'source');await mkdir(sourceRoot);await mkdir(path.join(sourceRoot,'category'));
  const bytes=large?Buffer.alloc(6*1024*1024,65):Buffer.from('Synthetic original');
  await writeFile(path.join(sourceRoot,'category','original.pdf'),bytes);
  const doc={id:'DOC-SYNTHETIC',title:'original.pdf',path:'category/original.pdf',sha256:hash(bytes),bytes:bytes.length,case:'Synthetic case',cases:['Synthetic case'],aliases:[],source_nature_code:'document_source_ou_copie',source_nature:'Source ou copie synthétique',extraction_status:'partiel',missing_text_pages_unresolved:[2],ocr_pages_to_verify:[1],visual_sample_checks:[{page:1,findings:'Synthetic visual note'}],text:'FULL DOCUMENT',pages:[{page:1,text:'Réparation retrouvée. <script>no execution</script>',method:'ocr_Windows_local_a_controler',visual_review_note:'Compare with original',source_ocr_sha256:hash('ocr')},{page:2,text:'',method:'image_sans_texte_natif'}]};
  const corpusPath=path.join(dir,'corpus.json');await writeFile(corpusPath,JSON.stringify({schema_version:1,documents:[doc]}));
  const manifest=await buildManifest({sourceRoot,corpusPath,caseName:'Synthetic case'});
  const manifestPath=path.join(dir,'manifest.json');const raw=JSON.stringify(manifest);await writeFile(manifestPath,raw);
  const options={sourceRoot,corpusPath,manifestPath,manifestSha256:hash(raw),dbPath:path.join(dir,'private.sqlite'),blobDir:path.join(dir,'blobs'),tenantId:'tenant-synthetic',subject:'client-synthetic',caseId:randomUUID(),createCase:true,title:'Synthetic case'};
  return {dir,bytes,doc,options,openStore(){const store=createStore(options);stores.push(store);return store;},user:{tenantId:options.tenantId,subject:options.subject,product:'besoinavocat',active:true}};
}
test('real import preserves source bytes, pages, references and missing/OCR status; retry is idempotent',async t=>{
  const f=await fixture(t);const plan=await buildImportPlan(f.options);
  const store=f.openStore();
  const first=store.importCorpus(f.user,f.options.caseId,plan,{createCase:{title:'Synthetic case'}});
  assert.equal(first.imported,1);assert.equal(first.pages,2);
  const second=store.importCorpus(f.user,f.options.caseId,plan);assert.equal(second.imported,0);assert.equal(second.skipped,1);
  const detail=store.details(f.user,f.options.caseId),doc=detail.documents[0];
  assert.equal(doc.pageCount,2);assert.equal(doc.category,'category');assert.deepEqual(doc.missingTextPages,[2]);assert.deepEqual(doc.ocrPagesToVerify,[1]);assert.equal(doc.reviewStatus,'a_verifier');
  const page=store.documentPages(f.user,f.options.caseId,doc.id,{offset:0,limit:1});
  assert.equal(page.pages[0].text,f.doc.pages[0].text);assert.equal(page.pages[0].source_ocr_sha256,f.doc.pages[0].source_ocr_sha256);assert.deepEqual(page.source.visual_sample_checks,f.doc.visual_sample_checks);
  assert.equal(store.download(f.user,f.options.caseId,doc.id).content.compare(f.bytes),0);
  const result=store.search(f.user,f.options.caseId,'reparation')[0];assert.equal(result.citation.page,1);assert.equal(result.citation.ocrToVerify,true);assert.equal(result.citation.sourceDocumentId,f.doc.id);
  assert.throws(()=>store.db.prepare('UPDATE document_pages SET text=?').run('changed'),/immutable/);
  assert.throws(()=>store.db.prepare('DELETE FROM document_imports').run(),/immutable/);
});
test('page and search access remain isolated by membership and tenant',async t=>{
  const f=await fixture(t);const plan=await buildImportPlan(f.options);const store=f.openStore();store.importCorpus(f.user,f.options.caseId,plan,{createCase:{title:'Synthetic'}});
  const doc=store.details(f.user,f.options.caseId).documents[0];
  for(const other of [{...f.user,subject:'stranger'},{...f.user,tenantId:'another-tenant'}]) {
    assert.throws(()=>store.documentPages(other,f.options.caseId,doc.id),/introuvable|accessible/);
    assert.throws(()=>store.search(other,f.options.caseId,'reparation'),/introuvable|accessible/);
  }
  assert.throws(()=>store.documentPages(f.user,f.options.caseId,doc.id,{offset:-1}),/Pagination/);
});
test('operator import accepts a document larger than former 5 MiB limit and preserves its hash',async t=>{
  const f=await fixture(t,{large:true});const plan=await buildImportPlan(f.options);const store=f.openStore();
  assert.equal(store.importCorpus(f.user,f.options.caseId,plan,{createCase:{title:'Synthetic'}}).imported,1);
  const doc=store.details(f.user,f.options.caseId).documents[0];assert.equal(doc.bytes,6*1024*1024);assert.equal(doc.sha256,hash(f.bytes));
});
test('source change after planning rolls back database import, and changed manifest/corpus cannot be planned',async t=>{
  const f=await fixture(t);const plan=await buildImportPlan(f.options);const store=f.openStore();
  await writeFile(plan.documents[0].absolutePath,'different');assert.throws(()=>store.importCorpus(f.user,f.options.caseId,plan,{createCase:{title:'Synthetic'}}),/changé/);assert.equal(store.listCases(f.user).length,0);
  await assert.rejects(buildImportPlan(f.options),/Empreinte différente/);
  await writeFile(f.options.manifestPath,'{}');await assert.rejects(buildImportPlan(f.options),/SHA mismatch/);
});
test('execution requires a matching prior dry-run plan and creates nothing during dry run',async t=>{
  const f=await fixture(t);const o=f.options;
  const args=['--manifest',o.manifestPath,'--manifest-sha256',o.manifestSha256,'--corpus',o.corpusPath,'--root',o.sourceRoot,'--database',o.dbPath,'--blobs',o.blobDir,'--tenant',o.tenantId,'--subject',o.subject,'--case-id',o.caseId,'--create-case','--title',o.title];
  const dry=await main(args);assert.equal(dry.mode,'dry_run');await assert.rejects(readFile(o.dbPath),/ENOENT/);
  await assert.rejects(main([...args,'--execute','--plan-sha256','0'.repeat(64)]),/Plan changed/);
  const executed=await main([...args,'--execute','--plan-sha256',dry.planSha256]);assert.equal(executed.result.imported,1);
  assert.throws(()=>parseArgs([...args,'--execute']),/preceding dry-run/);
  assert.throws(()=>parseArgs([...args,'--dry-run','--execute','--plan-sha256',dry.planSha256]),/never both/);
  assert.throws(()=>parseArgs([...args,'--token','not-a-real-token']),/execute-corpus-import/);
});

test('configured limits reject oversized files and case quota while equal bytes do not consume quota twice',async t=>{
  const f=await fixture(t);
  const code=`
    import assert from 'node:assert/strict';
    import {createStore} from './platform/lib/store.mjs';
    import {documentInput,MAX_DOCUMENT_BYTES} from './platform/lib/validation.mjs';
    assert.equal(MAX_DOCUMENT_BYTES,1024);
    const user={tenantId:'test-tenant',subject:'test-user',product:'besoinavocat',active:true};
    const store=createStore({dbPath:process.argv[1],blobDir:process.argv[2]});
    const value=bytes=>({name:'synthetic.txt',mimeType:'text/plain',contentBase64:bytes.toString('base64'),sourceType:'original',reviewStatus:'a_verifier'});
    try {
      const item=store.createCase(user,{title:'Synthetic quota',reference:''});
      assert.throws(()=>documentInput(value(Buffer.alloc(1025))),e=>e.status===413);
      const doc=documentInput(value(Buffer.alloc(1000,65)));
      store.addDocument(user,item.id,doc);store.addDocument(user,item.id,doc);
      assert.throws(()=>store.addDocument(user,item.id,documentInput(value(Buffer.alloc(600,66)))),e=>e.code==='CASE_QUOTA_EXCEEDED');
      assert.equal(store.details(user,item.id).documents.length,2);
    } finally {store.close();}
  `;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code,f.options.dbPath,f.options.blobDir],{cwd:new URL('../..',import.meta.url),encoding:'utf8',env:{...process.env,BA_MAX_DOCUMENT_BYTES:'1024',BA_CASE_STORAGE_QUOTA_BYTES:'1500'},windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});

test('operator storage refuses public paths and a canonical directory link into public assets',async t=>{
  const f=await fixture(t);
  const publicRoot=fileURLToPath(new URL('../public/',import.meta.url));
  await assert.rejects(assertPrivateStorage({...f.options,dbPath:path.join(publicRoot,'not-created.sqlite')}),/Storage cannot be public/);
  await assert.rejects(assertPrivateStorage({...f.options,dbPath:path.join(f.dir,'public_html/not-created.sqlite')}),/Storage cannot be public/);
  const link=path.join(f.dir,'linked-public');await symlink(publicRoot,link,process.platform==='win32'?'junction':'dir');
  await assert.rejects(assertPrivateStorage({...f.options,blobDir:path.join(link,'not-created')}),/Storage cannot be public/);
  await assert.rejects(readFile(path.join(publicRoot,'not-created.sqlite')),/ENOENT/);
});
