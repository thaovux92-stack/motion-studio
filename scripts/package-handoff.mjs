import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {zipSync,strToU8} from 'fflate';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'app/motion-studio-claude-code.zip');
const allowed=['src','mcp','assets','skill','scripts','test','handoff','.claude/skills','README.md','START-HERE.md','HANDOFF.md','CLAUDE.md','.gitignore','.mcp.json.example','package.json','package-lock.json','build.mjs','manifest.json','project.json','design-qa.md','app/index.html','app/motion-studio.mcpb','app/motion-studio-desktop.zip','app/video-studio-skill.zip','app/THIRD_PARTY_NOTICES.txt'];
const files={};const manifest=[];
async function add(rel){
  const full=path.join(root,rel);
  const {lstat}=await import('node:fs/promises');const stat=await lstat(full);
  if(stat.isSymbolicLink())throw Error('Không đóng gói symlink: '+rel);
  if(stat.isDirectory()){for(const entry of await readdir(full))await add(`${rel}/${entry}`);return;}
  if(!stat.isFile())throw Error('Không đóng gói tệp đặc biệt: '+rel);
  if(/(^|\/)(node_modules|uploads|\.git|\.env(?:\..*)?|\.mcp\.json|settings\.local\.json)(\/|$)|\.(log|pem|key)$/.test(rel))throw Error('Tệp riêng không được đóng gói: '+rel);
  const data=await readFile(full);files[`motion-studio/${rel}`]=data;
  manifest.push({file:rel,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
for(const rel of allowed)await add(rel);
let revision=null,dirty=null;
try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();dirty=!!execFileSync('git',['status','--porcelain','--','.',':!app/motion-studio-claude-code.zip',':!app/motion-studio-claude-code.zip.sha256'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const report={name:'motion-studio-claude-code',version:JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version,createdAt:new Date().toISOString(),sourceRevision:revision,sourceHasLocalChanges:dirty,note:'Checksums describe the exact files in this snapshot. Generated archives are intentionally not recursively included.',files:manifest.sort((a,b)=>a.file.localeCompare(b.file))};
files['motion-studio/PACKAGE-MANIFEST.json']=strToU8(JSON.stringify(report,null,2)+'\n');
const bytes=zipSync(files,{level:9});await writeFile(output,bytes);
const checksum=createHash('sha256').update(bytes).digest('hex');
await writeFile(output+'.sha256',`${checksum}  ${path.basename(output)}\n`);
console.log(JSON.stringify({output,files:manifest.length,bytes:bytes.length,sha256:checksum},null,2));
