export const ASPECTS = { '9:16': [1080,1920], '16:9': [1920,1080], '1:1': [1080,1080] };
export const ANIMATIONS = ['none','fade','slide-up','pop','typewriter'];
export const uid = () => globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
export function textLayer(text='Chạm để thêm câu chuyện', patch={}) {
  return {id:uid(),type:'text',name:text.slice(0,32),text,start:0,end:6,x:50,y:48,size:74,color:'#ffffff',background:'transparent',font:'sans',weight:700,align:'center',animation:'slide-up',opacity:1,rotation:0,...patch};
}
export function createProject({title='Một ý tưởng. Vô hạn chuyển động.',aspect='9:16',duration=12,prompt=''}={}) {
  const p={version:1,id:uid(),revision:0,title,aspect,duration,background:'#efcab2',media:[],layers:[
    textLayer('MAKE IT\nMOVE.',{name:'Tiêu đề chính',start:0,end:6,x:50,y:43,size:150,color:'#26271f',animation:'pop',weight:800}),
    textLayer('MỘT Ý TƯỞNG.\nVÔ HẠN CHUYỂN ĐỘNG.',{name:'Thông điệp',start:0,end:6,x:50,y:70,size:44,color:'#424137',animation:'slide-up',weight:500}),
    textLayer('Ý tưởng của bạn.\nKhung hình tiếp theo.',{name:'Kết thúc',start:6,end:12,x:50,y:47,size:90,color:'#26271f',animation:'slide-up'}),
    textLayer('BẮT ĐẦU TỪ MỘT CÂU NÓI.',{name:'Lời kết',start:6,end:12,x:50,y:70,size:28,color:'#424137',animation:'fade',weight:500})
  ],prompt,updatedAt:new Date().toISOString()};
  p.layers=p.layers.map((l,i)=>({...l,start:i<2?0:duration/2,end:i<2?duration/2:duration}));return p;
}
export function validateProject(p) {
  if (!p || p.version!==1 || !/^[\w-]{1,80}$/.test(p.id||'') || !(p.aspect in ASPECTS) || !Number.isFinite(p.duration) || p.duration<0.5 || p.duration>180 || !Number.isInteger(p.revision) || p.revision<0) throw Error('Dự án không hợp lệ (thời lượng 0,5–180 giây).');
  if (typeof p.title!=='string' || p.title.length>200 || !/^#[0-9a-f]{6}$/i.test(p.background)) throw Error('Tiêu đề hoặc màu nền không hợp lệ.');
  if (!Array.isArray(p.layers) || p.layers.length>80 || !Array.isArray(p.media) || p.media.length>20) throw Error('Tối đa 80 lớp và 20 tệp media.');
  const ids=new Set();
  for (const m of p.media) {
    if (!m || !/^[\w-]{1,80}$/.test(m.id) || !['image','video','audio'].includes(m.type) || typeof m.name!=='string' || typeof m.src!=='string' || !/^data:(image\/(png|jpeg|webp)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|webm));base64,[a-z\d+/=\r\n]+$/i.test(m.src) || m.src.length>28*1024*1024 || ids.has(m.id)) throw Error('Media không hợp lệ; chỉ nhận ảnh, video, âm thanh nhúng tối đa 20 MB mỗi tệp.');
    ids.add(m.id);
  }
  ids.clear();
  for (const l of p.layers) {
    if (!l || !/^[\w-]{1,80}$/.test(l.id) || ids.has(l.id) || !['text','image','video','audio'].includes(l.type) || typeof l.name!=='string' || l.name.length>200 || !Number.isFinite(l.start) || !Number.isFinite(l.end) || l.start<0 || l.end<=l.start || l.end>p.duration+0.001) throw Error('Lớp hoặc khoảng thời gian không hợp lệ.');
    ids.add(l.id);
    for (const [k,min,max] of [['x',0,100],['y',0,100],['size',8,400],['opacity',0,1],['rotation',-180,180]]) if (!Number.isFinite(l[k]) || l[k]<min || l[k]>max) throw Error(`Thông số ${k} không hợp lệ.`);
    if (!ANIMATIONS.includes(l.animation)) throw Error('Hiệu ứng chưa được hỗ trợ.');
    if (l.type==='text' && (typeof l.text!=='string' || l.text.length>2000 || !/^#[0-9a-f]{6}$/i.test(l.color) || !['transparent', '#000000','#ffffff'].includes(l.background) || !['sans','serif','mono'].includes(l.font) || !['left','center','right'].includes(l.align) || ![400,500,600,700,800,900].includes(l.weight))) throw Error('Nội dung hoặc kiểu chữ không hợp lệ.');
    if (l.type!=='text' && (!p.media.some(m=>m.id===l.mediaId && m.type===l.type) || !Number.isFinite(l.trimStart) || l.trimStart<0 || !Number.isFinite(l.volume) || l.volume<0 || l.volume>1)) throw Error('Lớp media tham chiếu tệp không hợp lệ.');
  }
  if (JSON.stringify(p).length>38*1024*1024) throw Error('Dự án vượt giới hạn 28 MB media nhúng.');
  return p;
}
export function publicProject(p) {
  return {...p,media:p.media.map(({src,...m})=>m)};
}
