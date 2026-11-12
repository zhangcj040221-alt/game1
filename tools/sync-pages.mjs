import {cp,rm,readdir,writeFile} from 'node:fs/promises';
for(const folder of ['assets','characters','fonts']){await rm(folder,{recursive:true,force:true});await cp(`dist/${folder}`,folder,{recursive:true});}
await cp('dist/index.html','index.html');await writeFile('.nojekyll','');console.log('Synced built Pages files');
await cp('dist/compare.html','compare.html');
