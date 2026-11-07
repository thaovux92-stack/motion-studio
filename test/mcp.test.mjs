import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,mkdir,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {unzipSync} from 'fflate';
import {createServer} from '../mcp/server.mjs';
test('MCP: tạo, sửa, lưu UI, từ chối revision cũ, đọc tài nguyên và nhập media',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'motion-test-'));const server=createServer({dataDir:dir});const client=new Client({name:'qa',version:'1.0.0'});const [a,b]=InMemoryTransport.createLinkedPair();
  try{await server.connect(a);await client.connect(b);const listed=await client.listTools();assert.equal(listed.tools.length,5);const open=listed.tools.find(t=>t.name==='open_video_editor');assert.equal(open._meta.ui.resourceUri,'ui://motion-studio/editor.html');
    let r=await client.callTool({name:'open_video_editor',arguments:{title:'Kiểm thử',duration:3,prompt:'tạo video kiểm thử'}});assert.ok(!r.isError,JSON.stringify(r));let p=r._meta.project;assert.equal(p.revision,1);
    r=await client.callTool({name:'update_video_project',arguments:{projectId:p.id,expectedRevision:1,changes:{title:'Claude đã sửa'}}});assert.ok(!r.isError);p=r._meta.project;assert.equal(p.revision,2);
    r=await client.callTool({name:'update_video_project',arguments:{projectId:p.id,expectedRevision:1,changes:{title:'Ghi đè sai'}}});assert.equal(r.isError,true);
    p.layers[0].text='Chỉnh từ UI';r=await client.callTool({name:'save_video_project',arguments:{project:p,expectedRevision:2}});assert.ok(!r.isError);assert.equal(r.structuredContent.revision,3);
    const img=path.join(dir,'sample.png');await writeFile(img,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jqGQAAAAASUVORK5CYII=','base64'));
    r=await client.callTool({name:'import_video_asset',arguments:{projectId:p.id,expectedRevision:3,filePath:img}});assert.ok(!r.isError,JSON.stringify(r));assert.equal(r._meta.project.media.length,1);assert.ok(!r.structuredContent.project.media[0].src);
    r=await client.callTool({name:'get_video_project',arguments:{projectId:p.id}});assert.ok(r.content[0].text.includes('Chỉnh từ UI'));assert.ok(!r.content[0].text.includes('base64'));
    const resource=await client.readResource({uri:'ui://motion-studio/editor.html'});assert.ok(resource.contents[0].mimeType.includes('mcp-app'));assert.ok(resource.contents[0].text.includes('Timeline'));
    const invalid={...p,layers:[{...p.layers[0],end:1000}]};r=await client.callTool({name:'save_video_project',arguments:{project:invalid,expectedRevision:4}});assert.equal(r.isError,true);
  }finally{await client.close();await server.close();await rm(dir,{recursive:true,force:true});}
});
test('gói MCPB đã bundle khởi chạy stdio từ thư mục khác mà không node_modules',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'motion-bundle-'));let client;
  try{const files=unzipSync(await readFile(new URL('../app/motion-studio.mcpb',import.meta.url)));for(const [name,data] of Object.entries(files)){const target=path.join(dir,name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data);}
    const transport=new StdioClientTransport({command:process.execPath,args:[path.join(dir,'mcp/server.mjs')],env:{...process.env,UPLOAD_DIR:path.join(dir,'data')},cwd:os.tmpdir(),stderr:'pipe'});let stderr='';transport.stderr?.on('data',d=>stderr+=d);
    client=new Client({name:'bundle-qa',version:'1'});await client.connect(transport);const r=await client.callTool({name:'open_video_editor',arguments:{duration:2}});assert.ok(!r.isError,stderr);assert.equal(r._meta.project.duration,2);const ui=await client.readResource({uri:'ui://motion-studio/editor.html'});assert.ok(ui.contents[0].text.length>1000);
  }finally{await client?.close();await rm(dir,{recursive:true,force:true});}
});
