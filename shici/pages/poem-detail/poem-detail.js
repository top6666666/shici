const { poems } = require("../../data/poems");
Page({
  data:{poem:{}},
  onLoad(e){
    const poem=poems[Number(e.index)]||poems[0];
    this.setData({poem});
  },
  collect(){wx.showToast({title:"已收藏",icon:"success"})}
})