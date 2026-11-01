const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const screenshots = process.env.CARD_SCREENSHOT_DIR || path.join(root, 'test-results');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(await fs.readFile(file)); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  let browser;
  try {
    await fs.mkdir(screenshots, { recursive: true });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
      args: ['--no-sandbox', '--disable-webgl'] });
    const page = await browser.newPage({ viewport: { width: 960, height: 1080 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(10000);
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => { if (!req.url().startsWith(origin)) external.push(req.url()); });
    await page.addInitScript(() => {
      window.DeviceOrientationEvent ??= class extends Event {};
      window.DeviceOrientationEvent.requestPermission = async () => window.__sensorPermission || 'granted';
    });
    await page.goto(origin);
    await page.waitForFunction(() => !document.querySelector('#front').disabled);
    assert.equal(await page.locator('#poster').isVisible(), false);
    assert.equal(await page.locator('#card img').count(), 3);
    assert.equal(await page.locator('canvas').count(), 0, '2.5D must run without WebGL');
    await page.screenshot({ path: path.join(screenshots, 'layered-desktop.png') });
    await page.locator('#stage').focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !document.querySelector('#card').style.transform.endsWith('rotateY(0deg)'));
    const offsets = await page.locator('[data-depth]').evaluateAll(nodes => nodes.map(n => ({ depth: Number(n.dataset.depth), x: new DOMMatrix(n.style.transform).m41 })));
    assert(offsets.find(o => o.depth === .9).x > offsets.find(o => o.depth === .12).x, 'character must move farther than frame');
    assert(offsets.find(o => o.depth === -.45).x < 0, 'background must move in opposite direction');
    await page.locator('#front').click();
    await page.waitForFunction(() => document.querySelector('#card').style.transform.endsWith('rotateY(0deg)'));
    const rect = await page.locator('#stage').boundingBox();
    await page.mouse.move(rect.x + rect.width * .5, rect.y + rect.height * .5);
    await page.mouse.down(); await page.mouse.move(rect.x + rect.width * .7, rect.y + rect.height * .58, { steps: 4 });
    await page.waitForFunction(() => !document.querySelector('#card').style.transform.endsWith('rotateY(0deg)'));
    await page.screenshot({ path: path.join(screenshots, 'layered-tilted.png') });
    await page.mouse.up();
    for (let i = 1; i <= 5; i++) {
      await page.locator(`button[data-level="${i}"]`).click();
      assert.equal(await page.locator(`button[data-level="${i}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#stage').getAttribute('data-level'), String(i));
      const atmosphere = await page.locator('.atmosphere').evaluate(n => getComputedStyle(n).opacity);
      assert.equal(atmosphere, i >= 4 ? '1' : '0');
    }
    await page.evaluate(() => { window.__sensorPermission = 'denied'; });
    await page.locator('#tilt').click();
    assert.equal(await page.locator('#tilt').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('#status').innerText(), /未开启/);
    await page.evaluate(() => { window.__sensorPermission = 'granted'; });
    await page.locator('#tilt').click();
    assert.equal(await page.locator('#tilt').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => {
      for (const [beta, gamma] of [[30, 0], [40, 11]]) {
        const e = new Event('deviceorientation'); Object.assign(e, { beta, gamma }); window.dispatchEvent(e);
      }
    });
    await page.waitForFunction(() => !document.querySelector('#card').style.transform.endsWith('rotateY(0deg)'));
    await page.locator('#tilt').click();
    assert.equal(await page.locator('#tilt').getAttribute('aria-pressed'), 'false');
    await page.locator('#upgrade').click();
    assert.match(await page.locator('#status').innerText(), /减少动态/);
    assert.equal(await page.locator('#stage').evaluate(n => n.classList.contains('upgrading')), false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#motion').click();
    await page.locator('#upgrade').click();
    assert.equal(await page.locator('#upgrade').isDisabled(), true);
    await page.waitForFunction(() => !document.querySelector('#upgrade').disabled);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#front').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('#card').style.transform.endsWith('rotateY(0deg)'));
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const mobileCard = await page.locator('#card').boundingBox();
    assert(mobileCard.x >= 0 && mobileCard.x + mobileCard.width <= 390, 'mobile card fits viewport');
    await page.screenshot({ path: path.join(screenshots, 'layered-mobile.png') });
    const fallback = await browser.newPage({ reducedMotion: 'reduce' });
    fallback.on('pageerror', error => errors.push(error.message));
    await fallback.route('**/assets/layers/chef-bu.png', route => route.abort());
    await fallback.goto(origin);
    await fallback.locator('#retry').waitFor({ state: 'visible' });
    assert.equal(await fallback.locator('#poster').isVisible(), true);
    assert.equal(await fallback.locator('#front').isDisabled(), true);
    assert.match(await fallback.locator('#status').innerText(), /静态/);
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log('PASS: independent parallax, mouse drag, keyboard/reset, five tiers, sensor grant/deny + events, reduced motion, upgrade, mobile layout, failed-layer fallback; no WebGL or external requests.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
