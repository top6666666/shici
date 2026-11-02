const app=getApp();
Page({
 data:{points:[],markers:[],longitude:113.5,latitude:34.8,selected:null},
 onLoad(){const p=app.globalData.points;this.setData({points:p,markers:p.map(x=>({id:x.id,latitude:x.latitude,longitude:x.longitude,title:x.name,iconPath:"/assets/marker.png",width:28,height:28}))})},
 selectPoint(e){const id=e.currentTarget.dataset.id;const p=this.data.points.find(x=>x.id==id);this.setData({selected:p,longitude:p.longitude,latitude:p.latitude})},
 markerTap(e){this.selectPoint({currentTarget:{dataset:{id:e.detail.markerId}}})},
 listen(){wx.navigateTo({url:"/pages/audio/audio"})}
})