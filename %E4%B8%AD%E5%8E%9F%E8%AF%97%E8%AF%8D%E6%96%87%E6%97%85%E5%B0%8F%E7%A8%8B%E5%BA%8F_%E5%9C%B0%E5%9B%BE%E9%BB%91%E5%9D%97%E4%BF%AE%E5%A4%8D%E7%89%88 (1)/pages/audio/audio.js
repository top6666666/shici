Page({
  data: {
    audios: [
      {id:1,title:"《春夜喜雨》",type:"标准朗诵",poet:"杜甫",src:"/assets/audio/chunye_xiyu.mp3",progress:0,playing:false},
      {id:2,title:"《无题》",type:"标准朗诵",poet:"李商隐",src:"/assets/audio/wuti.mp3",progress:0,playing:false},
      {id:3,title:"《卫风·淇奥》",type:"标准朗诵",poet:"《诗经》",src:"/assets/audio/qi_ao.mp3",progress:0,playing:false},
      {id:4,title:"《郑风·溱洧》",type:"标准朗诵",poet:"《诗经》",src:"/assets/audio/zhengfeng_qinwei.mp3",progress:0,playing:false},
      {id:5,title:"《汴河怀古·其二》",type:"标准朗诵",poet:"皮日休",src:"/assets/audio/bianhe_huaihu.mp3",progress:0,playing:false},
      {id:6,title:"《春夜洛城闻笛》",type:"标准朗诵",poet:"李白",src:"/assets/audio/chunye_luocheng.mp3",progress:0,playing:false}
    ]
  },
  onLoad() {
    const ctx = wx.createInnerAudioContext();
    this.ctx = ctx;
    ctx.onTimeUpdate(() => {
      const cur = this.currentId;
      if (!cur) return;
      const idx = this.findIdx(cur);
      if (idx < 0) return;
      let pct = ctx.duration ? Math.floor(ctx.currentTime / ctx.duration * 100) : 0;
      if (pct > 100) pct = 100;
      this.setData({ ["audios[" + idx + "].progress"]: pct });
    });
    ctx.onEnded(() => this.stopPlay());
    ctx.onError(() => { wx.showToast({ title: "音频加载失败", icon: "none" }); this.stopPlay(); });
  },
  onUnload() {
    if (this.ctx) { this.ctx.destroy(); this.ctx = null; }
  },
  play(e) {
    const id = e.currentTarget.dataset.id;
    const ctx = this.ctx;
    if (this.currentId === id && !ctx.paused) {
      ctx.pause();
      const idx = this.findIdx(id);
      if (idx >= 0) this.setData({ ["audios[" + idx + "].playing"]: false });
      return;
    }
    if (this.currentId && this.currentId !== id) {
      ctx.stop();
      const oldIdx = this.findIdx(this.currentId);
      if (oldIdx >= 0) this.setData({ ["audios[" + oldIdx + "].playing"]: false, ["audios[" + oldIdx + "].progress"]: 0 });
    }
    const idx = this.findIdx(id);
    if (idx < 0) return;
    ctx.src = this.data.audios[idx].src;
    ctx.play();
    this.currentId = id;
    this.setData({ audios: this.data.audios.map(x => ({ ...x, playing: x.id === id })) });
  },
  findIdx(id) {
    return this.data.audios.findIndex(x => x.id === id);
  },
  stopPlay() {
    if (!this.currentId) return;
    const idx = this.findIdx(this.currentId);
    if (idx >= 0) this.setData({ ["audios[" + idx + "].playing"]: false, ["audios[" + idx + "].progress"]: 0 });
    this.currentId = null;
  }
});
