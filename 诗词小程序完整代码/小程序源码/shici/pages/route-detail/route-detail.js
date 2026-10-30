const { studyRoute } = require("../../data/study_route");
const routes={
1:{name:"唐诗之路文化自驾环线",type:"自驾",duration:"3—5天",nodes:[
{name:"杜甫故里",content:"了解杜甫生平与家国情怀"},
{name:"李商隐公园",content:"进入锦瑟与无题的诗意空间"},
{name:"洛阳",content:"感受王风与唐宋诗词文脉"},
{name:"开封",content:"串联古都诗词文化"}]},
2:{name:"溯源生态骑行路线",type:"骑行",duration:"2—3天",nodes:[
{name:"淇河湿地",content:"寻找《卫风》中的水岸意象"},
{name:"新郑溱洧",content:"体验《郑风·溱洧》的文化空间"},
{name:"许昌",content:"完成诗旅任务与文化分享"}]},
3:{name:"郑州古诗词城市微旅行",type:"城市漫步",duration:"2—3小时",nodes:[
{name:"郑州古城街区",content:"扫码触发诗词内容"},
{name:"文化地标",content:"完成AR式解谜任务"},
{name:"分享站",content:"生成个人诗旅足迹"}]}
};
Page({
  data:{route:{}},
  onLoad(e){
    const id=Number(e.id);
    if(id===4) this.setData({route:studyRoute});
    else this.setData({route:routes[id]||routes[1]});
  },
  checkin(){wx.showToast({title:"打卡成功！",icon:"success"})}
})