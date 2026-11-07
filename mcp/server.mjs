import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppTool,registerAppResource,RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import {z} from 'zod';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createProject,publicProject,validateProject,uid} from '../src/model.mjs';
import {ProjectStore} from './store.mjs';
const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const URI='ui://motion-studio/editor.html';
const object=z.record(z.string(),z.unknown());
const annotations={readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false};
export function createServer({dataDir=path.join(process.env.UPLOAD_DIR||os.homedir(),process.env.UPLOAD_DIR?'motion-studio':'.motion-studio')}={}){
  const store=new ProjectStore(dataDir);
  const server=new McpServer({name:'Motion Studio',version:'1.1.0'},{instructions:"Use Motion Studio for Vietnamese requests to create or edit videos/clips. Creation triggers: tạo video, tạo clip. Editing triggers: sửa video, chỉnh video, chỉnh sửa video, sửa clip, chỉnh sửa clip, biên tập video, edit video; also thêm chữ, đổi tiêu đề, cắt clip, thêm nhạc, đổi hiệu ứng when the context is a video. Understand natural wording, case variants and Vietnamese without accents. For a new video call open_video_editor, then update_video_project to replace the demo with requested content. For editing reuse the explicitly named or current projectId from tool results/editor context. Never call open_video_editor without projectId for a follow-up edit: that creates a new project. Read get_video_project first and use its latest revision in update_video_project; preserve unrelated layers and media. To reopen an existing editor call open_video_editor with that projectId. If the edit target is unknown or ambiguous, ask which project or clip to edit. Do not invent IDs or file paths. Use available animation/motion skills and supported effects none, fade, slide-up, pop, typewriter. All text uses embedded Be Vietnam Pro (font: sans; legacy serif/mono keys display the same font). Never invent an exported video or claim Claude Desktop is configured."});
  const result=p=>({content:[{type:'text',text:JSON.stringify({project:publicProject(p),note:'Editor tương tác đính kèm. Sửa trực tiếp rồi tiếp tục prompt; dùng get_video_project để đọc bản mới nhất.'})}],structuredContent:{project:publicProject(p)},_meta:{project:p}});
  const safe=fn=>async(args)=>{try{return await fn(args);}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}};
  registerAppTool(server,'open_video_editor',{
    title:'Mở Motion Studio',description:'Mở trình biên tập video tương tác ngay trong Claude Desktop. Dùng cho “tạo video”, “tạo clip”, “sửa video”, “chỉnh sửa video”, “sửa clip”, “chỉnh sửa clip”, “biên tập video”. Tạo mới khi yêu cầu tạo; khi sửa hoặc mở lại, bắt buộc dùng projectId đã xác định. Thiếu ID cho yêu cầu sửa thì hỏi video nào, không tạo mới. Sau khi tạo, dùng update_video_project để điền nội dung theo prompt; mẫu ban đầu chỉ là demo.',
    inputSchema:{projectId:z.string().optional(),title:z.string().max(200).optional(),aspect:z.enum(['9:16','16:9','1:1']).optional(),duration:z.number().min(.5).max(180).optional(),prompt:z.string().max(4000).optional()},annotations,_meta:{ui:{resourceUri:URI}}
  },safe(async args=>result(args.projectId?await store.read(args.projectId):await store.save(createProject(args),undefined,true))));
  server.registerTool('get_video_project',{
    title:'Đọc dự án video',description:'Đọc trạng thái mới nhất, bao gồm chỉnh sửa trực tiếp trong UI. Media chỉ có metadata; không có base64.',inputSchema:{projectId:z.string()},annotations:{...annotations,readOnlyHint:true,idempotentHint:true}
  },safe(async({projectId})=>({content:[{type:'text',text:JSON.stringify(publicProject(await store.read(projectId)))}]})));
  registerAppTool(server,'update_video_project',{
    title:'Chỉnh dự án video',description:'Dùng cho “sửa video”, “chỉnh sửa clip”, “đổi tiêu đề”, “thêm chữ”, “cắt clip”, “thêm nhạc”, “đổi hiệu ứng” của dự án đã xác định. Giữ projectId và các lớp không liên quan. Trước tiên get_video_project để lấy revision mới. changes thay các trường được gửi; layers thay toàn bộ danh sách (giữ các lớp muốn giữ). Mỗi lớp có id,type,name,start,end,x,y,size,opacity,rotation,animation. Text thêm text,color,background (transparent/#000000/#ffffff),font(sans = Be Vietnam Pro; serif/mono được nhận cho dự án cũ và cũng dùng Be Vietnam Pro),weight(400..900 theo bước 100),align. Media thêm mediaId,trimStart,volume. Tất cả thời gian tính giây; x/y tính %; size pixel tại 1080p. Không chạy code tùy ý.',
    inputSchema:{projectId:z.string(),expectedRevision:z.number().int().min(1),changes:z.object({title:z.string().max(200).optional(),aspect:z.enum(['9:16','16:9','1:1']).optional(),duration:z.number().min(.5).max(180).optional(),background:z.string().optional(),layers:z.array(object).max(80).optional()})},annotations,_meta:{ui:{resourceUri:URI}}
  },safe(async({projectId,expectedRevision,changes})=>{const current=await store.read(projectId);return result(await store.save(validateProject({...current,...changes}),expectedRevision));}));
  registerAppTool(server,'save_video_project',{
    description:'Lưu trạng thái từ editor. Công cụ nội bộ giao diện.',inputSchema:{project:object,expectedRevision:z.number().int().min(1)},annotations,_meta:{ui:{visibility:['app']}}
  },safe(async({project,expectedRevision})=>{const p=await store.save(validateProject(project),expectedRevision);return {content:[{type:'text',text:`Đã lưu revision ${p.revision}`}],structuredContent:{revision:p.revision,updatedAt:p.updatedAt}};}));
  registerAppTool(server,'import_video_asset',{
    title:'Nhập media vào video',description:'Nhập một tệp ảnh, video hoặc âm thanh từ đường dẫn trên máy chạy Claude Desktop do người dùng cung cấp, tối đa 20 MB. Không dùng URL. Giữ nguyên các lớp hiện tại.',
    inputSchema:{projectId:z.string(),expectedRevision:z.number().int().min(1),filePath:z.string(),start:z.number().min(0).optional(),duration:z.number().min(.1).max(180).optional()},annotations,_meta:{ui:{resourceUri:URI}}
  },safe(async({projectId,expectedRevision,filePath,start=0,duration})=>{
    const types={'.png':['image','image/png'],'.jpg':['image','image/jpeg'],'.jpeg':['image','image/jpeg'],'.webp':['image','image/webp'],'.mp4':['video','video/mp4'],'.webm':['video','video/webm'],'.mov':['video','video/quicktime'],'.mp3':['audio','audio/mpeg'],'.wav':['audio','audio/wav'],'.ogg':['audio','audio/ogg'],'.m4a':['audio','audio/mp4']};
    const type=types[path.extname(filePath).toLowerCase()];if(!type)throw Error('Định dạng tệp không được hỗ trợ.');
    const s=await stat(filePath);if(!s.isFile()||s.size>20*1024*1024)throw Error('Chỉ nhận tệp tối đa 20 MB.');
    const p=await store.read(projectId);const media={id:uid(),name:path.basename(filePath),type:type[0],src:`data:${type[1]};base64,${(await readFile(filePath)).toString('base64')}`};p.media.push(media);
    p.layers.unshift({id:uid(),type:media.type,name:media.name,mediaId:media.id,start,end:Math.min(p.duration,start+(duration||p.duration)),trimStart:0,x:50,y:50,size:100,opacity:1,rotation:0,animation:'none',volume:1});
    return result(await store.save(validateProject(p),expectedRevision));
  }));
  registerAppResource(server,'Motion Studio',URI,{},async()=>({contents:[{uri:URI,mimeType:RESOURCE_MIME_TYPE,text:await readFile(path.join(ROOT,'app/index.html'),'utf8'),_meta:{ui:{prefersBorder:false,csp:{connectDomains:[],resourceDomains:['data:','blob:']}}}}]}));
  return server;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await createServer().connect(new StdioServerTransport());
}
