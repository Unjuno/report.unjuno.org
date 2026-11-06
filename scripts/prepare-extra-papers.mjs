import {execFileSync} from 'node:child_process';
import {cp,mkdir,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const projects=['deep-residual-learning','generative-adversarial-nets'];
const mode=process.argv[2];
if(!['build','stage'].includes(mode))throw new Error('Use build before prepare-home, then stage after prepare-home.');
async function copyAssets(source,target){
 await mkdir(target,{recursive:true});
 for(const entry of await readdir(source,{withFileTypes:true})){
  if(entry.isSymbolicLink())throw new Error('Unexpected symlink in authored public assets');
  const from=path.join(source,entry.name),to=path.join(target,entry.name);
  if(entry.isDirectory())await copyAssets(from,to);
  else if(!entry.name.endsWith('.html'))await cp(from,to);
 }
}
for(const slug of projects){
 const dir=path.join(root,'experiences',slug),pub=path.join(dir,'public');
 if(mode==='build')execFileSync('npm',['run','build'],{cwd:dir,stdio:'inherit'});
 else{
  const target=path.join(root,'.home-public/notes',slug);
  await rm(target,{recursive:true,force:true});
  await copyAssets(pub,target); // Astro owns top-level AND chapter HTML routes.
 }
 console.log(mode+': '+slug);
}
