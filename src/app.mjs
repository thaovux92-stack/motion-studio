import {App} from '@modelcontextprotocol/ext-apps';
import {createProject,textLayer,validateProject,publicProject,uid,ASPECTS,ANIMATIONS} from './model.mjs';
import {Renderer} from './renderer.mjs';
import {icons} from './icons.mjs';
const $=id=>document.getElementById(id);
const icon=name=>icons[name]||icons['film-strip'];
const touchUI=()=>matchMedia('(any-pointer: coarse)').matches;
const tabletUI=()=>touchUI()&&innerWidth>=701&&innerWidth<=1366;
const overlayInspector=()=>innerWidth<=1000||tabletUI();
function setInspector(open){$('inspector-panel').classList.toggle('mobile-open',open);$('properties-toggle').setAttribute('aria-expanded',String(open));if(open&&tabletUI())setAssets(false);}
function setAssets(open){$('asset-panel').classList.toggle('drawer-open',open);document.querySelectorAll('[data-panel]').forEach(n=>{n.setAttribute('aria-controls','asset-panel');n.setAttribute('aria-expanded',String(open&&n.dataset.panel===panel));});if(open&&tabletUI())setInspector(false);}
function syncViewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--keyboard-inset',touchUI()&&v?Math.max(0,innerHeight-v.height-v.offsetTop)+'px':'0px');fitStage();draw();}

function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
const clone=p=>structuredClone(p);
const fmt=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(1).padStart(4,'0')}`;
const names={none:'Không',fade:'Mờ dần','slide-up':'Trượt lên',pop:'Bật lên',typewriter:'Đánh máy'};
let project=createProject(),selected=project.layers[0].id,time=1.2,playing=false,panel='media',inspectorTab='text',app=null,connected=false,dirty=false,saving=null,seq=0,saveTimer,blockedSave=false,zoom=1,exporting=false,undoStack=[],redoStack=[],toastTimer,lastTimestamp=0,rendering=false;
const renderer=new Renderer($('preview-canvas'));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function status(text,error=false){$('save-status').classList.toggle('error',error);$('save-status').replaceChildren(el('span'),document.createTextNode(text));}
function historyCopy(p){return {...clone({...p,media:[]}),media:p.media.map(m=>({...m}))};}
function snapshot(){undoStack.push(historyCopy(project));if(undoStack.length>25)undoStack.shift();redoStack=[];}
function changed(){$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;seq++;dirty=true;blockedSave=false;status('Đang lưu…');clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist().catch(e=>toast(e.message)),350);}
function mutate(fn,{history=true,render=true}={}){if(exporting)return;const prev=clone(project);if(history)snapshot();try{fn(project);validateProject(project);}catch(e){project=prev;if(history)undoStack.pop();toast(e.message);return;}changed();if(render)renderAll();}
let dbPromise;
function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('motion-studio:projects',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onerror=()=>reject(Error('Không lưu được trên trình duyệt. Hãy tải JSON để giữ dự án.'));req.onsuccess=()=>resolve(req.result);});return dbPromise;}
async function diskRead(){const d=await db();return new Promise((res,rej)=>{const r=d.transaction('state').objectStore('state').get('motion-studio:active');r.onsuccess=()=>res(r.result);r.onerror=rej;});}
async function diskSave(p){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction('state','readwrite');tx.objectStore('state').put(p,'motion-studio:active');tx.oncomplete=res;tx.onerror=()=>rej(Error('Bộ nhớ trình duyệt đã đầy. Hãy tải JSON để giữ dự án.'));});}
async function persist(){
  clearTimeout(saveTimer);if(saving){await saving;if(dirty&&!blockedSave)return persist();return;}
  if(!dirty)return;if(blockedSave)throw Error('Chưa lưu được. Hãy mở lại dự án từ Claude hoặc tải JSON để giữ bản chỉnh.');
  const payload=clone(project),version=seq;
  saving=(async()=>{
    try{
      if(connected){const r=await app.callServerTool({name:'save_video_project',arguments:{project:payload,expectedRevision:payload.revision}});if(r.isError)throw Error(r.content?.[0]?.text||'Lưu thất bại.');if(project.id===payload.id)project.revision=r.structuredContent.revision;
        app.updateModelContext({content:[{type:'text',text:`Motion Studio: ${project.id}; revision ${project.revision}; chọn lớp ${selected||'không'}; playhead ${time.toFixed(2)}s. Hãy get_video_project trước khi chỉnh.`}]}).catch(()=>{});
      }else{await diskSave(payload);}
      if(version===seq)dirty=false;status(dirty?'Đang lưu…':connected?'Đã lưu với Claude':'Đã lưu trên máy');
    }catch(e){blockedSave=true;status('Chưa lưu · tải JSON',true);throw e;}finally{saving=null;}
  })();await saving;if(dirty&&!blockedSave)return persist();
}
async function receive(p){
  try{validateProject(p);}catch(e){toast(e.message);return;}
  if(dirty && project.id===p.id && p.revision>project.revision){await download(new Blob([JSON.stringify(project)],{type:'application/json'}),'motion-studio-ban-chua-luu.json').catch(()=>{});toast('Claude đã cập nhật dự án; bản chỉnh chưa lưu của bạn được xuất ra JSON.');}
  clearTimeout(saveTimer);playing=false;renderer.stop();project=clone(p);selected=p.layers.find(l=>l.type==='text')?.id||p.layers[0]?.id;time=Math.min(1.2,p.duration-.05);dirty=false;blockedSave=false;undoStack=[];redoStack=[];
  await renderer.prepare(project);renderAll();status(connected?'Đã lưu với Claude':'Đã lưu trên máy');
}
function renderAll(){
  if(rendering)return;rendering=true;
  try{
  $('project-title').value=project.title;$('aspect').value=project.aspect;$('duration-time').textContent=fmt(project.duration);$('layer-count').textContent=`${project.layers.length} lớp`;$('asset-count').textContent=`${project.media.length} tệp`;
  $('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;for(const id of ['split','duplicate','delete'])$(id).disabled=!selected;
  renderAssets();renderTimeline();renderInspector();fitStage();draw();hydrate();document.querySelector('.quality-label').textContent=touchUI()?'720p':'1080p';
  }finally{rendering=false;}
}
function fitStage(){const box=$('stage-area').getBoundingClientRect();const [w,h]=ASPECTS[project.aspect];const scale=Math.min((box.width-56)/w,(box.height-40)/h);$('stage-wrap').style.width=`${Math.max(80,w*scale)}px`;$('stage-wrap').style.height=`${Math.max(80,h*scale)}px`;}
function draw(){renderer.draw(project,time,{playing,width:exporting?recordWidth:touchUI()?720:1080});$('current-time').textContent=fmt(time);$('playhead').style.left=`${time/project.duration*100}%`;updateSelection();}
function updateSelection(){const box=renderer.bounds.get(selected);$('selection-box').hidden=!box||playing||exporting;if(box){Object.assign($('selection-box').style,{left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.width*100}%`,height:`${box.height*100}%`});}}
function pause(){playing=false;renderer.stop();$('play-button').innerHTML=icon('play-fill');$('play-button').setAttribute('aria-label','Phát video');draw();}
function play(){if(playing){pause();return;}if(time>=project.duration-.02)time=0;playing=true;lastTimestamp=performance.now();$('play-button').innerHTML=icon('pause-fill');$('play-button').setAttribute('aria-label','Dừng video');requestAnimationFrame(tick);}
function tick(now){if(!playing)return;time=Math.min(project.duration,time+(now-lastTimestamp)/1000);lastTimestamp=now;draw();if(exporting){$('export-progress').value=time/project.duration;$('export-percent').textContent=`${Math.round(time/project.duration*100)}%`;}
  if(time>=project.duration){if(exporting)finishRecording();else pause();return;}requestAnimationFrame(tick);
}
function select(id,{openInspector=false}={}){selected=id;renderTimeline();renderInspector();draw();hydrate();if(openInspector&&overlayInspector())setInspector(true);}
function seek(t){if(exporting)return;pause();time=Math.max(0,Math.min(project.duration,t));draw();}
function panelButton(label,callback,cls='button'){const b=el('button',cls,label);b.onclick=callback;return b;}
function renderAssets(){
  const root=$('asset-content');root.replaceChildren();const headings={media:'Tài nguyên',text:'Thêm văn bản',audio:'Âm thanh',motion:'Chuyển động',templates:'Mẫu video'};$('panel-title').textContent=headings[panel];
  document.querySelectorAll('.rail-item[data-panel]').forEach(n=>n.classList.toggle('active',n.dataset.panel===panel));
  if(panel==='media'||panel==='audio'){
    const upload=el('button','upload-zone');upload.innerHTML=`<i>${icon(panel==='audio'?'music-notes':'upload-simple')}</i><strong>${panel==='audio'?'Thêm âm thanh':'Nhập media'}</strong><small>${panel==='audio'?'MP3, WAV, OGG · tối đa 20 MB':'Kéo thả hoặc chọn tệp · tối đa 20 MB'}</small>`;upload.onclick=()=>$('file-input').click();root.append(upload);
    const title=el('div','asset-section-heading');title.append(el('h3',null,'THƯ VIỆN CỦA BẠN'),el('span',null,`${project.media.filter(m=>panel!=='audio'||m.type==='audio').length} tệp`));root.append(title);
    for(const media of project.media.filter(m=>panel!=='audio'||m.type==='audio')){const b=el('button','asset-item');b.innerHTML=`<i>${icon(media.type==='audio'?'music-note':media.type==='video'?'film-strip':'image')}</i>`;b.append(el('span',null,media.name),el('small',null,'+'));b.onclick=()=>addMediaLayer(media);root.append(b);}
    if(!project.media.length)root.append(el('p','empty-assets','Media bạn nhập sẽ xuất hiện ở đây. Bắt đầu với một mẫu chuyển động hoặc clip của bạn.'));
    if(panel==='media'){
      const sep=el('div','asset-section-heading');sep.style.marginTop='16px';sep.append(el('h3',null,'BẮT ĐẦU VỚI MẪU'),el('span',null,'12 giây'));root.append(sep);
      const sample=el('button','example-card');sample.innerHTML='<div class="example-art"><strong>MAKE IT<br>MOVE.</strong></div><div class="example-info"><span>Chuyển động từ ý tưởng</span><small>9:16</small></div>';sample.onclick=()=>loadTemplate('default');root.append(sample);
    }
    const b=panelButton('Mở dự án JSON',()=>$('project-input').click(),'button small project-import');root.append(b);
  }else if(panel==='text'){
    for(const [label,size,weight] of [['Thêm tiêu đề',100,800],['Thêm tiêu đề phụ',58,600],['Thêm nội dung',36,400]]){const b=el('button','preset-button');b.append(el('strong',null,label),el('small',null,'+'));b.firstChild.style.fontSize=`${size/6+6}px`;b.onclick=()=>addText(label,{size,weight});root.append(b);}root.append(el('p','tip','Chỉnh nội dung trong bảng Thuộc tính. Kéo chữ trên khung hình để đặt vị trí.'));
  }else if(panel==='motion'){
    const grid=el('div','animation-grid');for(const a of ANIMATIONS){const b=el('button','animation-choice');b.append(el('strong',null,'Aa'),el('span',null,names[a]));b.onclick=()=>{if(!selected){toast('Chọn một lớp trước khi thêm hiệu ứng.');return;}mutate(p=>p.layers.find(l=>l.id===selected).animation=a);seek(project.layers.find(l=>l.id===selected).start+.25);};grid.append(b);}root.append(grid,el('p','tip','Hiệu ứng xuất hiện áp dụng riêng cho từng lớp. Nhấn Phát để xem toàn bộ chuyển động.'));
  }else{
    for(const [id,title,desc] of [['default','MAKE IT MOVE.','Story chuyển động · 12 giây'],['minimal','LESS, BUT BETTER.','Chữ tối giản · 8 giây'],['launch','HELLO, SOMETHING NEW.','Ra mắt sản phẩm · 10 giây']]){const b=el('button','preset-button');const info=el('span');info.append(el('strong',null,title),el('p','tip',desc));b.append(info);b.onclick=()=>loadTemplate(id);root.append(b);}
  }
}
function addText(text='Nội dung của bạn',patch={}){mutate(p=>{const l=textLayer(text,{start:Math.min(time,p.duration-.5),end:p.duration,...patch});p.layers.push(l);selected=l.id;});if(overlayInspector())setInspector(true);}
function addMediaLayer(m){mutate(p=>{const l={id:uid(),type:m.type,name:m.name,mediaId:m.id,start:0,end:Math.min(project.duration,m.duration||project.duration),trimStart:0,x:50,y:50,size:100,opacity:1,rotation:0,animation:'none',volume:1};p.layers.unshift(l);selected=l.id;});}
function loadTemplate(type){
  showModal('Dùng mẫu video',body=>{body.append(el('p',null,'Mẫu sẽ thay các lớp hiện tại. Bạn có thể hoàn tác để quay lại. Media đã nhập vẫn được giữ.'));body.append(panelButton('Dùng mẫu',()=>{closeModal();mutate(p=>{let next=createProject();if(type==='minimal'){next=createProject({duration:8});next.background='#eceee7';next.layers=[textLayer('LESS,\nBUT BETTER.',{name:'Tiêu đề tối giản',size:130,color:'#2c3a30',end:8,animation:'slide-up'}),textLayer('ĐƠN GIẢN ĐỂ NỔI BẬT.',{name:'Thông điệp',size:27,y:72,color:'#6b7a6c',end:8,animation:'fade',weight:500})];}if(type==='launch'){next=createProject({duration:10});next.background='#d7d0e9';next.layers=[textLayer('HELLO,\nSOMETHING\nNEW.',{name:'Tiêu đề ra mắt',size:125,color:'#49335e',end:10,animation:'pop'}),textLayer('MỘT ĐIỀU MỚI SẮP BẮT ĐẦU.',{name:'Thông điệp',size:26,y:76,color:'#6a557f',end:10,animation:'typewriter',weight:500})];}p.layers=next.layers;p.background=next.background;p.duration=next.duration;selected=p.layers[0].id;time=1.2;});},'button primary'));});
}
function renderTimeline(){
  const labels=$('track-labels'),lanes=$('track-lanes'),ruler=$('ruler');labels.replaceChildren();lanes.replaceChildren();ruler.replaceChildren();$('timeline-content').style.width=`${100*zoom}%`;
  const step=project.duration>60?10:project.duration>24?5:2;for(let t=0;t<=project.duration;t+=step){const n=el('span','ruler-label',`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);n.style.left=`${t/project.duration*100}%`;ruler.append(n);}
  for(const l of [...project.layers].reverse()){
    const sym=l.type==='text'?'text-t':l.type==='audio'?'music-note':'film-strip';const label=el('div',`track-label${selected===l.id?' selected':''}`);label.innerHTML=icon(sym);label.append(el('span',null,l.name));label.title=l.name;label.onclick=()=>select(l.id,{openInspector:true});labels.append(label);
    const lane=el('div','track-lane');const clip=el('div',`clip ${l.type}${selected===l.id?' selected':''}`);clip.style.left=`${l.start/project.duration*100}%`;clip.style.width=`${(l.end-l.start)/project.duration*100}%`;clip.dataset.id=l.id;clip.innerHTML=`<div class="clip-handle left" data-handle="start"></div>${icon(sym)}<span class="clip-label"></span><div class="clip-handle right" data-handle="end"></div>`;clip.querySelector('.clip-label').textContent=l.type==='text'?l.text.replaceAll('\n',' '):l.name;clip.title=`${l.name} · ${l.start.toFixed(1)}–${l.end.toFixed(1)}s`;clip.addEventListener('pointerdown',e=>dragClip(e,l));clip.ondblclick=()=>select(l.id,{openInspector:true});lane.append(clip);lanes.append(lane);
  }$('timeline-empty').hidden=!!project.layers.length;draw();
}
function dragClip(e,layer){
  if(e.button!==0||e.isPrimary===false||exporting)return;e.preventDefault();pause();selected=layer.id;const target=e.currentTarget;target.setPointerCapture(e.pointerId);const handle=e.target.dataset.handle;const startX=e.clientX,old=clone(layer),area=$('timeline-content').getBoundingClientRect();let moved=false;
  const move=ev=>{if(!moved&&Math.abs(ev.clientX-startX)<(e.pointerType==='touch'?6:2))return;let delta=(ev.clientX-startX)/area.width*project.duration;delta=Math.round(delta*10)/10;if(Math.abs(delta)<.01)return;if(!moved){snapshot();moved=true;}const l=project.layers.find(l=>l.id===layer.id);
    if(handle==='start'){const v=Math.max(0,Math.min(old.end-.1,old.start+delta));l.start=v;if(l.type!=='text'&&l.type!=='image')l.trimStart=Math.max(0,old.trimStart+v-old.start);}else if(handle==='end')l.end=Math.max(old.start+.1,Math.min(project.duration,old.end+delta));else{delta=Math.max(-old.start,Math.min(project.duration-old.end,delta));l.start=old.start+delta;l.end=old.end+delta;}
    target.style.left=`${l.start/project.duration*100}%`;target.style.width=`${(l.end-l.start)/project.duration*100}%`;draw();};
  const end=ev=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',end);target.removeEventListener('pointercancel',end);if(moved)changed();renderTimeline();renderInspector();hydrate();if(!moved&&ev.type!=='pointercancel'&&overlayInspector())setInspector(true);};target.addEventListener('pointermove',move);target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);
}
function fieldLabel(text){return el('div','field-label',text);}
function numeric(value,min,max,step,callback){const n=el('input');n.type='number';n.value=value;n.min=min;n.max=max;n.step=step;n.onchange=()=>{const v=Number(n.value);if(!Number.isFinite(v)||v<min||v>max){toast(`Giá trị phải từ ${min} đến ${max}.`);n.value=value;return;}callback(v);};return n;}
function selectInput(options,value,callback){const n=el('select');for(const [v,label] of options){const o=el('option',null,label);o.value=v;n.append(o);}n.value=value;n.onchange=()=>callback(n.value);return n;}
function range(value,min,max,step,callback,suffix=''){const row=el('div','range-row'),n=el('input'),out=el('output',null,`${Math.round(value)}${suffix}`);n.type='range';Object.assign(n,{value,min,max,step});let started=false;n.onpointerdown=()=>{snapshot();started=true;};n.oninput=()=>{if(!started){snapshot();started=true;}out.textContent=`${Math.round(n.value)}${suffix}`;callback(Number(n.value));changed();draw();};n.onchange=()=>{started=false;renderTimeline();};row.append(n,out);return row;}
function renderInspector(){
  const root=$('inspector-content');root.replaceChildren();const l=project.layers.find(x=>x.id===selected);
  if(l){
    const tabs=el('div','inspector-tabs');for(const [id,name] of [['text',l.type==='text'?'Văn bản':'Media'],['animation','Chuyển động']]){const b=el('button',inspectorTab===id?'active':'',name);b.onclick=()=>{inspectorTab=id;renderInspector();};tabs.append(b);}root.append(tabs);
    const type=el('div','layer-type');type.innerHTML=icon(l.type==='text'?'text-t':'film-strip');type.append(document.createTextNode(l.name));root.append(type);
    const edit=(key,value)=>mutate(p=>{const x=p.layers.find(x=>x.id===selected);x[key]=value;if(key==='text')x.name=value.slice(0,32)||'Văn bản';});
    if(inspectorTab==='text'){
      const section=el('section','inspector-section');
      if(l.type==='text'){
        section.append(fieldLabel('Nội dung'));const ta=el('textarea','text-editor');ta.value=l.text;ta.maxLength=2000;ta.setAttribute('aria-label','Nội dung lớp chữ');ta.onfocus=()=>snapshot();ta.oninput=()=>{l.text=ta.value;l.name=ta.value.slice(0,32)||'Văn bản';changed();draw();renderTimeline();};section.append(ta,fieldLabel('Phông chữ'));
        const font=el('div','field-row');font.append(selectInput([['sans','Be Vietnam Pro']],'sans',v=>edit('font',v)),numeric(l.size,8,400,1,v=>edit('size',v)));font.lastChild.setAttribute('aria-label','Cỡ chữ');section.append(font);
        const styles=el('div','format-buttons');for(const [sym,key,value,active] of [['text-b','weight',l.weight>=700?400:800,l.weight>=700],['text-align-left','align','left',l.align==='left'],['text-align-center','align','center',l.align==='center'],['text-align-right','align','right',l.align==='right']]){const b=el('button',active?'active':'');b.innerHTML=icon(sym);b.title=sym;b.onclick=()=>edit(key,value);styles.append(b);}section.append(styles,fieldLabel('Màu chữ'));
        const colors=el('div','color-swatches');for(const color of ['#ffffff','#26271f','#7c5dd9','#ee8a72','#d9bb66','#507e66']){const b=el('button',`swatch${l.color===color?' selected':''}`);b.style.setProperty('--swatch',color);b.title=color;b.setAttribute('aria-label',`Màu ${color}`);b.onclick=()=>edit('color',color);colors.append(b);}const custom=el('input');custom.type='color';custom.value=l.color;custom.title='Màu tùy chọn';custom.onchange=()=>edit('color',custom.value);colors.append(custom);section.append(colors);
        const bg=el('div','field-row');bg.style.marginTop='14px';bg.append(selectInput([['transparent','Không nền chữ'],['#000000','Nền đen'],['#ffffff','Nền trắng']],l.background,v=>edit('background',v)));section.append(bg);
      }else{
        section.append(fieldLabel('Tên lớp'),el('p','tip',l.name));if(l.type!=='image'){section.append(fieldLabel('Bắt đầu từ media (giây)'));const trim=el('div','field-row');trim.append(numeric(l.trimStart,0,180,.1,v=>edit('trimStart',v)));section.append(trim,fieldLabel('Âm lượng'));section.append(range(l.volume*100,0,100,1,v=>l.volume=v/100,'%'));}if(l.type!=='audio'){section.append(fieldLabel('Tỉ lệ phóng to'));section.append(range(l.size,10,300,1,v=>l.size=v,'%'));}
      }
      section.append(fieldLabel('Độ trong suốt'),range(l.opacity*100,0,100,1,v=>l.opacity=v/100,'%'));root.append(section);
    }
    const anim=el('section','inspector-section');const ah=el('div','section-title','Hiệu ứng xuất hiện');ah.append(el('span',null,'0,55 giây'));anim.append(ah);const ag=el('div','animation-grid');for(const a of ANIMATIONS){const b=el('button',`animation-choice${l.animation===a?' selected':''}`);b.append(el('strong',null,a==='typewriter'?'A|':'Aa'),el('span',null,names[a]));b.onclick=()=>{edit('animation',a);seek(l.start+.25);};ag.append(b);}anim.append(ag);root.append(anim);
    const transform=el('section','inspector-section');transform.append(el('div','section-title','Biến đổi'),fieldLabel('Vị trí (%)'));const pos=el('div','field-row');for(const key of ['x','y']){const label=el('label',null,key.toUpperCase());label.append(numeric(l[key],0,100,1,v=>edit(key,v)));pos.append(label);}transform.append(pos,fieldLabel('Xoay'),range(l.rotation,-180,180,1,v=>l.rotation=v,'°'));root.append(transform);
    const timing=el('section','inspector-section');timing.append(el('div','section-title','Thời gian (giây)'));const row=el('div','field-row');const a=el('label',null,'Vào'),b=el('label',null,'Ra');a.append(numeric(l.start,0,l.end-.1,.1,v=>edit('start',v)));b.append(numeric(l.end,l.start+.1,project.duration,.1,v=>edit('end',v)));row.append(a,b);timing.append(row);root.append(timing);
  }else root.append(el('p','inspector-empty','Chọn lớp trên khung hình hoặc timeline để chỉnh thuộc tính.'));
  const settings=el('section','inspector-section');settings.append(el('div','section-title','Dự án'));const dur=el('label','setting-row','Thời lượng (giây)');const di=numeric(project.duration,.5,180,.5,v=>mutate(p=>{p.duration=v;p.layers=p.layers.filter(l=>l.start<v).map(l=>({...l,end:Math.min(l.end,v)}));time=Math.min(time,v);}));di.className='field-input';dur.append(di);const color=el('label','setting-row','Màu nền khung hình');const ci=el('input');ci.type='color';ci.value=project.background;ci.onchange=()=>mutate(p=>p.background=ci.value);color.append(ci);settings.append(dur,color);root.append(settings);hydrate(root);
}
function showModal(title,build){const root=$('modal-content');root.replaceChildren();const head=el('div','modal-header');head.append(el('h2',null,title));const close=el('button','icon-button');close.innerHTML=icon('x');close.setAttribute('aria-label','Đóng');close.onclick=closeModal;head.append(close);const body=el('div','modal-body');root.append(head,body);build(body);if(!$('modal').open)$('modal').showModal();}
function closeModal(){if(exporting)return;$('modal').close();}
function showConnect(){showModal(connected?'Claude đã kết nối':'Dùng Motion Studio trong Claude',body=>{
  if(connected){body.append(el('p','success-note','Editor đang chạy bên trong Claude. Chỉnh sửa được lưu qua MCP; bạn có thể gõ prompt để tiếp tục.'));return;}
  body.append(el('p',null,'Cài một lần vào Claude Desktop. Không cần API key riêng: Claude gọi các công cụ MCP để mở và chỉnh dự án.'));
  const ol=el('ol');ol.innerHTML='<li>Tải <a href="./motion-studio.mcpb" download>Motion Studio.mcpb</a>, mở bằng Claude Desktop và duyệt cài extension.</li><li>Tải <a href="./video-studio-skill.zip" download>skill Video Studio</a>, thêm vào Skills hoặc Project Instructions để định tuyến “tạo video…” và “sửa video…”.</li><li>Thoát hẳn rồi mở lại Claude Desktop và thử: “tạo video giới thiệu sản phẩm 12 giây”.</li><li>Nếu cài thủ công: tải <a href="./motion-studio-desktop.zip" download>ZIP</a>, giải nén; cài Node.js 20.19+ và thêm cấu hình dưới đây trong Settings → Developer → Edit Config. Thay bằng đường dẫn thật trên máy.</li>';body.append(ol);
  const config={mcpServers:{'motion-studio':{command:'node',args:['/duong-dan-tuyet-doi/motion-studio/mcp/server.mjs']}}};body.append(el('pre',null,JSON.stringify(config,null,2)),el('p','info-note','Cần bản Claude Desktop hỗ trợ MCP Apps để thấy editor trong chat. Gói này không tự cài vào ứng dụng trên máy bạn và chưa kèm bộ skill motion bên ngoài.'));
  const downloadLink=el('a','button primary','Tải extension Claude Desktop');downloadLink.href='./motion-studio.mcpb';downloadLink.download='motion-studio.mcpb';body.append(downloadLink,panelButton('Sao chép cấu hình',()=>copyText(JSON.stringify(config,null,2)),'button quiet'));
});}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Đã sao chép.');}catch{showModal('Sao chép nội dung',b=>b.append(el('pre',null,text)));}}
async function download(blob,name){
  if(connected){const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});const result=await app.downloadFile({contents:[{type:'resource',resource:{uri:`file:///${name}`,mimeType:blob.type||'application/octet-stream',blob:src}}]});if(result.isError)throw Error('Claude chưa tải tệp. Hãy cho phép tải xuống hoặc xuất lại.');}
  else{const href=URL.createObjectURL(blob);const a=el('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);}
}
async function saveVideo(blob,name){
  const file=new File([blob],name,{type:blob.type.split(';')[0]});
  if(!connected&&touchUI()&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:'Video Motion Studio'});return;}catch(e){if(e.name==='AbortError')return;}
  }
  await download(blob,name);
}
async function importFiles(files){
  for(const file of files){try{if(file.size>20*1024*1024)throw Error(`${file.name}: tối đa 20 MB.`);const ext=file.name.split('.').at(-1).toLowerCase();const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'}[ext];if(!mime)throw Error('Định dạng tệp chưa được hỗ trợ.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});const src=`data:${mime};base64,${data.split(',')[1]}`;const media={id:uid(),name:file.name,type:mime.split('/')[0],src};const test={...project,media:[...project.media,media]};validateProject(test);await renderer.prepare(test);const element=renderer.elements.get(media.id);if(media.type!=='image')media.duration=element.duration;mutate(p=>p.media.push(media));addMediaLayer(media);toast(`Đã nhập ${file.name}`);}catch(e){toast(e.message);}}
}
let recorder,recordStream,recordChunks,recordMime,cancelExport=false,priorTime,recordWidth=1080;
const supportedMime=()=>['video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>window.MediaRecorder?.isTypeSupported(m));
function exportDialog(){if(!supportedMime()){toast('Trình duyệt này chưa hỗ trợ xuất video. Hãy dùng Chrome hoặc Claude Desktop bản mới.');return;}pause();showModal('Xuất video',body=>{
  body.append(el('p',null,`${project.duration} giây · ${project.aspect} · Chữ, hiệu ứng và media trong một video.`));const options=el('div','export-options');const quality=el('label',null,'Độ phân giải'),format=el('label',null,'Định dạng');quality.append(selectInput([['720','720p · Nhẹ hơn'],['1080','1080p · Full HD']],touchUI()?'720':'1080',()=>{}));quality.lastChild.id='export-resolution';format.append(el('p',null,supportedMime().includes('mp4')?'MP4 · 30 fps':'WebM · 30 fps'));options.append(quality,format);body.append(options,el('p','info-note','Xuất theo thời gian thực. Giữ cửa sổ này mở cho đến khi hoàn tất. Vùng an toàn và khung chọn sẽ không xuất hiện trong video.'));const b=panelButton('Bắt đầu xuất',()=>startExport(Number($('export-resolution').value)).catch(e=>{abortRecording();toast(e.message);}),'button primary');body.append(b);
});}
async function startExport(width){
  await renderer.prepare(project);await document.fonts.ready;const audio=project.layers.some(l=>l.type==='audio'||l.type==='video')?await renderer.audioTrack():null;
  exporting=true;recordWidth=width;cancelExport=false;priorTime=time;time=0;document.body.classList.add('exporting');renderer.draw(project,0,{width});
  recordStream=$('preview-canvas').captureStream(30);if(audio)recordStream.addTrack(audio.clone());recordMime=supportedMime();recorder=new MediaRecorder(recordStream,{mimeType:recordMime,videoBitsPerSecond:width===1080?8000000:4000000});recordChunks=[];recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data);};
  recorder.onstop=async()=>{recordStream.getTracks().forEach(t=>t.stop());exporting=false;playing=false;renderer.stop();document.body.classList.remove('exporting');time=priorTime;draw();$('play-button').innerHTML=icon('play-fill');if(cancelExport){$('modal').close();toast('Đã hủy xuất.');return;}const blob=new Blob(recordChunks,{type:recordMime});try{const ext=recordMime.includes('mp4')?'mp4':'webm';if(!touchUI()||connected)await download(blob,`motion-studio-${Date.now()}.${ext}`);showModal('Video đã sẵn sàng',body=>{body.append(el('p','success-note',`Đã xuất ${project.duration} giây, ${project.aspect}. Tệp ${ext.toUpperCase()} · ${(blob.size/1024/1024).toFixed(1)} MB.`));body.append(panelButton(touchUI()&&!connected?'Lưu video':'Tải lại video',()=>saveVideo(blob,`motion-studio.${ext}`).catch(e=>toast(e.message)),'button primary'));});}catch(e){toast(e.message);}};
  showModal('Đang xuất video…',body=>{body.append(el('p',null,'Đang kết xuất các lớp và âm thanh. Giữ cửa sổ này hoạt động.'));const bar=el('progress');bar.id='export-progress';bar.max=1;bar.value=0;const meta=el('div','progress-meta');meta.append(el('span',null,`${project.duration} giây · ${width}p`));const percent=el('span',null,'0%');percent.id='export-percent';meta.append(percent);body.append(bar,meta,panelButton('Hủy xuất',abortRecording,'button quiet'));});
  recorder.start(250);playing=true;lastTimestamp=performance.now();requestAnimationFrame(tick);
}
function finishRecording(){playing=false;renderer.stop();if(recorder?.state==='recording')recorder.stop();}
function abortRecording(){cancelExport=true;if(recorder?.state==='recording')finishRecording();else{exporting=false;document.body.classList.remove('exporting');$('modal').close();}}
function history(redo=false){const from=redo?redoStack:undoStack,to=redo?undoStack:redoStack;if(!from.length)return;const rev=project.revision;to.push(historyCopy(project));project=from.pop();project.revision=rev;selected=project.layers.some(l=>l.id===selected)?selected:project.layers[0]?.id;time=Math.min(time,project.duration);changed();renderer.prepare(project).then(renderAll).catch(e=>toast(e.message));}
function split(){const l=project.layers.find(l=>l.id===selected);if(!l||time<=l.start+.1||time>=l.end-.1){toast('Đặt con trỏ vào giữa lớp cần tách.');return;}mutate(p=>{const i=p.layers.findIndex(x=>x.id===selected);const a=p.layers[i],b={...clone(a),id:uid(),start:time,name:`${a.name} · 2`};if(a.type!=='text')b.trimStart+=time-a.start;a.end=time;p.layers.splice(i+1,0,b);selected=b.id;});}
function remove(){if(selected)mutate(p=>{p.layers=p.layers.filter(l=>l.id!==selected);selected=p.layers.at(-1)?.id;});}
function duplicate(){if(!selected)return;mutate(p=>{const i=p.layers.findIndex(l=>l.id===selected),l={...clone(p.layers[i]),id:uid()};l.name=`${l.name.slice(0,180)} · bản sao`;p.layers.splice(i+1,0,l);selected=l.id;});}
$('play-button').onclick=play;$('jump-start').onclick=()=>seek(0);$('jump-end').onclick=()=>seek(Math.max(0,project.duration-.05));$('undo').onclick=()=>history();$('redo').onclick=()=>history(true);$('split').onclick=split;$('delete').onclick=remove;$('duplicate').onclick=duplicate;$('add-text').onclick=()=>addText();$('export-button').onclick=exportDialog;$('connect-button').onclick=showConnect;$('help-button').onclick=()=>showModal('Chỉnh video theo cách của bạn',body=>{
  body.append(el('p',null,'Nhập media, thêm chữ và chọn hiệu ứng trong Thuộc tính. Kéo lớp trên timeline hoặc kéo chữ trên khung hình. Dùng Xuất video để tải clip, hoặc Lưu dự án để giữ bản JSON.'));
  body.append(el('h3',null,'Câu lệnh sửa video trong Claude'));
  const examples=el('ul');for(const text of ['Sửa video đang mở, đổi tiêu đề thành “Ra mắt hôm nay”.','Chỉnh sửa clip này, cho tiêu đề hiện từ giây 2 đến giây 5.','Thêm chữ “Đăng ký ngay” từ giây 8 đến giây 12.','Đổi chữ đang chọn sang màu trắng và tăng cỡ lên 80.','Cho tiêu đề bật lên, dòng phụ mờ dần.','Cắt ngắn lớp clip đang chọn còn 5 giây.','Chuyển video thành khung vuông 1:1.'])examples.append(el('li',null,text));body.append(examples);
  body.append(el('p','info-note','Dùng các câu này trong Claude Desktop sau khi cài MCP và skill Video Studio. Claude giữ dự án đang mở; nếu chưa biết clip nào cần sửa, Claude sẽ hỏi bạn. Bản web chưa kết nối Claude chỉ chỉnh bằng các công cụ trong editor.'));
  body.append(panelButton('Kết nối Claude Desktop',showConnect,'button primary'));
});
$('project-title').onchange=()=>mutate(p=>p.title=$('project-title').value.trim()||'Dự án mới');$('aspect').onchange=()=>mutate(p=>p.aspect=$('aspect').value);$('safe-zone').onclick=()=>{const active=$('safe-zone').getAttribute('aria-pressed')!=='true';$('safe-zone').setAttribute('aria-pressed',String(active));$('safe-overlay').hidden=!active;};
$('fullscreen').onclick=async()=>{try{if(connected)await app.requestDisplayMode({mode:'fullscreen'});else if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Không mở được toàn màn hình trong môi trường này.');}};
document.querySelectorAll('[data-panel]').forEach(n=>n.onclick=()=>{const wasOpen=$('asset-panel').classList.contains('drawer-open')&&panel===n.dataset.panel;panel=n.dataset.panel;renderAssets();hydrate();if(tabletUI())setAssets(!wasOpen);else if(innerWidth<700)$('asset-content').scrollIntoView({behavior:'smooth',block:'nearest'});});
$('properties-toggle').onclick=()=>setInspector(!$('inspector-panel').classList.contains('mobile-open'));
$('inspector-close').onclick=()=>{setInspector(false);$('properties-toggle').focus();};
$('assets-close').onclick=()=>{setAssets(false);document.querySelector('[data-panel="'+panel+'"]').focus();};
$('zoom').oninput=()=>{zoom=Number($('zoom').value);renderTimeline();};$('ruler').onpointerdown=e=>{if(e.button!==0||e.isPrimary===false||exporting)return;e.preventDefault();const target=e.currentTarget,r=target.getBoundingClientRect();target.setPointerCapture(e.pointerId);const move=ev=>seek((ev.clientX-r.left)/r.width*project.duration);const end=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',end);target.removeEventListener('pointercancel',end);};move(e);target.addEventListener('pointermove',move);target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);};
$('save-json').onclick=()=>download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),'motion-studio-project.json').catch(e=>toast(e.message));$('save-status').onclick=()=>{if(blockedSave)$('save-json').click();};
$('file-input').onchange=async e=>{await importFiles(e.target.files);e.target.value='';};$('project-input').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>40*1024*1024)throw Error('Tệp dự án quá lớn.');const p=validateProject(JSON.parse(await f.text()));if(connected){await persist();const old=clone(project);p.id=old.id;p.revision=old.revision;await renderer.prepare(p);snapshot();project=p;selected=p.layers[0]?.id;time=0;changed();renderAll();}else{p.id=uid();p.revision=0;await receive(p);changed();}toast('Đã mở dự án JSON.');}catch(e){toast(e.message);}e.target.value='';};
for(const target of [$('asset-content'),$('stage-area')]){target.ondragover=e=>{e.preventDefault();target.classList.add('drop-active');};target.ondragleave=()=>target.classList.remove('drop-active');target.ondrop=e=>{e.preventDefault();target.classList.remove('drop-active');importFiles(e.dataTransfer.files);};}
$('prompt-form').onsubmit=async e=>{e.preventDefault();const text=$('prompt-input').value.trim();if(!text)return;if(!connected){showConnect();return;}const b=$('prompt-form').querySelector('button');b.disabled=true;try{await persist();if(dirty)throw Error('Hãy lưu dự án trước khi gửi prompt.');const r=await app.sendMessage({role:'user',content:[{type:'text',text:`Dự án video Motion Studio: ${project.id}, revision ${project.revision}. Lớp đang chọn: ${selected||'không'}. Playhead: ${time.toFixed(2)}s. ${text}. Hãy đọc get_video_project rồi chỉnh cùng dự án bằng update_video_project.`}]});if(r.isError)throw Error('Claude chưa nhận yêu cầu.');$('prompt-input').value='';toast('Đã gửi yêu cầu cho Claude.');}catch(e){toast(e.message);}finally{b.disabled=false;}};
// MCP host sandboxes can omit allow-forms. Send through the SDK on a plain click.
$('prompt-form').querySelector('button').type='button';$('prompt-form').querySelector('button').onclick=e=>$('prompt-form').onsubmit(e);
$('prompt-input').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('prompt-form').querySelector('button').click();};
$('stage-wrap').onpointerdown=e=>{
  if(exporting||e.button!==0||e.isPrimary===false)return;e.preventDefault();const rect=$('stage-wrap').getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width,py=(e.clientY-rect.top)/rect.height;const found=[...project.layers].reverse().find(l=>{const b=renderer.bounds.get(l.id);return b&&px>=b.x&&px<=b.x+b.width&&py>=b.y&&py<=b.y+b.height;});if(!found){select(null);return;}pause();select(found.id);const startX=e.clientX,startY=e.clientY,oldX=found.x,oldY=found.y;let moved=false;const target=e.currentTarget;target.setPointerCapture(e.pointerId);
  const move=ev=>{if(!moved&&Math.hypot(ev.clientX-startX,ev.clientY-startY)<(e.pointerType==='touch'?6:2))return;if(!moved){snapshot();moved=true;}found.x=Math.round(Math.min(100,Math.max(0,oldX+(ev.clientX-startX)/rect.width*100))*10)/10;found.y=Math.round(Math.min(100,Math.max(0,oldY+(ev.clientY-startY)/rect.height*100))*10)/10;draw();};
  const end=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',end);target.removeEventListener('pointercancel',end);if(moved){changed();renderInspector();}else if(overlayInspector()){renderInspector();setInspector(true);}};target.addEventListener('pointermove',move);target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);
};
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||$('modal').open)return;if(e.code==='Space'){e.preventDefault();play();}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey);}if(e.key==='Escape'){setInspector(false);setAssets(false);}});
$('modal').addEventListener('cancel',e=>{if(exporting)e.preventDefault();});window.addEventListener('beforeunload',e=>{renderer.stop();if(dirty){e.preventDefault();e.returnValue='';}});new ResizeObserver(()=>{fitStage();draw();}).observe($('stage-area'));
window.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('scroll',syncViewport);
async function boot(){await Promise.all([400,500,600,700,800,900].map(weight=>document.fonts.load(`${weight} 16px "Be Vietnam Pro"`,'Aa ĂÂĐÊÔƠƯ ấ Ł')));hydrate();renderAll();if(tabletUI()){setAssets(false);$('stage-area').querySelector('.stage-note').textContent='Chạm lớp để chỉnh · Kéo chữ để di chuyển';$('footer-mode').textContent='Chạm để chọn · Kéo để chỉnh thời gian';}
  if(window.parent!==window){document.body.classList.add('embedded');app=new App({name:'Motion Studio',version:'1.1.0'},{},{autoResize:true});app.ontoolresult=async r=>{const p=r._meta?.project||r.structuredContent?.project;if(p&&p.media?.every(m=>m.src!==undefined))try{await receive(p);}catch(e){toast(e.message);}};app.onhostcontextchanged=ctx=>{const insets=ctx.safeAreaInsets;if(insets)for(const side of ['top','right','bottom','left'])document.body.style.setProperty(`--safe-${side}`,`${insets[side]||0}px`);fitStage();};
    try{await app.connect();connected=true;$('claude-status').textContent='Claude đã kết nối';$('footer-mode').textContent='Đang làm việc cùng Claude';$('connect-button').querySelector('span').textContent='Claude đã kết nối';$('composer-help').textContent='Chỉnh bằng chuột. Tiếp tục bằng một câu prompt.';status('Đã kết nối Claude');}catch{toast('Chưa kết nối được MCP host. Bạn vẫn có thể chỉnh và tải dự án JSON.');}
  }else{try{const saved=await diskRead();if(saved)await receive(saved);}catch(e){status('Chưa bật lưu trình duyệt',true);}}
  await document.fonts.ready;fitStage();draw();
}
boot();
