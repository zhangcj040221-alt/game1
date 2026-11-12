import { test, expect } from '@playwright/test';
for (const viewport of [{width:1365,height:900},{width:390,height:844}]) {
 test(`card interaction ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?qa');
  await page.waitForFunction(()=>window.__card?.getState().ready);
  expect(await page.evaluate(()=>window.__card.getState().renderer)).toBe('webgl');
  expect(await page.evaluate(()=>window.__card.getState().characters)).toBe(2);
  expect(await page.evaluate(()=>window.__card.getState().art)).toBe('B-approved-layered-01');
  expect((await page.evaluate(()=>window.__card.getState().layers)).sort((a,b)=>a-b)).toEqual([11,15]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#motion').uncheck();
  const assertEyes=async()=>{const samples=await page.evaluate(()=>window.__card.eyeSamples());expect(samples).toHaveLength(4);for(const pixel of samples){expect(pixel[0]).toBeLessThan(125);expect(pixel[1]).toBeLessThan(100);expect(pixel[2]).toBeLessThan(100);}};
  await assertEyes();
  const box=await page.locator('#stage').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+55,y+25,{steps:8});await page.waitForTimeout(200);
  expect(Math.abs((await page.evaluate(()=>window.__card.getState().angle))[1])).toBeGreaterThan(.02);await page.mouse.up();
  for(const direction of [-1,1]){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+direction*90,y,{steps:12});await page.waitForTimeout(450);await assertEyes();await page.screenshot({path:`test-results/eyes-${viewport.width}-${direction<0?'left':'right'}.png`,fullPage:true});await page.mouse.up();await page.waitForTimeout(450);}
  for(const id of ['motion','depth','particles','foil']){await page.locator('#'+id).uncheck();expect((await page.evaluate(()=>window.__card.getState().options))[id]).toBe(false);await page.locator('#'+id).check();}
  await page.locator('#pause').click();const t=await page.evaluate(()=>window.__card.getState().time);await page.waitForTimeout(150);expect(await page.evaluate(()=>window.__card.getState().time)).toBe(t);await page.locator('#pause').click();
  await page.locator('#wish').click();await expect(page.locator('#message')).toHaveClass('show');
  await page.screenshot({path:`test-results/card-${viewport.width}.png`,fullPage:true});expect(errors).toEqual([]);
 });
}
