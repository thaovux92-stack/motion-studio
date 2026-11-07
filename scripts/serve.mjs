import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../app');
const files=new Map([
  ['index.html','text/html; charset=utf-8'],
  ['motion-studio.mcpb','application/octet-stream'],
  ['motion-studio-desktop.zip','application/zip'],
  ['video-studio-skill.zip','application/zip'],
  ['motion-studio-claude-code.zip','application/zip'],
  ['THIRD_PARTY_NOTICES.txt','text/plain; charset=utf-8'],
]);
export function createWebServer(){
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    try{
      let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname==='/projects/motion-studio'){res.writeHead(302,{Location:'/projects/motion-studio/'});res.end();return;}
      if(pathname.startsWith('/projects/motion-studio/'))pathname=pathname.slice('/projects/motion-studio'.length);
      const name=pathname==='/'?'index.html':pathname.slice(1);
      if(!files.has(name)){res.writeHead(404);res.end('Not found');return;}
      const bytes=await readFile(path.join(root,name));
      res.writeHead(200,{'Content-Type':files.get(name),'Content-Length':bytes.length});
      res.end(req.method==='HEAD'?undefined:bytes);
    }catch(error){res.writeHead(error.code==='ENOENT'?404:400);res.end('Không đọc được tài nguyên. Chạy npm run build trước.');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('PORT phải từ 0 đến 65535.');
  const server=createWebServer();
  server.listen(port,'0.0.0.0',()=>console.log(`Motion Studio: http://localhost:${server.address().port} (web độc lập, không kết nối MCP)`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
