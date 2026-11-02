const { poems } = require("../../data/poems");
Page({
  data:{poems, keyword:""},
  onSearch(e){
    const keyword=(e.detail.value||"").trim();
    const list=keyword?poems.filter(p=>(p.title+p.author+p.location+p.type).includes(keyword)):poems;
    this.setData({keyword,poems:list});
  },
  open(e){
    const index=e.currentTarget.dataset.index;
    wx.navigateTo({url:"/pages/poem-detail/poem-detail?index="+index});
  }
})