// Run with Node.js and Playwright available in NODE_PATH.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '../public');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.webmanifest')));
assert.equal(manifest.orientation, 'any');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const png = fs.readFileSync(path.join(publicDir, icon.src));
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  let name = url.pathname;
  if (name.startsWith('/public/')) name = name.slice('/public'.length);
  // Reproduce an old cached module that depends on the removed jQuery script.
  // Versioned imports must avoid this legacy response.
  if (name === '/modules/tab-renderer.js' && !url.search) {
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    response.end('export class TabRenderer { constructor() { $.get("./tabs/test.json"); } }');
    return;
  }
  const file = path.join(publicDir, name === '/' ? 'index.html' : name);
  if (!file.startsWith(publicDir + path.sep) || !fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  response.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    for (const base of ['/', '/public/']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // Prove no essential functionality needs the external fonts or a CDN.
      await page.route('https://**', route => route.abort());
      await page.goto(origin + base);
      await page.waitForSelector('tab-maker-chord-diagram');
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const cdp = await context.newCDPSession(page);
      const appManifest = await cdp.send('Page.getAppManifest');
      assert.deepEqual(appManifest.errors, []);
      assert.equal(JSON.parse(appManifest.data).orientation, 'any');
      const songs = JSON.parse(fs.readFileSync(path.join(publicDir, 'tabs/manifest.json'))).tabs;
      await context.setOffline(true);
      await page.goto(`${origin}${base}index.html?tab=test&key=C`);
      await page.waitForSelector('tab-maker-chord-diagram');
      assert.ok(await page.locator('tab-maker-chord-diagram svg').count());
      await page.locator('#toggle-pitch').click();
      assert.equal(await page.locator('#toggle-pitch').getAttribute('aria-pressed'), 'true');
      assert.ok(await page.locator('body').evaluate(body => body.classList.contains('show-pitch')));
      await page.locator('#toggle-pitch').press('Space');
      assert.equal(await page.locator('#toggle-pitch').getAttribute('aria-pressed'), 'false');
      assert.ok(await page.locator('body').evaluate(body => !body.classList.contains('show-pitch')));
      await page.locator('#key-select').selectOption('D');
      assert.equal(await page.locator('#key-select').inputValue(), 'D');
      for (const song of songs) {
        await page.locator('#tabs-menu-toggle').click();
        await page.locator(`[data-tab="${song.id}"]`).click();
        await page.waitForFunction(title => document.querySelector('#tab-title').textContent === title,
          JSON.parse(fs.readFileSync(path.join(publicDir, `tabs/${song.id}.json`))).title);
      }
      for (const viewport of [{width:320,height:844}, {width:390,height:844},
        {width:665,height:884}, {width:844,height:390}]) {
        await page.setViewportSize(viewport);
        assert.equal(await page.locator('.tabs-menu-header #toggle-pitch').count(), 1);
        assert.ok(await page.locator('#toggle-pitch').evaluate(button =>
          button.getBoundingClientRect().right <= innerWidth));
        await page.locator('#toggle-script').click();
        assert.ok(await page.locator('#tab-script').isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator('#toggle-script').click();
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${base}: manifest, icons, offline reload, all ${songs.length} songs, diagrams, transposition, pitch, portrait/landscape editor`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
