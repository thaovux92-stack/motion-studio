import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject} from '../src/model.mjs';
test('mẫu hợp lệ ở thời lượng ngắn và dài',()=>{for(const duration of [.5,3,12,180])assert.equal(validateProject(createProject({duration})).duration,duration);});
test('chặn media URL, SVG, lớp trùng và thời gian sai',()=>{
  const p=createProject();p.layers[1].id=p.layers[0].id;assert.throws(()=>validateProject(p));
  const q=createProject();q.layers[0].end=99;assert.throws(()=>validateProject(q));
  for(const src of ['https://example.com/a.mp4','data:image/svg+xml;base64,PHN2Zz4=']){const a=createProject();a.media=[{id:'file',type:'image',name:'bad',src}];assert.throws(()=>validateProject(a));}
});
