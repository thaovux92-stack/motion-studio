import {ASPECTS} from './model.mjs';
export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.elements=new Map();this.bounds=new Map();this.audioSources=new Map();}
  async prepare(project){
    const active=new Set(project.media.map(m=>m.id));
    for(const [id,el] of this.elements)if(!active.has(id)){el.pause?.();el.removeAttribute?.('src');el.load?.();this.elements.delete(id);}
    await Promise.all(project.media.map(async m=>{
      if(this.elements.has(m.id))return;
      const el=m.type==='image'?new Image():document.createElement(m.type);
      if(m.type!=='image'){el.preload='auto';el.playsInline=true;el.muted=false;}
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`Không đọc được ${m.name}. Hãy thử MP4 H.264, WebM, PNG hoặc MP3.`)),15000);el.addEventListener(m.type==='image'?'load':'loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});el.addEventListener('error',()=>{clearTimeout(timer);reject(Error(`Trình duyệt không hỗ trợ tệp ${m.name}.`));},{once:true});el.src=m.src;});
      this.elements.set(m.id,el);
    }));
  }
  stop(){for(const el of this.elements.values())el.pause?.();}
  async audioTrack(){
    if(!this.audioContext){this.audioContext=new (window.AudioContext||window.webkitAudioContext)();this.destination=this.audioContext.createMediaStreamDestination();}
    await this.audioContext.resume();
    for(const [id,el] of this.elements)if(el instanceof HTMLMediaElement && !this.audioSources.has(id)){const source=this.audioContext.createMediaElementSource(el);source.connect(this.destination);source.connect(this.audioContext.destination);this.audioSources.set(id,source);}
    return this.destination.stream.getAudioTracks()[0];
  }
  draw(project,time,{playing=false,width=1080}={}){
    const [w,h]=ASPECTS[project.aspect];const c=this.canvas;const ctx=this.ctx;
    if(c.width!==Math.round(width*w/1080)||c.height!==Math.round(width*h/1080)){c.width=Math.round(width*w/1080);c.height=Math.round(width*h/1080);}
    ctx.setTransform(c.width/w,0,0,c.height/h,0,0);ctx.fillStyle=project.background;ctx.fillRect(0,0,w,h);this.bounds.clear();
    const activeMedia=new Set();
    for(const l of project.layers){
      if(time<l.start||time>=l.end)continue;
      const progress=Math.min(1,Math.max(0,(time-l.start)/.55));let alpha=l.opacity;let scale=1;let dy=0;
      if(l.animation==='fade')alpha*=progress;
      if(l.animation==='slide-up'){alpha*=progress;dy=90*(1-progress)**3;}
      if(l.animation==='pop'){alpha*=Math.min(1,progress*3);const t=progress-1;scale=1+2.70158*t*t*t+1.70158*t*t;}
      const x=l.x*w/100,y=l.y*h/100+dy;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(scale,scale);
      if(l.type==='text'){
        const font='"Be Vietnam Pro", sans-serif'; // Legacy font keys render with the shared project font.
        ctx.font=`${l.weight} ${l.size}px ${font}`;ctx.textAlign=l.align;ctx.textBaseline='middle';
        let str=l.text;if(l.animation==='typewriter')str=str.slice(0,Math.ceil(str.length*Math.min(1,(time-l.start)/Math.max(.6,str.length*.035))));
        const lines=[];for(const line of str.split('\n')){let row='';for(const word of line.split(' ')){const next=row?`${row} ${word}`:word;if(ctx.measureText(next).width>w*.88&&row){lines.push(row);row=word;}else row=next;}lines.push(row);}
        const lineHeight=l.size*1.12;const th=lines.length*lineHeight;const tw=Math.max(12,...lines.map(s=>ctx.measureText(s).width));const left=l.align==='left'?0:l.align==='right'?-tw:-tw/2;
        if(l.background!=='transparent'){ctx.fillStyle=l.background;ctx.fillRect(left-15,-th/2-10,tw+30,th+20);}
        ctx.fillStyle=l.color;lines.forEach((line,i)=>ctx.fillText(line,0,(i-(lines.length-1)/2)*lineHeight));
        this.bounds.set(l.id,{x:(x+left-10)/w,y:(y-th/2-8)/h,width:(tw+20)/w,height:(th+16)/h});
      }else{
        const el=this.elements.get(l.mediaId);if(!el){ctx.restore();continue;}activeMedia.add(l.mediaId);
        if(el instanceof HTMLMediaElement){
          const target=Math.min(Math.max(0,el.duration-.03),Math.max(0,time-l.start+l.trimStart));
          if(Number.isFinite(target)&&Math.abs(el.currentTime-target)>(playing?.22:.035))el.currentTime=target;
          el.volume=l.volume;if(playing){el.play().catch(()=>{});}else el.pause();
        }
        if(l.type!=='audio'){
          const ew=el.videoWidth||el.naturalWidth,eh=el.videoHeight||el.naturalHeight;
          if(ew&&eh){const factor=Math.max(w/ew,h/eh)*l.size/100;const dw=ew*factor,dh=eh*factor;ctx.drawImage(el,-dw/2,-dh/2,dw,dh);this.bounds.set(l.id,{x:(x-dw/2)/w,y:(y-dh/2)/h,width:dw/w,height:dh/h});}
        }
      }ctx.restore();
    }
    for(const [id,el] of this.elements)if(!activeMedia.has(id))el.pause?.();
    ctx.setTransform(1,0,0,1,0,0);
  }
}
