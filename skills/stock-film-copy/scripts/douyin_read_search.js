(()=>{ if(window.__cap) return 'already'; window.__cap={log:[]};
const load=()=>{try{return JSON.parse(sessionStorage.getItem('__dy')||'{}')}catch(e){return {}}};
const save=o=>{try{sessionStorage.setItem('__dy',JSON.stringify(o))}catch(e){}};
const take=(u,txt)=>{try{ if(!/\/search\/(item|single)\//.test(u))return; const p=new URL(u,location.href).searchParams; const kw=p.get('keyword'); const j=JSON.parse(txt); const arr=j.data||[]; window.__cap.log.push([kw,p.get('offset'),p.get('sort_type'),p.get('publish_time'),arr.length]); const o=load(); arr.forEach(d=>{const a=d.aweme_info; if(!a||!a.statistics)return; const s=a.statistics; const prev=o[a.aweme_id]; const kws=prev?prev[1]:''; o[a.aweme_id]=[a.aweme_id,kws.split('|').includes(kw)?kws:(kws?kws+'|':'')+kw,a.desc,s.digg_count,s.comment_count,s.collect_count,s.share_count,a.create_time,a.author&&a.author.nickname,a.author&&a.author.follower_count,a.video&&a.video.duration]}); save(o)}catch(e){window.__cap.log.push(String(e))}};
const O=XMLHttpRequest.prototype.open,S=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(m,u){this.__u=u;return O.apply(this,arguments)};
XMLHttpRequest.prototype.send=function(){this.addEventListener('load',()=>{if(this.__u&&/\/search\//.test(this.__u)){try{take(String(this.__u),this.responseText)}catch(e){}}});return S.apply(this,arguments)};
const F=window.fetch;window.fetch=async function(...a){const r=await F.apply(this,a);try{const u=typeof a[0]=='string'?a[0]:a[0].url;if(/\/search\//.test(u)){r.clone().text().then(t=>take(u,t))}}catch(e){}return r};
return 'hooked'})()
