const {ask}=require('../../utils/aiAsk.js');
const {routeUrl}=require('../../utils/travel');
const welcome=()=>({role:'ai',text:'你好，可以查询中原诗词资料，也可以问：帮我推荐诗旅路线。回答附来源；路线可打开详情、复制和保存。',sources:[]});
Page({
  data:{messages:[welcome()],input:'',loading:false,slow:false,conversationId:'',quick:['推荐洛阳一日诗旅路线，轻松一点','“洛阳城里见秋风”是谁写的？','《春夜洛城闻笛》与河南有什么联系？','《归嵩山作》中的嵩高指哪里？'],toView:''},
  onLoad(){this._disposed=false;this._sequence=0;this.scrollToBottom();},
  onUnload(){this._disposed=true;this._sequence+=1;clearTimeout(this._scrollTimer);clearTimeout(this._slowTimer);if(this._request)this._request.abort();},
  onInput(e){this.setData({input:e.detail.value});},
  send(){
    if(this.data.loading)return;
    const text=(this.data.input||'').trim();
    if(!text){wx.showToast({title:'先问点什么吧',icon:'none'});return;}
    this.setData({input:''});this.submit(text);
  },
  quickTap(e){if(this.data.loading)return;const text=e.currentTarget.dataset.q;if(typeof text==='string' && text.trim())this.submit(text.trim());},
  submit(text){this.setData({messages:this.data.messages.concat([{role:'user',text}])});this.callAi(text);},
  retry(e){
    if(this.data.loading)return;
    const index=Number(e.currentTarget.dataset.index);const item=this.data.messages[index];
    if(!item || item.role!=='error' || index!==this.data.messages.length-1)return;
    this.setData({messages:this.data.messages.filter((_,i)=>i!==index)});this.callAi(item.failText);
  },
  newConversation(){if(this.data.loading)return;this.setData({messages:[welcome()],conversationId:'',input:''});this.scrollToBottom();},
  openTravel(e){const msg=this.data.messages[Number(e.currentTarget.dataset.index)];if(msg && msg.route)wx.navigateTo({url:routeUrl(msg.route.preferences)});},
  copySource(e){const url=e.currentTarget.dataset.url;if(typeof url==='string' && /^https?:\/\//i.test(url))wx.setClipboardData({data:url});},
  callAi(text){
    if(this.data.loading)return;
    const token=++this._sequence;
    this.setData({loading:true,slow:false});this.scrollToBottom();
    this._slowTimer=setTimeout(()=>{if(!this._disposed && token===this._sequence)this.setData({slow:true});},12000);
    const request=ask(text,this.data.conversationId);this._request=request;
    request.then(res=>{
      if(this._disposed || token!==this._sequence)return;
      this.setData({conversationId:res.conversationId,messages:this.data.messages.concat([{role:'ai',text:res.answer,sources:res.sources,route:res.route}])});
    }).catch(err=>{
      if(this._disposed || token!==this._sequence || err.cancelled)return;
      this.setData({messages:this.data.messages.concat([{role:'error',text:err.message+'\n点击此消息重试',failText:text}])});
    }).finally(()=>{
      if(this._disposed || token!==this._sequence)return;
      clearTimeout(this._slowTimer);this._request=null;this.setData({loading:false,slow:false});this.scrollToBottom();
    });
  },
  scrollToBottom(){clearTimeout(this._scrollTimer);this._scrollTimer=setTimeout(()=>{if(!this._disposed)this.setData({toView:this.data.loading?'thinking':('msg-'+(this.data.messages.length-1))});},60);}
});
