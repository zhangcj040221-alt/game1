// Run from the repository root with: node tools/review/handoff.mjs [output directory]
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] || 'test-results/handoff');
await mkdir(output, { recursive: true });

// Use the card's own scene, motion, lights, lens and renderer. Only the review
// server exposes these controls and steps the existing animation on demand.
const server = await createServer({
  root: 'app', configFile: false, logLevel: 'error',
  server: { host: '127.0.0.1', port: 0, hmr: false },
  plugins: [{
    name: 'inspect-story-frame', enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('/src/compare.js')) return;
      for (const fragment of ['requestAnimationFrame(frame);']) {
        if (!source.includes(fragment)) throw new Error('Card animation changed. Check the review adapter.');
      }
      return source.replace('requestAnimationFrame(frame);', '')
        +
        '\nwindow.inspectCard = {views,state,setProgress,frame,character,THREE};';
    }
  }]
});
let browser;
try {
  await server.listen();
  const launchOptions = { args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] };
  if (process.env.CI) launchOptions.channel = 'chrome';
  browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});

  await page.goto(server.resolvedUrls.local[0]+'compare.html');
  await page.waitForFunction(() => window.__comparison?.getState().ready, null, {timeout:90000});
  const stage = page.locator('#scene-b');
  await stage.scrollIntoViewIfNeeded();
  const report = await page.evaluate(async () => {
    const {views,state,setProgress,frame,character,THREE} = window.inspectCard;
    const v = views.find(view => view.kind === 'b');
    state.paused = true;
    state.playing = false;
    state.time = 0;
    const seated = v.bu;
    const parent = seated.root.parent;
    const standing = character(false, {pose:'standing'});
    const rect = v.host.getBoundingClientRect();
    const width = rect.width, height = rect.height;
    const frames = [30,60,100];
    const angles = [-20,0,20];
    const result = {viewport:[innerWidth,innerHeight],card:[width,height],frames,angles,poses:{}};
    v.gift.geometry.computeBoundingBox();
    const starWidth = v.gift.geometry.boundingBox.getSize(new THREE.Vector3()).x;
    result.starWidth = starWidth;

    function place(progress, yaw) {
      state.storyAngle = yaw;
      v.yaw = THREE.MathUtils.degToRad(yaw);
      views.forEach(view => { view.viewportVisible = false; });
      setProgress(progress);
      frame();
      v.scene.updateMatrixWorld(true);
      v.camera.updateMatrixWorld(true);
    }

    function surface(mesh) {
      const pos = mesh.geometry.getAttribute('position');
      const vertices = new Float64Array(pos.count*3);
      const point = new THREE.Vector3(), bounds = new THREE.Box3();
      for(let i=0;i<pos.count;i++){
        point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
        point.toArray(vertices,3*i);
        bounds.expandByPoint(point);
      }
      return {vertices,centre:bounds.getCenter(new THREE.Vector3())};
    }

    // A positive gap between the projected vertex intervals is a certified
    // lower bound on the 3D surface distance. Zero is inconclusive.
    function gap(a,b) {
      const d = a.centre.clone().sub(b.centre);
      const axes = [[1,0,0],[0,1,0],[0,0,1],[d.x,d.y,d.z],[d.x,d.y,0],[d.x,0,d.z],[0,d.y,d.z]];
      function interval(vertices,x,y,z) {
        let min=Infinity,max=-Infinity;
        for(let i=0;i<vertices.length;i+=3){
          const dot=vertices[i]*x+vertices[i+1]*y+vertices[i+2]*z;
          min=Math.min(min,dot);max=Math.max(max,dot);
        }
        return [min,max];
      }
      let separation=0;
      for(const [x,y,z] of axes){
        const length=Math.hypot(x,y,z);
        if(length<1e-8) continue;
        const [a0,a1]=interval(a.vertices,x,y,z),[b0,b1]=interval(b.vertices,x,y,z);
        separation=Math.max(separation,(a0-b1)/length,(b0-a1)/length);
      }
      return separation/starWidth;
    }

    function sightline(point,objects) {
      const direction=point.clone().sub(v.camera.position).normalize();
      const ray=new THREE.Raycaster(v.camera.position,direction);
      return ray.intersectObjects(objects,true)[0];
    }
    function visibility() {
      const hiddenEyes=[];
      for(const [name,actor] of [['bubu',v.bu],['yier',v.yi]]){
        actor.eyes.forEach((eye,i)=>{
          // The first vertex of the painted disk is its centre.
          const centre=new THREE.Vector3().fromBufferAttribute(eye.geometry.attributes.position,0).applyMatrix4(eye.matrixWorld);
          const hit=sightline(centre,[v.gift]);
          if(hit && hit.distance < v.camera.position.distanceTo(centre)) hiddenEyes.push(name+'-'+i);
        });
      }
      const centre=v.gift.getWorldPosition(new THREE.Vector3());
      const nearest=sightline(centre,[v.gift,v.bu.root,v.yi.root]);
      return {hiddenEyes,starCentreVisible:nearest?.object===v.gift};
    }

    const screenshots={};
    for(const [name,donor] of [['seated',seated],['standing',standing]]){
      parent.remove(v.bu.root);
      v.bu=donor;
      parent.add(donor.root);
      // Preserve the original stage origin, including its anterior offset.
      donor.root.position.copy(seated.root.position);
      const samples=[],observations=[];
      for(let percent=0;percent<=100;percent++){
        place(percent/100,0);
        const star=surface(v.gift);
        const hands=[...v.bu.arms,...v.yi.arms].map(arm=>gap(surface(arm.children[0]),star));
        samples.push({percent,hands});
      }
      for(const percent of frames) for(const yaw of angles){
        place(percent/100,yaw);
        const sight=visibility();
        v.renderer.render(v.scene,v.camera);
        const key=name+'-'+percent+'-'+yaw;
        screenshots[key]=v.renderer.domElement.toDataURL('image/png').split(',')[1];
        observations.push({percent,yaw,...sight});
      }
      result.poses[name]={samples,observations};
    }
    return {result,screenshots};
  });
  for(const [key,bytes] of Object.entries(report.screenshots)){
    await writeFile(resolve(output,key+'.png'),Buffer.from(bytes,'base64'));
  }
  await writeFile(resolve(output,'measurements.json'),JSON.stringify(report.result,null,2));
  console.log('Captured',Object.keys(report.screenshots).length,'mobile card views in',output);
} finally {
  await browser?.close();
  await server.close();
}
