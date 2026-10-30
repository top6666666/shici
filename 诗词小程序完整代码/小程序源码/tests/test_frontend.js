const assert=require('assert');
const api=require('../shici/utils/aiAsk');
(async()=>{
 assert.deepStrictEqual(api.normalizeSources([{title:'[1] P001',url:'javascript:alert(1)'},null]),[{title:'[1] P001',url:''}]);
 global.wx={request(o){o.success({statusCode:200,data:{code:0,data:{answer:'张籍 [1]',sources:[{title:'[1] P001 · 秋思',url:'https://www.gushiwen.cn/shiwenv_596a2b090692.aspx'}],conversation_id:'a'}}});return{abort(){}};}};
 const r=await api.ask('秋思');assert.equal(r.sources.length,1);assert.equal(r.conversationId,'a');assert(r.sources[0].url.startsWith('https://'));
 global.wx={request(o){o.fail({errMsg:'request:fail timeout'});return{abort(){}};}};await assert.rejects(api.ask('秋思'),/超时/);
 global.wx={request(o){o.success({statusCode:200,data:null});return{abort(){}};}};await assert.rejects(api.ask('秋思'),/有效回答/);
 console.log('4 frontend checks passed');
})();
