const { getSummary } = require("../../utils/passport.js");

Page({
  data: {
    avatar: "",
    name: "我的诗旅",
    editing: false,
    stampedCount: 0,
    unlockedRoutes: 0,
    quizCorrect: 0
  },
  onShow() {
    const u = wx.getStorageSync("profile_user") || {};
    this.setData({ avatar: u.avatar || "", name: u.name || "我的诗旅" });
    this.setData(getSummary());
  },
  onChooseAvatar(e) {
    const temp = e.detail.avatarUrl;
    if (!temp) return;
    const done = (avatar) => {
      this.setData({ avatar });
      const u = wx.getStorageSync("profile_user") || {};
      u.avatar = avatar;
      wx.setStorageSync("profile_user", u);
      wx.showToast({ title: "头像已更新", icon: "none" });
    };
    wx.getFileSystemManager().saveFile({
      tempFilePath: temp,
      success: (r) => done(r.savedFilePath),
      fail: () => done(temp)
    });
  },
  editName() {
    this.setData({ editing: true });
  },
  onNameBlur(e) {
    const name = (e.detail.value || "").trim();
    if (!name) {
      this.setData({ name: this.data.name, editing: false });
      wx.showToast({ title: "昵称不能为空", icon: "none" });
      return;
    }
    this.setData({ name, editing: false });
    const u = wx.getStorageSync("profile_user") || {};
    u.name = name;
    wx.setStorageSync("profile_user", u);
    wx.showToast({ title: "昵称已更新", icon: "none" });
  },
  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); }
});
