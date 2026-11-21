import {cp,rm,readdir,writeFile} from 'node:fs/promises';
for(const folder of ['assets','characters','fonts']){await rm(folder,{recursive:true,force:true});await cp(`dist/${folder}`,folder,{recursive:true});}
await cp('dist/index.html','index.html');await writeFile('.nojekyll','');console.log('Synced built Pages files');
await cp('dist/compare.html','compare.html');

await cp('dist/reference.html','reference.html');
await cp('dist/breeze.html','breeze.html');
await cp('dist/camera-rig.html','camera-rig.html');
await cp('dist/duet.html','duet.html');
await cp('dist/step.html','step.html');
await cp('dist/lantern.html','lantern.html');
await cp('dist/race.html','race.html');
