import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('orthographic character reference sheets',async({page})=>{test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1800,height:1200});await page.goto('/reference.html');await page.waitForFunction(()=>window.__reference?.getState().ready,{},{timeout:60000});const state=await page.evaluate(()=>window.__reference.getState());expect(state.viewCount).toBe(12);expect(state.cardYawDegrees).toEqual({min:-20,max:20});expect(state.dimensions.yier['头部宽度']).toBe(state.dimensions.bubu['头部宽度']);expect(state.dimensions.yier['头部厚度']).toBe(state.dimensions.bubu['头部厚度']);
 for(const name of ['yier','bubu']){await page.locator('#sheet-'+name).screenshot({path:`test-results/reference-${name}-R06.png`});for(const index of [1,2,3,4,5,6])await page.locator(`#views-${name} .view:nth-child(${index}) .view-image`).screenshot({path:`test-results/reference-${name}-${index}.png`});}
 await page.locator('#clay-study').screenshot({path:'test-results/clay-study-R06.png'});
 await page.locator('#volume-comparison').screenshot({path:'test-results/volume-comparison-R06.png'});
 for(const v of ['standing-bubu','riding-bubu-a','riding-bubu-b','standing-yier','riding-yier'])for(const ver of ['R05','R06']){const img=page.locator(`[data-study="${v}"][data-version="${ver}"]`);await expect(img).toBeVisible();await img.screenshot({path:`test-results/study-${v}-${ver}.png`});}
 await page.locator('#head-study').screenshot({path:'test-results/head-study-R06.png'});
 await writeFile('test-results/reference-R06.json',JSON.stringify(state,null,2));expect(errors).toEqual([]);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
