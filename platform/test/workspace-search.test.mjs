// Isolated DOM-controller checks. Synthetic examples only; no browser or real account.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const names = ['state','start','render','runSearch','submitSearch','searchResults','openSearch','navigate','loadCase','refreshDetail','clearSession','openSearchSource','jumpPage','beginDictation','cancelDictation'];
function harness(demo=false) {
  const nodes=new Map(), events={}, requests=[], downloads=[];
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{id,innerHTML:'',textContent:'',hidden:false,disabled:false,dataset:{},open:false,isConnected:true,
      classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},before(){},remove(){},click(){downloads.push(this.download);},
      close(){this.open=false;},showModal(){this.open=true;},querySelector(){return node('actions');}});
    return nodes.get(id);
  };
  const h={nodes,node,events,requests,downloads,handler:null};
  class Form { constructor(id,data={}){this.id=id;this.data=data;this.dataset={};} }
  h.Form=Form;
  class TestURL extends URL {static createObjectURL(){return 'blob:synthetic';} static revokeObjectURL(){}}
  h.window={location:{search:demo?'?demo=1':''},setTimeout:()=>1,clearTimeout(){}};
  const context=vm.createContext({URL:TestURL,URLSearchParams,Date,Intl,console,AbortSignal,window:h.window,
    document:{getElementById:node,querySelector:node,querySelectorAll:()=>[],addEventListener:(type,fn)=>events[type]=fn,createElement:tag=>node(tag),body:{appendChild(){}}},
    HTMLFormElement:Form,FormData:class{constructor(form){this.data=form.data;}get(key){return this.data[key]??null;}},
    fetch:async(path,options)=>{requests.push({path,options});if(!h.handler)throw Error('Unexpected HTTP');return h.handler(path,options);},
  });
  assert.equal(source.split('  void start();').length,2);
  vm.runInContext(source.replace('  void start();',`  globalThis.UI={${names.join(',')}};`),context);
  h.ui=context.UI;h.main=()=>node('main-content').innerHTML;
  return h;
}
const response=data=>({status:200,ok:true,json:async()=>data,blob:async()=>new Blob(['synthetic'])});
const doc=(id='doc-a')=>({id,name:`Source ${id}.txt`,mimeType:'application/pdf',sourceType:'ocr',reviewStatus:'a_verifier',sha256:'a'.repeat(64),pageCount:3,sourceReference:'FICTIF',extractedText:'Texte fictif',versionNumber:1});
const hit=(id='doc-a',caseId='case-a')=>({...doc(id),documentId:id,caseId,caseTitle:`Dossier ${caseId}`,excerpt:'Réparation fictive',citation:{ordinal:2,page:7,unitKind:'pdf_page',sourceDocumentId:'FICTIF-01',method:'ocr',ocrToVerify:true,extractionVerified:false}});
const result=(query,rows=[hit()],more=false,offset=0)=>({query,mode:'terms',terms:[query],results:rows,offset,limit:25,hasMore:more,nextOffset:more?offset+25:null,ai:false});
function fixture(h){
  const cases=[{id:'case-a',title:'A',role:'client'},{id:'case-b',title:'B',role:'client'}];
  const detail=id=>({case:cases.find(c=>c.id===id),documents:[doc(id==='case-a'?'doc-a':'doc-b')],messages:[],timeEntries:[]});
  Object.assign(h.ui.state,{mode:'authenticated',demo:false,user:{active:true,subject:'test-only'},cases,selectedId:'case-a',detail:detail('case-a'),view:'search'});
  h.handler=async path=>response(path.startsWith('/api/search?')?result(new URL(path,'https://test.invalid').searchParams.get('q')):detail(path.split('/').pop()));
  return {detail};
}
function fakeDictation(h){
  const recordings=[];h.window.SpeechRecognition=function(){};
  h.window.BesoinAvocatDictation={create(options){const r={options,started:0,aborted:0,stopped:0};recordings.push(r);return{isSupported:true,start(){r.started++;options.onState('listening');return true;},stop(){r.stopped++;options.onState('stopping');return true;},abort(){r.aborted++;}};}};
  return recordings;
}

test('search is accessible from dashboard and navigation, with no generative claim',async()=>{
 const h=harness(true);await h.ui.start();
 assert.match(h.main(),/dashboard-search-form/);h.ui.navigate('search');
 assert.match(h.main(),/Tous mes dossiers autorisés/);assert.match(h.main(),/IA générative reste à connecter/);
 assert.match(h.main(),/Dictée indisponible/);assert.equal(h.requests.length,0);
 const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(index,/data-view="search"/);assert.ok(index.indexOf('./dictation.js')<index.indexOf('./app.js'));
});
test('demo search and source viewing stay local and downloads disabled',async()=>{
 const h=harness(true);await h.ui.start();h.ui.openSearch();await h.ui.runSearch('chronologie');
 assert.equal(h.ui.state.searchResults.length,1);assert.equal(h.ui.state.searchResults[0].citation,null);
 assert.match(h.main(),/données fictives/);assert.match(h.main(),/aucune page citée/);
 await h.ui.openSearchSource(0,false);await h.ui.openSearchSource(0,true);
 assert.equal(h.requests.length,0);assert.equal(h.downloads.length,0);
 h.ui.state.searchScope='case';await h.ui.loadCase('demo-classement','search',false,true);await h.ui.runSearch('chronologie');
 assert.equal(h.ui.state.searchResults.length,0);assert.equal(h.requests.length,0);
});
test('global and case queries use correct scope and literal option, independent of register filters',async()=>{
 const h=harness();fixture(h);h.ui.state.documentCategory='old category';h.ui.state.onlyUnresolved=true;
 await h.ui.runSearch('réparation');let u=new URL(h.requests.at(-1).path,'https://test.invalid');
 assert.equal(u.pathname,'/api/search');assert.equal(u.searchParams.get('caseId'),null);assert.equal(u.searchParams.get('limit'),'25');
 h.ui.state.searchScope='case';h.ui.state.searchMode='literal';await h.ui.runSearch('une expression');u=new URL(h.requests.at(-1).path,'https://test.invalid');
 assert.equal(u.searchParams.get('caseId'),'case-a');assert.equal(u.searchParams.get('mode'),'literal');assert.equal(u.searchParams.has('category'),false);
});
test('pagination keeps loaded references and exposes partial results without invented total',async()=>{
 const h=harness();fixture(h);h.handler=async path=>{const offset=Number(new URL(path,'https://test.invalid').searchParams.get('offset'));return response(result('mot',[hit(offset?'doc-b':'doc-a')],!offset,offset));};
 await h.ui.runSearch('mot');assert.match(h.main(),/liste partielle/);assert.equal(h.ui.state.searchMeta.nextOffset,25);
 await h.ui.runSearch('mot',true);assert.equal(h.ui.state.searchResults.length,2);assert.match(h.requests[1].path,/offset=25/);assert.match(h.main(),/fin des résultats/);
 await h.ui.runSearch('mot',true);assert.equal(h.requests.length,2);
});
test('older query and cleared session responses cannot replace the latest result',async()=>{
 const h=harness();fixture(h);const pending=[];h.handler=()=>new Promise(resolve=>pending.push(resolve));
 const old=h.ui.runSearch('ancien');const latest=h.ui.runSearch('nouveau');pending[1](response(result('nouveau')));await latest;pending[0](response(result('ancien')));await old;
 assert.equal(h.ui.state.searchMeta.query,'nouveau');
 const after=h.ui.runSearch('secret-fictif');h.ui.clearSession();pending[2](response(result('secret-fictif')));await after;
 assert.equal(h.ui.state.searchResults,null);assert.equal(h.ui.state.mode,'signedout');
});
test('navigation and manual query input cancel in-flight results',async()=>{
 const h=harness();fixture(h);let resolve;h.handler=()=>new Promise(r=>resolve=r);
 let pending=h.ui.runSearch('ancien');h.ui.navigate('documents');resolve(response(result('ancien')));await pending;assert.equal(h.ui.state.searchResults,null);assert.equal(h.ui.state.view,'documents');
 h.ui.openSearch();pending=h.ui.runSearch('ancien');h.events.input({target:{id:'document-query',value:'nouvelle saisie'}});resolve(response(result('ancien')));await pending;
 assert.equal(h.ui.state.searchResults,null);assert.equal(h.ui.state.searchQuery,'nouvelle saisie');assert.equal(h.ui.state.searchPending,false);
});
test('source opening loads the result case before its referenced page; download uses same case',async()=>{
 const h=harness();const {detail}=fixture(h);h.ui.state.searchResults=[hit('doc-b','case-b')];h.ui.state.searchMeta=result('mot',h.ui.state.searchResults);
 h.handler=async path=>response(path.endsWith('/pages?offset=1&limit=1')?{document:doc('doc-b'),pages:[{page:7,text:'Page fictive',method:'ocr'}]}:detail('case-b'));
 await h.ui.openSearchSource(0);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.requests[0].path,'/api/cases/case-b');assert.equal(h.requests[1].path,'/api/cases/case-b/documents/doc-b/pages?offset=1&limit=1');
 assert.equal(h.ui.state.searchResults.length,1);assert.equal(h.node('workspace-dialog').dataset.pageDocument,'doc-b');
 await h.ui.openSearchSource(0,true,h.node('download'));
 assert.equal(h.requests.at(-1).path,'/api/cases/case-b/documents/doc-b/download');assert.deepEqual(h.downloads,['Source doc-b.txt']);
});
test('cross-case read completing after navigation cannot reopen a source',async()=>{
 const h=harness();const {detail}=fixture(h);h.ui.state.searchResults=[hit('doc-b','case-b')];let resolve;h.handler=()=>new Promise(r=>resolve=r);
 const pending=h.ui.openSearchSource(0);h.ui.navigate('cases');resolve(response(detail('case-b')));await pending;
 assert.equal(h.ui.state.view,'cases');assert.equal(h.ui.state.selectedId,'case-a');assert.equal(h.node('workspace-dialog').open,false);assert.equal(h.requests.length,1);
});
test('unavailable case and untrusted HTML cannot become navigation or executable markup',async()=>{
 const h=harness();fixture(h);h.ui.state.searchResults=[{...hit('doc-c','unavailable'),name:'<img src=x onerror=alert(1)>',excerpt:'<script>x</script>',caseTitle:'<iframe>'}];
 await h.ui.openSearchSource(0);assert.equal(h.requests.length,0);
 const html=h.ui.searchResults();assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;iframe&gt;/);
});
test('page jump uses ordinal offset and refuses invalid or stale form scope',async()=>{
 const h=harness();fixture(h);h.node('workspace-dialog').open=true;h.node('workspace-dialog').dataset.pageDocument='doc-a';
 h.handler=async()=>response({document:doc(),pages:[{page:99,text:'FICTIF'}]});
 const form=new h.Form('page-jump-form',{ordinal:'3'});form.dataset={document:'doc-a',case:'case-a'};await h.ui.jumpPage(form);
 assert.equal(h.requests[0].path,'/api/cases/case-a/documents/doc-a/pages?offset=2&limit=1');assert.match(h.node('document-page-reader').innerHTML,/page source 99/);
 for(const value of ['0','4','1.5','NaN','-1']){form.data.ordinal=value;await h.ui.jumpPage(form);}form.data.ordinal='2';form.dataset.case='case-b';await h.ui.jumpPage(form);assert.equal(h.requests.length,1);
});
test('dictation starts only explicitly, can keep final text without submitting, and stops on navigation',async()=>{
 const h=harness();fixture(h);const recordings=fakeDictation(h);h.ui.render();assert.equal(recordings.length,0);
 h.ui.state.dictationAutoSearch=false;h.ui.beginDictation();assert.equal(recordings[0].started,1);assert.equal(h.requests.length,0);
 recordings[0].options.onState('idle');recordings[0].options.onResult('texte dicté');assert.equal(h.ui.state.searchQuery,'texte dicté');assert.equal(h.requests.length,0);
 h.ui.beginDictation();h.ui.navigate('documents');assert.equal(recordings[1].aborted,1);assert.equal(recordings[1].options.shouldAccept(),false);
 recordings[1].options.onResult('stale');assert.equal(h.ui.state.searchQuery,'texte dicté');
});
test('dictation auto-search submits only final callback, respects language, and rejects session/scope changes',async()=>{
 const h=harness();fixture(h);const recordings=fakeDictation(h);h.ui.state.dictationLanguage='en-CA';h.ui.beginDictation();
 assert.equal(recordings[0].options.lang,'en-CA');assert.equal(h.requests.length,0);recordings[0].options.onState('idle');recordings[0].options.onResult('facture');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(h.requests.length,1);assert.match(h.requests[0].path,/q=facture/);
 h.ui.beginDictation();h.events.change({target:{id:'search-scope',value:'case'}});assert.equal(recordings[1].options.shouldAccept(),false);assert.equal(recordings[1].aborted,1);
 h.ui.beginDictation();h.ui.clearSession();assert.equal(recordings[2].options.shouldAccept(),false);recordings[2].options.onResult('secret-fictif');assert.equal(h.requests.length,1);
});
test('dictation unsupported and permission errors leave keyboard fallback without automatic retry',()=>{
 const h=harness();fixture(h);h.ui.beginDictation();assert.match(h.ui.state.dictationMessage,/clavier/);
 const recordings=fakeDictation(h);h.ui.beginDictation();recordings[0].options.onError('Micro refusé. Utilisez le clavier.','not-allowed');
 assert.equal(h.ui.state.dictationStatus,'idle');assert.match(h.main(),/Micro refusé/);assert.equal(recordings.length,1);assert.equal(h.requests.length,0);
});
test('oversized dictated text is rejected without truncation and Escape aborts listening',()=>{
 const h=harness();fixture(h);const recordings=fakeDictation(h);h.ui.state.searchQuery='texte conservé';h.ui.beginDictation();
 recordings[0].options.onState('idle');recordings[0].options.onResult('x'.repeat(201));assert.equal(h.ui.state.searchQuery,'texte conservé');assert.match(h.ui.state.dictationMessage,/200 caractères/);assert.equal(h.requests.length,0);
 h.ui.beginDictation();let prevented=false;h.events.keydown({key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(recordings[1].aborted,1);assert.equal(recordings[1].options.shouldAccept(),false);assert.equal(h.ui.state.dictationStatus,'idle');
});

test('reader distinguishes PDF source pages from logical spreadsheet or email units',async()=>{
 const h=harness();fixture(h);h.node('workspace-dialog').open=true;h.node('workspace-dialog').dataset.pageDocument='doc-a';
 const form=new h.Form('page-jump-form',{ordinal:'2'});form.dataset={document:'doc-a',case:'case-a'};
 for(const mimeType of ['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','message/rfc822',undefined]){
   h.handler=async()=>response({document:{...doc(),mimeType},pages:[{page:7,text:'FICTIF'}]});await h.ui.jumpPage(form);
   const html=h.node('document-page-reader').innerHTML;
   if(mimeType==='application/pdf'){assert.match(html,/page source 7/);assert.doesNotMatch(html,/unité logique 7/);}
   else{assert.match(html,/unité logique 7/);assert.doesNotMatch(html,/page source 7/);}
 }
});
test('editing a pending query restores microphone and submit state without replacing the input',async()=>{
 const h=harness();fixture(h);fakeDictation(h);let resolve;h.handler=()=>new Promise(r=>resolve=r);
 const pending=h.ui.runSearch('ancienne');const button=h.node('#search-form button[type="submit"]'),mic=h.node('dictation-control');
 button.disabled=true;button.textContent='Recherche…';mic.disabled=true;
 const input=h.node('document-query');input.value='nouvelle';input.selectionStart=2;input.selectionEnd=5;let refocus=0;input.focus=()=>refocus++;
 h.events.input({target:input});
 assert.equal(button.disabled,false);assert.equal(button.textContent,'Rechercher');assert.equal(mic.disabled,false);
 assert.equal(h.ui.state.searchPending,false);assert.equal(input.value,'nouvelle');assert.equal(input.selectionStart,2);assert.equal(input.selectionEnd,5);assert.equal(refocus,0);
 resolve(response(result('ancienne')));await pending;assert.equal(h.ui.state.searchResults,null);
 delete h.window.SpeechRecognition;mic.disabled=true;h.events.input({target:input});assert.equal(mic.disabled,true);
});
