import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'.mcp.json');
let config={};try{config=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(!config||typeof config!=='object'||Array.isArray(config))throw Error('.mcp.json phải là một object.');
if(config.mcpServers&&(typeof config.mcpServers!=='object'||Array.isArray(config.mcpServers)))throw Error('mcpServers phải là một object.');
config.mcpServers??={};
config.mcpServers['motion-studio']={type:'stdio',command:process.execPath,args:[path.join(root,'mcp/server.mjs')]};
await writeFile(file,JSON.stringify(config,null,2)+'\n',{mode:0o600});
console.log('Đã cấu hình MCP Motion Studio tại '+file+'; giữ các server khác. Mở Claude Code từ thư mục này, kiểm tra /mcp.');
