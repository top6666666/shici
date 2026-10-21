Page({
  data:{routes:[
    {id:1,name:"唐诗之路文化自驾环线",desc:"巩义 · 荥阳 · 洛阳 · 开封｜3—5天"},
    {id:2,name:"溯源生态骑行路线",desc:"淇河 · 新郑 · 许昌｜2—3天"}
  ]},
  goMap(){wx.switchTab({url:"/pages/map/map"})},
  goRoutes(){wx.switchTab({url:"/pages/routes/routes"})},
  goAudio(){wx.navigateTo({url:"/pages/audio/audio"})},
  goInteractive(){wx.switchTab({url:"/pages/interactive/interactive"})},
  goStudy(){wx.navigateTo({url:"/pages/study/study"})},
  goPoem(){wx.navigateTo({url:"/pages/poem/poem"})},
  openRoute(e){wx.navigateTo({url:"/pages/route-detail/route-detail?id="+e.currentTarget.dataset.id})}
})