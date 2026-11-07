import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWebServer} from '../scripts/serve.mjs';
test('web độc lập: mở editor, tải gói, chặn đọc source/cấu hình và phương thức ghi',async()=>{
  const server=createWebServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    for(const p of ['/','/projects/motion-studio/']){const response=await fetch(base+p);assert.equal(response.status,200);assert.match(await response.text(),/preview-canvas/);}
    const head=await fetch(base+'/motion-studio.mcpb',{method:'HEAD'});assert.equal(head.status,200);assert.ok(Number(head.headers.get('content-length'))>1000);assert.equal(await head.text(),'');
    for(const p of ['/src/app.mjs','/.env','/.mcp.json','/../package.json','/%2e%2e%2fpackage.json','/projects/motion-studio/../../package.json'])assert.equal((await fetch(base+p)).status,404,p);
    assert.equal((await fetch(base+'/',{method:'POST',body:'x'})).status,405);
    assert.equal((await fetch(base+'/%ZZ')).status,400);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
