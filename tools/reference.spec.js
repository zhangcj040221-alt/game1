import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('orthographic character reference sheets',async({page})=>{test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1800,height:1200});await page.goto('/reference.html');await page.waitForFunction(()=>window.__reference?.getState().ready,{},{timeout:60000});const state=await page.evaluate(()=>window.__reference.getState());expect(state.viewCount).toBe(12);expect(state.cardYawDegrees).toEqual({min:-20,max:20});expect(state.dimensions.yier['头部宽度']).toBe(state.dimensions.bubu['头部宽度']);expect(state.dimensions.yier['头部厚度']).toBe(state.dimensions.bubu['头部厚度']);
 for(const name of ['yier','bubu']){await page.locator('#sheet-'+name).screenshot({path:`test-results/reference-${name}-R02.png`});for(const index of [1,2,3,4,5,6])await page.locator(`#views-${name} .view:nth-child(${index}) .view-image`).screenshot({path:`test-results/reference-${name}-${index}.png`});}
 await page.locator('#clay-study').screenshot({path:'test-results/clay-study-R02.png'});
 await page.locator('#volume-comparison').screenshot({path:'test-results/volume-comparison-R02.png'});
 await writeFile('test-results/reference-R02.json',JSON.stringify(state,null,2));expect(errors).toEqual([]);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
