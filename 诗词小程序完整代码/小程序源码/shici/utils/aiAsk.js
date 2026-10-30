// 模型密钥仅保存在服务端。
const {API_BASE}=require('./config');
const {validRoute}=require('./travel');
const API_URL = API_BASE+'/api/poetry/ask';
function normalizeSources(items) {
  if (!Array.isArray(items)) return [];
  return items.map((x,i) => {
    if (typeof x === 'string') return {title:x,url:''};
    if (!x || typeof x !== 'object') return null;
    const url = x.url || x.link || '';
    return {title:String(x.title || x.name || x.poem_title || ('资料 '+(i+1))),url:typeof url==='string' && /^https?:\/\//i.test(url) ? url : ''};
  }).filter(Boolean);
}
function ask(message, conversationId) {
  let task;
  const promise = new Promise((resolve,reject) => {
    const question = typeof message==='string' ? message.trim() : '';
    if (!question) {reject(new Error('请先输入问题'));return;}
    task = wx.request({url:API_URL,method:'POST',timeout:60000,
      header:{'content-type':'application/json'},data:{question,conversation_id:conversationId || ''},
      success(res) {
        let body=res.data;
        if(typeof body==='string'){try{body=JSON.parse(body);}catch(_){body=null;}}
        if(res.statusCode<200 || res.statusCode>=300){
          const messages={400:'问题未被接受，请检查输入',401:'服务鉴权失败，请联系后端同学',403:'服务拒绝访问，请联系后端同学',422:'接口参数不匹配，请联系后端同学',429:'请求过于频繁，请稍后重试',502:'服务暂时不可用，请稍后重试',503:'服务正在启动或暂时不可用，请稍后重试',504:'服务响应超时，请稍后手动重试'};
          reject(new Error(messages[res.statusCode] || ('服务请求失败（HTTP '+res.statusCode+'）')));return;
        }
        if(!body || body.code!==0 || !body.data || typeof body.data.answer!=='string' || !body.data.answer.trim()){
          reject(new Error('服务未返回有效回答，请稍后重试'));return;
        }
        resolve({route:validRoute(body.data.route)?body.data.route:null,answer:body.data.answer,sources:normalizeSources(body.data.sources),conversationId:typeof body.data.conversation_id==='string'?body.data.conversation_id:(conversationId||'')});
      },
      fail(err){
        const detail=(err && err.errMsg)||'';
        if(/abort/i.test(detail)){const e=new Error('请求已取消');e.cancelled=true;reject(e);return;}
        reject(new Error(/timeout/i.test(detail)?'等待回答超时。服务可能正在唤醒，请稍后重试':'网络请求失败，请检查网络及 request 合法域名配置'));
      }
    });
  });
  promise.abort=()=>{if(task && task.abort)task.abort();};
  return promise;
}
module.exports={ask,normalizeSources};
