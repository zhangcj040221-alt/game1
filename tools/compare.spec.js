import {test,expect} from '@playwright/test';
for(const viewport of [{width:1365,height:1000},{width:390,height:844}])test(`volume and story comparison ${viewport.width}`,async({page})=>{test.setTimeout(90000);
 await page.setViewportSize(viewport);const errors=[];page.on('pageerror',e=>(errors.push(e.message),console.log('APP ERROR',e.message)));await page.goto('/compare.html');await page.waitForFunction(()=>window.__comparison?.getState().ready);
 const state=()=>page.evaluate(()=>window.__comparison.getState());expect((await state()).views).toBe(2);expect((await state()).meshes.every(n=>n>50)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#pause-all').click();
 await page.getByRole('button',{name:'左侧',exact:true}).click();await page.waitForFunction(()=>window.__comparison.getState().yaw[0]<-.25,{},{timeout:15000});await page.locator('#panel-a').screenshot({path:`test-results/compare-A-left-${viewport.width}.png`});
 await page.getByRole('button',{name:'右侧',exact:true}).click();await page.waitForFunction(()=>window.__comparison.getState().yaw[0]>.25,{},{timeout:15000});await page.locator('#panel-a').screenshot({path:`test-results/compare-A-right-${viewport.width}.png`});
 const b=page.locator('#scene-b');await b.scrollIntoViewIfNeeded();await page.waitForTimeout(100);const box=await b.boundingBox();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.85,box.y+box.height*.5,{steps:12});await page.mouse.up();expect((await state()).progress).toBeGreaterThan(.7);
 for(const [name,p] of [['藏好',0],['递出',.5],['收到',1]]){await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(150);expect((await state()).progress).toBe(p);await page.locator('#panel-b').screenshot({path:`test-results/compare-B-${Math.round(p*100)}-${viewport.width}.png`});}
 expect((await state()).gift[1][0]).toBeLessThan(0);
 await page.getByRole('button',{name:'☾ 月光布景',exact:true}).click();expect((await state()).warm).toBe(true);
 await page.locator('#choose-both').click();expect((await state()).choice).toBe('both');await page.reload();await page.waitForFunction(()=>window.__comparison?.getState().ready);expect((await state()).choice).toBe('both');
 await page.locator('#reset-all').click();expect((await state()).progress).toBe(0);expect((await state()).angle).toBe(0);await page.locator('#play-story').click();await page.waitForFunction(()=>window.__comparison.getState().progress>.015,{},{timeout:15000});await page.locator('#play-story').click();
 await page.screenshot({path:`test-results/comparison-${viewport.width}.png`,fullPage:true});expect(errors).toEqual([]);
});
