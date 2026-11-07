import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
import os from 'node:os';
import path from 'node:path';
const APP=process.env.MOTION_QA_URL||'http://127.0.0.1:3000/';
const out=process.env.MOTION_QA_OUTPUT||path.join(os.tmpdir(),'motion-studio-ipad');await mkdir(out,{recursive:true});
let browser;const errors=[];const checks=[];
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:820,height:1180},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true,userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  if(new URL(APP).hostname==='thaoux-app'){
  const {pool,createDbStore}=require('../../../src/db.js');const {signToken,cookieName}=require('../../../src/access.js');
  try{const store=createDbStore(pool);const [secret,hash]=await Promise.all([store.getSecret(),store.getPasswordHash('_owner')]);assert.ok(secret&&hash);
  await context.addCookies([{name:cookieName('_owner'),value:signToken('_owner',secret,hash,Date.now(),600000),url:'http://thaoux-app:3000'}]);}finally{await pool.end();}
  }
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(APP);await page.waitForSelector('#preview-canvas');await page.evaluate(()=>document.fonts.ready);
  const sizes=[[820,1180],[1180,820],[768,1024],[1024,768],[744,1133],[1024,1366],[1366,1024]];
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Không tràn ngang ${width}`);
    assert.equal(await page.locator('#asset-panel').isVisible(),false);assert.equal(await page.locator('#inspector-panel').isVisible(),false);
    for(const selector of ['#properties-toggle','#export-button','#safe-zone','#play-button','#split','#duplicate','#delete']){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.height>=44&&box.x>=0&&box.x+box.width<=width+.1&&box.y+box.height<=height,`${selector} bị che ${width}x${height}`);}
    const canvas=await page.locator('#preview-canvas').boundingBox();assert.ok(canvas.height>180&&canvas.y>65&&canvas.y+canvas.height<height-240);
    await page.screenshot({path:`${out}/ipad-${width}x${height}.png`});
    await page.locator('#properties-toggle').tap();assert.equal(await page.locator('#inspector-panel').isVisible(),true);await page.getByLabel('Nội dung lớp chữ').fill('CHỈNH VIDEO\nTRÊN IPAD');await page.locator('#inspector-close').tap();
    await page.locator('[data-panel="media"]').tap();assert.equal(await page.locator('#asset-panel').isVisible(),true);assert.equal(await page.locator('#inspector-panel').isVisible(),false);await page.locator('#assets-close').tap();
    checks.push(`${width}x${height}: layout, touch targets, drawers passed`);
  }
  await page.setViewportSize({width:1180,height:820});await page.waitForTimeout(200);
  const cdp=await context.newCDPSession(page);
  async function drag(selector,dx,dy=0){const b=await page.locator(selector).boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8,id:1}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);}
  await page.locator('.clip').last().tap();assert.equal(await page.locator('#inspector-panel').isVisible(),true);await page.locator('#inspector-close').tap();
  const leftBefore=await page.locator('.clip.selected').evaluate(n=>parseFloat(n.style.left));await drag('.clip.selected',50);const leftAfter=await page.locator('.clip.selected').evaluate(n=>parseFloat(n.style.left));assert.ok(leftAfter>leftBefore);assert.equal(await page.locator('#inspector-panel').isVisible(),false);await page.locator('#undo').tap();await page.waitForTimeout(100);assert.equal(await page.locator('.clip.selected').evaluate(n=>parseFloat(n.style.left)),leftBefore);
  const widthBefore=await page.locator('.clip.selected').evaluate(n=>parseFloat(n.style.width));await drag('.clip.selected .clip-handle.right',-40);assert.ok(await page.locator('.clip.selected').evaluate(n=>parseFloat(n.style.width))<widthBefore);await page.locator('#undo').tap();await page.waitForTimeout(100);assert.equal(await page.locator('.clip.selected').evaluate(n=>parseFloat(n.style.width)),widthBefore);
  await drag('#ruler',100);const t=await page.locator('#current-time').textContent();assert.ok(Number(t.slice(3))>6);await page.locator('#jump-start').tap();
  // Set a visible frame, then drag the canvas text with a real touch sequence.
  const rulerBox=await page.locator('#ruler').boundingBox();await page.touchscreen.tap(rulerBox.x+rulerBox.width*.1,rulerBox.y+20);
  const selection=await page.locator('#selection-box').boundingBox();const stage=await page.locator('#stage-wrap').boundingBox();const x=selection.x+selection.width/2,y=selection.y+selection.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+20,y:y+15,id:1}]});await page.waitForTimeout(50);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);const moved=await page.locator('#selection-box').boundingBox();assert.ok(moved.x>selection.x+10&&stage.width>100);
  assert.equal(await page.locator('#inspector-panel').isVisible(),false,'Dragging canvas keeps inspector closed');await page.waitForTimeout(350);await page.locator('#properties-toggle').tap();await page.locator('#inspector-panel').waitFor({state:'visible'});
  await page.screenshot({path:`${out}/ipad-properties.png`});await page.locator('.setting-row input[type=number]').fill('2');await page.locator('.setting-row input[type=number]').dispatchEvent('change');await page.locator('#inspector-close').tap();
  await page.waitForTimeout(600);await page.reload();await page.waitForSelector('#preview-canvas');await page.waitForTimeout(250);await page.locator('#properties-toggle').tap();assert.equal(await page.getByLabel('Nội dung lớp chữ').inputValue(),'CHỈNH VIDEO\nTRÊN IPAD');await page.locator('#inspector-close').tap();
  await page.locator('#export-button').tap();assert.equal(await page.locator('#export-resolution').inputValue(),'720');await page.getByText('Bắt đầu xuất',{exact:true}).tap();await page.getByText('Video đã sẵn sàng',{exact:true}).waitFor();
  // Exercise the download fallback when native sharing is unavailable, as in this headless runtime.
  await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));const pending=page.waitForEvent('download');await page.getByText('Lưu video',{exact:true}).tap();const downloaded=await pending;await downloaded.saveAs(`${out}/ipad-export.mp4`);assert.ok((await readFile(`${out}/ipad-export.mp4`)).length>1000);
  assert.deepEqual(errors,[]);checks.push('Touch input events: select, drag, trim, scrub, canvas move, undo, persistence, 720p export/save passed');
  await writeFile(`${out}/results.json`,JSON.stringify({engine:'Chromium with iPad viewport and touch emulation; not physical Safari',checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}catch(e){for(const c of browser?.contexts()||[])for(const p of c.pages()){await p.screenshot({path:`${out}/failure.png`}).catch(()=>{});}console.error(errors);throw e;}
finally{await browser?.close();}
