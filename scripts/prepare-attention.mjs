// Build the authored learning experience and stage only its active public media.
import {execFileSync} from 'node:child_process';
import {cp,mkdir,readFile,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'experiences/attention-is-all-you-need');
execFileSync(process.execPath,['tools/build-site.mjs','--production'],{cwd:source,stdio:'inherit'});
const output=path.join(source,'build-production');
const media=path.join(root,'.home-public/notes/attention-is-all-you-need/learn/media');
await rm(media,{recursive:true,force:true});
await mkdir(path.dirname(media),{recursive:true});
await cp(path.join(output,'media'),media,{recursive:true});
const info=JSON.parse(await readFile(path.join(output,'build-info.json'),'utf8'));
console.log('Staged Attention: '+info.ready_media+' videos, '+info.units+' learning units; Astro owns the page route.');
