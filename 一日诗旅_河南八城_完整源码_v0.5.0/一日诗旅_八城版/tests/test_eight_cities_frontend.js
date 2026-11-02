const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const api=require('../shici/utils/travel');
const cities=require('../shici/utils/travelCities');
const routes=require('./eight_city_fixtures.json');
const tick=()=>new Promise(r=>setImmediate(r));
let options,stored,clipboard;
global.wx={request(o){options=o;return {abort(){}};},getStorageSync(){return stored;},setStorageSync(k,v){stored=v;},setClipboardData(o){clipboard=o.data;},showToast(){},pageScrollTo(){},navigateTo(){}};
function createPage(){
 let page; const f=path.join(__dirname,'../shici/pages/luoyang/luoyang.js');
 vm.runInNewContext(fs.readFileSync(f,'utf8'),{require(n){return require(path.resolve(path.dirname(f),n));},Page(p){page=p;},wx:global.wx,setTimeout,clearTimeout});
 page.setData=function(d,cb){Object.assign(this.data,d);if(cb)cb();};
 return page;
}
(async()=>{
 const page=createPage();page.onLoad({});
 for(let i=0;i<cities.length;i++){
  page.changeCity({currentTarget:{dataset:{index:i}}});
  assert.equal(page.data.city,cities[i].city);assert.equal(page.data.route,null);assert(!page.data.saved);
  assert.equal(page.preferences().city,cities[i].city);
  assert.equal(page.preferences().theme,cities[i].themes[0].id);
  assert.equal(page.preferences().origin,'hotel');
  page.generate();assert.equal(options.data.city,cities[i].city);
  page.changeCity({currentTarget:{dataset:{index:(i+1)%8}}});assert.equal(page.data.city,cities[i].city);
  options.success({statusCode:200,data:{code:0,data:routes[i]}});await tick();
  assert.equal(page.data.route.city,cities[i].city);
  page.saveRoute();assert.equal(stored.city,cities[i].city);
  page.copyItinerary();assert(clipboard.includes(cities[i].city));
  const link=page.onShareAppMessage().path;assert(link.includes('city='+encodeURIComponent(cities[i].city)));
  const restored=createPage();restored.onLoad(Object.fromEntries(new URLSearchParams(link.split('?')[1])));
  assert.equal(restored.preferences().city,cities[i].city);
  options.success({statusCode:200,data:{code:0,data:routes[i]}});await tick();assert.equal(restored.data.route.city,cities[i].city);restored.onUnload();
 }
 page.changeCity({currentTarget:{dataset:{index:0}}});page.loadSaved();assert.equal(page.data.city,'荥阳');assert.equal(page.preferences().city,'荥阳');
 const bad=api.recommend({city:'新密'});options.success({statusCode:200,data:{code:0,data:routes[0]}});await assert.rejects(bad,/不完整/);
 const malformed=JSON.parse(JSON.stringify(routes[0]));malformed.preferences.city='新乡';assert(!api.validRoute(malformed));
 const invalid=createPage();const before=options;invalid.onLoad({city:'不存在',auto:'1'});assert(invalid.data.error);assert.strictEqual(options,before);invalid.onUnload();
 const old=createPage();old.onLoad({theme:'landscape',origin:'longmen_station'});assert.equal(old.preferences().city,'洛阳');assert.equal(old.preferences().theme,'landscape');old.onUnload();
 page.onUnload();console.log('8 city generation/share/save cycles + city mismatch, invalid link, legacy link checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
