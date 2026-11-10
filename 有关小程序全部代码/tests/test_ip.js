const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'../shici');
const storage={};let def;
const wx={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>storage[k]=v,showToast(){},navigateTo(){}};
vm.runInNewContext(fs.readFileSync(path.join(root,'packages/quiz/quiz.js'),'utf8'),{Page:d=>def=d,wx,Math});
const page={...def,data:JSON.parse(JSON.stringify(def.data)),setData(v){Object.assign(this.data,v)}};
page.onLoad();for(let i=0;i<12;i++){page.answer({currentTarget:{dataset:{index:page.data.questions[i].ans}}});page.answer({currentTarget:{dataset:{index:0}}});page.next();}
assert.equal(page.data.score,120);assert.equal(page.data.finished,true);assert.equal(storage.quiz_best,120);page.restart();assert.equal(page.data.score,0);assert.equal(page.data.answered,false);
let component;vm.runInNewContext(fs.readFileSync(path.join(root,'components/ip-figure/ip-figure.js'),'utf8'),{Component:d=>component=d});
for(const pose of ['cai','lantern','bai','walk','du','read','unknown']){let data;component.methods.refresh.call({setData:d=>data=d},pose,172);assert(data.frame.includes('height:'));assert(!data.sheet.includes('NaN'));assert(data.label);}
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json')));const pages=app.pages.concat(app.subpackages.flatMap(p=>p.pages.map(n=>p.root+'/'+n)));
assert.equal(pages.length,21);for(const p of pages)for(const ext of ['js','json','wxml','wxss'])assert(fs.existsSync(path.join(root,p+'.'+ext)));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);}
let sizes={main:0};for(const p of app.subpackages)sizes[p.root]=0;
for(const file of files(root)){const rel=path.relative(root,file);const pack=app.subpackages.find(p=>rel.startsWith(p.root+'/'));sizes[pack?pack.root:'main']+=fs.statSync(file).size;}
for(const [p,s]of Object.entries(sizes))assert(s<2*1024*1024,p+' exceeds 2MiB');
for(const file of files(root).filter(f=>f.endsWith('.js')||f.endsWith('.wxml'))){const s=fs.readFileSync(file,'utf8');assert(!s.includes('/pages/audio/audio'));assert(!s.includes('/pages/quiz/quiz'));for(const m of s.matchAll(/(?:src[:=]["'])(\/(?:assets|packages)\/[^"']+\.(?:png|mp3))/g))assert(fs.existsSync(path.join(root,m[1])),m[1]);}
console.log('IP checks passed: quiz scoring/restart, sprite fallback, 21 registered pages, relocated asset/navigation paths and package sizes',sizes);
