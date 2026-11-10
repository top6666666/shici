const poses = {
 cai: {x:150,y:0,w:180,h:420,name:'蔡文姬'},
 lantern: {x:540,y:0,w:180,h:420,name:'蔡文姬'},
 bai: {x:1520,y:0,w:210,h:420,name:'白居易'},
 walk: {x:1900,y:0,w:210,h:420,name:'白居易'},
 du: {x:100,y:565,w:180,h:480,name:'杜甫'},
 read: {x:760,y:635,w:280,h:410,name:'杜甫'}
};
Component({
 properties:{pose:{type:String,value:'cai'},height:{type:Number,value:160}},
 data:{frame:'',sheet:'',label:''},
 observers:{'pose,height':function(p,h){this.refresh(p,h);}},
 lifetimes:{attached(){this.refresh(this.data.pose,this.data.height);}},
 methods:{refresh(p,h){
  const v=poses[p]||poses.cai;const k=Math.max(48,Math.min(360,Number(h)||160))/v.h;
  this.setData({label:v.name,frame:'width:'+v.w*k+'rpx;height:'+v.h*k+'rpx;',sheet:'width:'+2048*k+'rpx;height:'+1048*k+'rpx;left:'+(-v.x*k)+'rpx;top:'+(-v.y*k)+'rpx;'});
 }}
});
