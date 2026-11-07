import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import path from 'node:path';
import { validateProject } from '../src/model.mjs';
export class ProjectStore {
  constructor(dir){this.dir=dir;this.queue=Promise.resolve();}
  file(id){if(!/^[\w-]{1,80}$/.test(id||''))throw Error('ID dự án không hợp lệ.');return path.join(this.dir,`${id}.json`);}
  async read(id){return validateProject(JSON.parse(await readFile(this.file(id),'utf8')));}
  save(project,expectedRevision,create=false){
    const job=this.queue.then(async()=>{
      validateProject(project);
      let current;try{current=await this.read(project.id);}catch(e){if(e.code!=='ENOENT')throw e;}
      if(current && (create || current.revision!==expectedRevision))throw Error(`Dự án đã thay đổi. Hãy đọc lại bản mới (revision ${current.revision}) trước khi lưu.`);
      if(!current && !create)throw Error('Không tìm thấy dự án.');
      const saved={...project,revision:current?current.revision+1:1,updatedAt:new Date().toISOString()};
      await mkdir(this.dir,{recursive:true});
      const file=this.file(project.id);const temp=`${file}.${process.pid}.tmp`;
      await writeFile(temp,JSON.stringify(saved),{mode:0o600});await rename(temp,file);return saved;
    });this.queue=job.catch(()=>{});return job;
  }
}
