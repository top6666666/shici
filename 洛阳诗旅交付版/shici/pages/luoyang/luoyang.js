const {recommend,validRoute,routeUrl}=require('../../utils/travel');
const THEMES=['tang','history','landscape'];
const PACES=['light','full'];
const ORIGINS=['hotel','longmen_station','luoyang_station','old_town'];
const STORE='luoyang_route_saved_v1';
Page({
  data:{themeIndex:0,paceIndex:0,originIndex:0,travelDate:'',
    themes:['唐诗寻踪','古都文化','龙门山水'],paces:['舒缓节奏','充实节奏'],
    origins:['市内住宿地','洛阳龙门站','洛阳站','洛阳老城'],loading:false,slow:false,error:'',route:null,saved:false,hasSaved:false,resultOrigin:'',expanded:{}},
  onLoad(options){
    this._disposed=false;this._sequence=0;
    const o=options||{};const data={};
    [['theme',THEMES,'themeIndex'],['pace',PACES,'paceIndex'],['origin',ORIGINS,'originIndex']].forEach(([key,values,target])=>{if(values.indexOf(o[key])>=0)data[target]=values.indexOf(o[key]);});
    if(typeof o.travel_date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(o.travel_date))data.travelDate=o.travel_date;
    try{data.hasSaved=validRoute(wx.getStorageSync(STORE));}catch(_){data.hasSaved=false;}
    this.setData(data);
    if(o.auto==='1')this.generate();
  },
  onUnload(){this._disposed=true;this._sequence+=1;clearTimeout(this._timer);if(this._request)this._request.abort();},
  changeTheme(e){if(this.data.loading)return;const i=Number(e.currentTarget.dataset.index);if(i>=0 && i<THEMES.length)this.setData({themeIndex:i,route:null,error:''});},
  changePace(e){if(this.data.loading)return;const i=Number(e.currentTarget.dataset.index);if(i>=0 && i<PACES.length)this.setData({paceIndex:i,route:null,error:''});},
  changeOrigin(e){if(!this.data.loading)this.setData({originIndex:Number(e.detail.value),route:null,error:''});},
  changeDate(e){if(!this.data.loading)this.setData({travelDate:e.detail.value,route:null,error:''});},
  clearDate(){if(!this.data.loading)this.setData({travelDate:'',route:null,error:''});},
  preferences(){return {city:'洛阳',days:1,theme:THEMES[this.data.themeIndex],pace:PACES[this.data.paceIndex],origin:ORIGINS[this.data.originIndex],travel_date:this.data.travelDate};},
  generate(){
    if(this.data.loading)return;
    const sequence=++this._sequence;this.setData({loading:true,slow:false,error:'',route:null,saved:false,expanded:{},resultOrigin:''});
    this._timer=setTimeout(()=>{if(!this._disposed && sequence===this._sequence)this.setData({slow:true});},12000);
    const request=recommend(this.preferences());this._request=request;
    request.then(route=>{if(this._disposed || sequence!==this._sequence)return;this.setData({route,resultOrigin:'本次生成'},()=>{if(!this._disposed)wx.pageScrollTo({selector:'#result',duration:300});});})
      .catch(err=>{if(!this._disposed && sequence===this._sequence && !err.cancelled)this.setData({error:err.message});})
      .finally(()=>{if(this._disposed || sequence!==this._sequence)return;clearTimeout(this._timer);this._request=null;this.setData({loading:false,slow:false});});
  },
  togglePoem(e){const id=e.currentTarget.dataset.id;const expanded=Object.assign({},this.data.expanded);expanded[id]=!expanded[id];this.setData({expanded});},
  copyItinerary(){if(this.data.route)wx.setClipboardData({data:this.data.route.copy_text,fail(){wx.showToast({title:'复制失败，请重试',icon:'none'});}});},
  copySource(e){const url=e.currentTarget.dataset.url;if(typeof url==='string' && /^https:\/\//.test(url))wx.setClipboardData({data:url});},
  viewPlace(e){
    const stop=this.data.route && this.data.route.stops.find(s=>s.id===e.currentTarget.dataset.id);if(!stop)return;
    wx.showModal({title:stop.name,content:stop.address+'\n\n复制完整地点名称后，可到地图应用搜索并核实入口。本版未接入实时导航。',confirmText:'复制地点',success(res){if(res.confirm)wx.setClipboardData({data:stop.address});}});
  },
  saveRoute(){
    if(!this.data.route)return;
    try{wx.setStorageSync(STORE,this.data.route);this.setData({saved:true,hasSaved:true});wx.showToast({title:'已保存到本机',icon:'success'});}
    catch(_){wx.showToast({title:'保存失败，请复制行程',icon:'none'});}
  },
  loadSaved(){
    if(this.data.loading)return;
    let route;try{route=wx.getStorageSync(STORE);}catch(_){}
    if(!validRoute(route)){this.setData({hasSaved:false});wx.showToast({title:'暂无有效保存路线',icon:'none'});return;}
    const p=route.preferences;
    this.setData({route,themeIndex:Math.max(0,THEMES.indexOf(p.theme)),paceIndex:Math.max(0,PACES.indexOf(p.pace)),originIndex:Math.max(0,ORIGINS.indexOf(p.origin)),travelDate:p.travel_date||'',saved:true,error:'',expanded:{},resultOrigin:'本机保存 · 出行前请重新生成并复核开放信息'});
    wx.pageScrollTo({selector:'#result',duration:300});
  },
  askMore(){wx.navigateTo({url:'/pages/ai-ask/ai-ask'});},
  onShareAppMessage(){return {title:this.data.route?'洛阳诗旅｜'+this.data.route.name:'跟着诗词游洛阳',path:routeUrl(this.data.route?this.data.route.preferences:this.preferences())};}
});
