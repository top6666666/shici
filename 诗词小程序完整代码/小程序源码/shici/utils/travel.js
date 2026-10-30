const {API_BASE}=require('./config');
function validRoute(r) {
  return !!(r && typeof r==='object' && r.city==='洛阳' && typeof r.name==='string' &&
    typeof r.copy_text==='string' && r.preferences && Array.isArray(r.stops) && r.stops.length>0 &&
    r.stops.every(s=>s && typeof s.name==='string' && s.poem && typeof s.poem.text==='string' && Array.isArray(s.sources)) &&
    Array.isArray(r.notices) && Array.isArray(r.sources));
}
function recommend(preferences){
  let task;
  const promise=new Promise((resolve,reject)=>{
    task=wx.request({url:API_BASE+'/api/travel/recommend',method:'POST',timeout:60000,
      header:{'content-type':'application/json'},data:preferences,
      success(res){
        const b=res.data;
        if(res.statusCode<200 || res.statusCode>=300 || !b || b.code!==0){
          reject(new Error(b && typeof b.message==='string'?b.message:'路线服务暂不可用，请重试'));return;
        }
        if(!validRoute(b.data)){reject(new Error('路线数据不完整，请重试'));return;}
        resolve(b.data);
      },
      fail(err){const msg=(err && err.errMsg)||'';const e=new Error(/timeout/i.test(msg)?'服务唤醒或网络较慢，请稍后重试':'网络请求失败，请检查网络后重试');e.cancelled=/abort/i.test(msg);reject(e);}
    });
  });
  promise.abort=()=>{if(task && task.abort)task.abort();};
  return promise;
}
function routeUrl(p){
  const keys=['theme','pace','origin','travel_date'];
  return '/pages/luoyang/luoyang?auto=1&'+keys.filter(k=>p && typeof p[k]==='string').map(k=>k+'='+encodeURIComponent(p[k])).join('&');
}
module.exports={recommend,validRoute,routeUrl};
