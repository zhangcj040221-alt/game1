import {test,expect} from '@playwright/test';
test('breeze card mobile views and clearances',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/breeze.html');await page.waitForFunction(()=>window.__breeze);
 await page.evaluate(()=>document.fonts.ready);
 const min=await page.evaluate(()=>Math.min(...Array.from({length:41},(_,i)=>window.__breeze.clearance(i*.2))));
 console.log('Breeze minimum clearance',min);expect(min).toBeGreaterThan(0);
 for(const angle of [-20,0,20]){
  await page.locator('#yaw').evaluate((el,a)=>{el.value=a;el.dispatchEvent(new Event('input'));},angle);await expect(page.locator('#degrees')).toHaveText(angle+'°');
  await page.locator('article').screenshot({path:'test-results/breeze-'+angle+'.png'});
 }
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveText('启动风车');
});
