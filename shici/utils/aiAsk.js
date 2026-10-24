// AI 问诗助手 · 接口层
//
// 现在：mock 假回答，前端先把页面跑通
// 后续：队友微信云函数 aiAsk 写完后，只把 ask() 内部换成：
//
//   return wx.cloud.callFunction({
//     name: "aiAsk",
//     data: { message, poemId }
//   }).then(res => res.result.reply);
//
// 页面代码一行不动。

function ask(message, poemId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // mock：5% 概率失败，方便你测"失败重试"UI
      if (Math.random() < 0.05) {
        reject(new Error("mock network error"));
        return;
      }
      resolve(
        "【AI 助手回答 · 待接真接口】\n\n" +
        "你问的是：" + message + "\n\n" +
        "（这里将接入阿里云百炼智能体的真实回答，当前为前端 mock 数据。）"
      );
    }, 800);
  });
}

module.exports = { ask };
