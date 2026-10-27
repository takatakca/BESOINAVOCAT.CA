#!/usr/bin/env node
// Explicit operator CLI, no network, no credentials, no authentication bypass route.
import {createHash} from 'node:crypto';
import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildManifest,safeRelative} from './import-corpus.mjs';
import {MAX_DOCUMENT_BYTES,CASE_STORAGE_QUOTA_BYTES,externalIdentifier,identifier} from '../lib/validation.mjs';
import {createStore} from '../lib/store.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const HASH=/^[a-f0-9]{64}$/u;
async function canonicalDestination(value) {
  let current=path.resolve(value);const tail=[];
  for(;;) {
    try {return path.join(await realpath(current),...tail.reverse());}
    catch(error) {
      if(error.code!=='ENOENT')throw error;
      const parent=path.dirname(current);if(parent===current)throw error;
      tail.push(path.basename(current));current=parent;
    }
  }
}
export async function assertPrivateStorage(o) {
  const publicRoot=await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public'));
  for(const file of [o.dbPath,o.blobDir]) {
    const resolved=await canonicalDestination(file),rel=path.relative(publicRoot,resolved);
    if(!rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))||resolved.split(path.sep).some(part=>/^(?:public_html|htdocs|wwwroot)$/iu.test(part)))throw new Error('Storage cannot be public');
  }
}
const mime = {pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',tif:'image/tiff',tiff:'image/tiff',eml:'message/rfc822',json:'application/json',csv:'text/csv',txt:'text/plain',md:'text/plain',html:'text/html',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
export const USAGE='node platform/tools/execute-corpus-import.mjs --manifest <private.json> --manifest-sha256 <sha> --corpus <corpus.json> --root <sources> --database <private.sqlite> --blobs <private-dir> --tenant <id> --subject <id> --case-id <uuid> [--create-case --title <title>] [--execute --plan-sha256 <previous-dry-run-sha>]';
export function parseArgs(args) {
  const o={execute:false,createCase:false};
  const flags={'--manifest':'manifestPath','--manifest-sha256':'manifestSha256','--corpus':'corpusPath','--root':'sourceRoot','--database':'dbPath','--blobs':'blobDir','--tenant':'tenantId','--subject':'subject','--case-id':'caseId','--title':'title','--plan-sha256':'planSha256'};
  for(let i=0;i<args.length;i++) {
    const a=args[i]; if(a==='--help')return {help:true};
    if(a==='--dry-run'){if(o.dryRun)throw new Error('Duplicate flag');o.dryRun=true;continue;}
    if(a==='--execute'||a==='--create-case'){const k=a==='--execute'?'execute':'createCase';if(o[k])throw new Error('Duplicate flag');o[k]=true;continue;}
    const k=flags[a];if(!k||o[k]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw new Error(USAGE);o[k]=args[++i];
  }
  for(const k of ['manifestPath','manifestSha256','corpusPath','sourceRoot','dbPath','blobDir','tenantId','subject','caseId'])if(!o[k])throw new Error(USAGE);
  if(!HASH.test(o.manifestSha256)||!externalIdentifier(o.tenantId)||!externalIdentifier(o.subject))throw new Error('Destination or manifest hash invalid');
  identifier(o.caseId);
  if(o.dryRun&&o.execute)throw new Error('Choose either --dry-run or --execute, never both.');
  if(o.execute&&!HASH.test(o.planSha256||''))throw new Error('Execute requires the SHA of a preceding dry-run plan.');
  if(o.createCase&&(!o.title?.trim()||o.title.length>240))throw new Error('Explicit case title required');
  return o;
}

export async function buildImportPlan(o) {
  await assertPrivateStorage(o);
  if((await stat(o.manifestPath)).size>128*1024*1024)throw new Error('Prepared manifest exceeds limit');
  const manifestBytes=await readFile(o.manifestPath);
  if(manifestBytes.length>128*1024*1024||hash(manifestBytes)!==o.manifestSha256)throw new Error('Prepared manifest SHA mismatch');
  const manifest=JSON.parse(manifestBytes);
  if(manifest.schema_version!==1||manifest.mode!=='dry_run_manifest_only'||!manifest.case_filter)throw new Error('Use a prepared manifest with an explicit exact case filter.');
  const input=await realpath(o.corpusPath);
  if((await stat(input)).size>128*1024*1024)throw new Error('Corpus exceeds limit');
  const corpusBytes=await readFile(input);
  if(hash(corpusBytes)!==manifest.source_corpus?.sha256)throw new Error('Corpus changed since manifest preparation');
  // All originals, aliases and supporting provenance references are rechecked.
  const rebuilt=await buildManifest({corpusPath:input,sourceRoot:o.sourceRoot,caseName:manifest.case_filter});
  if(JSON.stringify(rebuilt.entries)!==JSON.stringify(manifest.entries))throw new Error('Prepared entries do not match the verified corpus and source tree');
  const root=await realpath(o.sourceRoot),corpus=JSON.parse(corpusBytes);
  const byId=new Map();for(const doc of corpus.documents){if(typeof doc.id!=='string'||byId.has(doc.id))throw new Error('Missing or duplicate source document ID');byId.set(doc.id,doc);}
  const documents=[];const uniqueBytes=new Map();
  for(const entry of manifest.entries) {
    const doc=byId.get(entry.source_id);
    if(!doc||doc.sha256!==entry.sha256||doc.path!==entry.path)throw new Error('Source document mismatch');
    if(!Number.isSafeInteger(entry.bytes)||entry.bytes<1||entry.bytes>MAX_DOCUMENT_BYTES)throw new Error('Document exceeds configured limit');
    const absolutePath=await realpath(path.join(root,...safeRelative(entry.path).split('/')));
    const relative=path.relative(root,absolutePath);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw new Error('Source escapes authorized root');
    const pages=doc.pages??[];
    if(!Array.isArray(pages)||pages.length>10000)throw new Error('Page structure invalid');
    for(const page of pages)if(!page||typeof page.text!=='string'||!page.text.isWellFormed()||page.text.length>2*1024*1024||JSON.stringify(page).length>4*1024*1024)throw new Error('Page data invalid or oversized');
    const {text:unusedText,pages:unusedPages,...metadata}=doc;
    if(JSON.stringify(metadata).length>4*1024*1024)throw new Error('Document metadata oversized');
    const kind=doc.source_nature_code;
    const sourceType=kind==='document_source_ou_copie'?'original':kind==='extraction_ou_transcription'?'ocr':'analyse';
    documents.push({sourceId:doc.id,sha256:entry.sha256,bytes:entry.bytes,name:entry.name,
      absolutePath,mimeType:mime[path.extname(entry.path).slice(1).toLowerCase()]||'application/octet-stream',sourceType,
      category:path.posix.dirname(entry.path),metadata,pages});
    uniqueBytes.set(entry.sha256,entry.bytes);
  }
  const bytes=[...uniqueBytes.values()].reduce((n,v)=>n+v,0);
  if(bytes>CASE_STORAGE_QUOTA_BYTES)throw new Error('Import alone exceeds case storage quota');
  const summary={manifestSha256:o.manifestSha256,corpusSha256:manifest.source_corpus.sha256,caseFilter:manifest.case_filter,
    destination:{tenantId:o.tenantId,subject:o.subject,caseId:o.caseId,dbPath:path.resolve(o.dbPath),blobDir:path.resolve(o.blobDir),createCase:Boolean(o.createCase),title:o.title||null},
    limits:{maxDocumentBytes:MAX_DOCUMENT_BYTES,caseStorageQuotaBytes:CASE_STORAGE_QUOTA_BYTES},
    documents:documents.length,pages:documents.reduce((n,d)=>n+d.pages.length,0),uniqueBytes:bytes,
    content:documents.map(d=>({sourceId:d.sourceId,sha256:d.sha256,bytes:d.bytes,metadataSha256:hash(JSON.stringify(d.metadata)),pagesSha256:hash(JSON.stringify(d.pages))}))};
  return {corpusSha256:manifest.source_corpus.sha256,documents,summary,planSha256:hash(JSON.stringify(summary))};
}

export async function main(args=process.argv.slice(2)) {
  const o=parseArgs(args);if(o.help){console.log(USAGE);return;}
  const plan=await buildImportPlan(o);
  const receipt={mode:o.execute?'execute':'dry_run',planSha256:plan.planSha256,corpusSha256:plan.corpusSha256,documents:plan.summary.documents,pages:plan.summary.pages,uniqueBytes:plan.summary.uniqueBytes,networkRequests:0};
  if(!o.execute){console.log(JSON.stringify(receipt));return receipt;}
  if(o.planSha256!==plan.planSha256)throw new Error('Plan changed; perform a new dry-run before execution');
  await assertPrivateStorage(o);
  const store=createStore({dbPath:o.dbPath,blobDir:o.blobDir});
  try {receipt.result=store.importCorpus({tenantId:o.tenantId,subject:o.subject,product:'besoinavocat',active:true},o.caseId,plan,{createCase:o.createCase?{title:o.title,reference:plan.summary.caseFilter}:null});}
  finally {store.close();}
  console.log(JSON.stringify(receipt));return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('Import refusé : '+error.message);process.exitCode=1;});
