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
      // Follow the system until a user chooses a theme, then persist that choice.
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      assert.equal(await page.locator('#toggle-theme').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#toggle-theme').textContent(), '深色模式');
      const lightSystemOverride = async () => {
        await page.locator('#toggle-theme').press('Enter');
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
        assert.equal(await page.locator('#toggle-theme').textContent(), '浅色模式');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.emulateMedia({ colorScheme: 'dark' });
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      };
      await lightSystemOverride();
      await page.locator('#toggle-theme').press('Space');
      await page.locator('#toggle-script').click();
      if (process.env.THEME_SCREENSHOT_DIR && base === '/') {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.screenshot({ path: path.join(process.env.THEME_SCREENSHOT_DIR, 'theme-dark.png'), animations: 'disabled' });
        await page.locator('#toggle-theme').click();
        await page.screenshot({ path: path.join(process.env.THEME_SCREENSHOT_DIR, 'theme-light.png'), animations: 'disabled' });
        await page.locator('#toggle-theme').click();
        await page.setViewportSize({ width: 320, height: 844 });
        await page.screenshot({ path: path.join(process.env.THEME_SCREENSHOT_DIR, 'theme-mobile.png'), animations: 'disabled' });
        await page.setViewportSize({ width: 390, height: 844 });
      }
      await page.locator('#toggle-script').click();
      await context.setOffline(true);
      await page.goto(`${origin}${base}index.html?tab=test&key=C`);
      await page.waitForSelector('tab-maker-chord-diagram');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.equal(await page.locator('#toggle-theme').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#242824');
      const diagramColor = () => page.locator('tab-maker-chord-diagram svg text').first()
        .evaluate(element => getComputedStyle(element).fill);
      assert.equal(await diagramColor(), 'rgb(236, 238, 228)');
      await page.locator('#toggle-theme').click();
      assert.equal(await diagramColor(), 'rgb(48, 55, 47)');
      assert.ok(await page.locator('tab-maker-chord-diagram svg').count());
      assert.equal(await page.locator('#capo-position').textContent(), '变调夹：无需（0 品）');
      // Original C played with Bb shapes needs capo 2; B shapes wrap to capo 1.
      await page.locator('#key-select').selectOption('Bb');
      assert.equal(await page.locator('#capo-position').textContent(), '变调夹：第 2 品');
      await page.locator('#key-select').selectOption('B');
      assert.equal(await page.locator('#capo-position').textContent(), '变调夹：第 1 品');
      await page.locator('#key-select').selectOption('C');
      const notationSize = () => page.locator('tab-maker-block .lyrics').first()
        .evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      const originalSize = await notationSize();
      const editorSize = await page.locator('#tab-script')
        .evaluate(element => getComputedStyle(element).fontSize);
      await page.locator('#increase-tab-size').click();
      assert.ok(Math.abs(await notationSize() - originalSize * 1.1) < 0.01);
      await page.locator('#decrease-tab-size').press('Enter');
      assert.equal(await notationSize(), originalSize);
      for (let i = 0; i < 10; i++) await page.locator('#increase-tab-size').click();
      assert.ok(await page.locator('#increase-tab-size').isDisabled());
      assert.equal(await notationSize(), originalSize * 2);
      assert.equal(await page.locator('tab-maker-block .lyrics').first()
        .evaluate(element => parseFloat(getComputedStyle(element).lineHeight)), originalSize * 3);
      for (let i = 0; i < 15; i++) await page.locator('#decrease-tab-size').click();
      assert.ok(await page.locator('#decrease-tab-size').isDisabled());
      assert.equal(await notationSize(), originalSize * 0.5);
      for (let i = 0; i < 5; i++) await page.locator('#increase-tab-size').click();
      assert.equal(await page.locator('#tab-script')
        .evaluate(element => getComputedStyle(element).fontSize), editorSize);
      await page.locator('#toggle-pitch').click();
      assert.equal(new URL(page.url()).searchParams.get('nn'), '1');
      assert.equal(await page.locator('#toggle-pitch').getAttribute('aria-pressed'), 'true');
      assert.ok(await page.locator('body').evaluate(body => body.classList.contains('show-pitch')));
      await page.locator('#toggle-pitch').press('Space');
      assert.equal(new URL(page.url()).searchParams.get('nn'), '0');
      assert.equal(await page.locator('#toggle-pitch').getAttribute('aria-pressed'), 'false');
      assert.ok(await page.locator('body').evaluate(body => !body.classList.contains('show-pitch')));
      await page.locator('#key-select').selectOption('D');
      assert.equal(await page.locator('#key-select').inputValue(), 'D');
      assert.equal(await page.locator('#capo-position').textContent(), '变调夹：第 10 品');
      assert.equal(new URL(page.url()).searchParams.get('key'), 'D');
      await page.locator('#toggle-pitch').click();
      await page.reload();
      await page.waitForSelector('tab-maker-block');
      assert.equal(await page.locator('#key-select').inputValue(), 'D');
      assert.equal(await page.locator('#toggle-pitch').getAttribute('aria-pressed'), 'true');
      for (const song of songs) {
        await page.locator('#tabs-menu-toggle').click();
        await page.locator(`[data-tab="${song.id}"]`).click();
        await page.waitForFunction(title => document.querySelector('#tab-title').textContent === title,
          JSON.parse(fs.readFileSync(path.join(publicDir, `tabs/${song.id}.json`))).title);
        assert.equal(new URL(page.url()).searchParams.get('tab'), song.id);
        assert.equal(new URL(page.url()).searchParams.get('key'), 'D');
        assert.equal(new URL(page.url()).searchParams.get('nn'), '1');
        assert.equal(await page.locator('#tab-select').inputValue(), song.id);
        assert.equal(await page.locator('#tabs-menu-list li.active').getAttribute('data-tab'), song.id);
        const originalKey = JSON.parse(fs.readFileSync(path.join(publicDir, `tabs/${song.id}.json`))).originalKey;
        const chromaticKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        const expectedCapo = (chromaticKeys.indexOf(originalKey === 'G#' ? 'Ab' : originalKey) - 2 + 12) % 12;
        assert.equal(await page.locator('#capo-position').textContent(), expectedCapo === 0
          ? '变调夹：无需（0 品）' : `变调夹：第 ${expectedCapo} 品`);
      }
      for (const viewport of [{width:320,height:844}, {width:390,height:844},
        {width:665,height:884}, {width:844,height:390}]) {
        await page.setViewportSize(viewport);
        for (const id of ['decrease-tab-size', 'increase-tab-size', 'dump-tab-data', 'toggle-theme']) {
          assert.ok(await page.locator(`#${id}`).evaluate(button => {
            const rect = button.getBoundingClientRect();
            const menu = button.closest('nav').getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= menu.bottom;
          }));
        }
        assert.equal(await page.locator('.tabs-menu-header #toggle-pitch').count(), 1);
        assert.ok(await page.locator('#toggle-pitch').evaluate(button =>
          button.getBoundingClientRect().right <= innerWidth));
        await page.locator('#toggle-script').click();
        assert.ok(await page.locator('#tab-script').isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator('#toggle-script').click();
      }
      // Editing persists data and updates the rendered notation.
      await page.locator('#toggle-script').click();
      const editedScript = '[I] (1) Editor regression check';
      const source = page.locator('#tab-script');
      assert.ok(await source.evaluate(el => {
        const context = document.createElement('canvas').getContext('2d');
        const style = getComputedStyle(el);
        context.font = `${style.fontSize} ${style.fontFamily}`;
        return Math.abs(context.measureText('iiii').width - context.measureText('WWWW').width) < 0.01;
      }), 'ASCII glyphs must have equal advances');
      assert.equal(await page.locator('#undo-script svg').count(), 1);
      assert.equal(await page.locator('#redo-script svg').count(), 1);
      await source.fill('[I-Maj7](6-1)中文歌词,|()-[] <img src=x onerror=alert(1)>\n');
      assert.equal(await page.locator('#script-highlight .syntax-chord').first().textContent(), '[I-Maj7]');
      assert.equal(await page.locator('#script-highlight .syntax-pitch').first().textContent(), '(6-1)');
      assert.equal(await page.locator('#script-highlight .syntax-separator').count(), 3);
      assert.equal(await page.locator('#script-highlight img').count(), 0);
      assert.notEqual(await page.locator('.syntax-chord').first().evaluate(el => getComputedStyle(el).color),
        await page.locator('.syntax-pitch').first().evaluate(el => getComputedStyle(el).color));
      // Separate native edit transactions, then undo/redo each without losing persistence.
      await source.fill('[I](1)初始');
      await source.press('End');
      await source.press('A');
      await source.press('ArrowLeft');
      await source.press('ArrowRight');
      await source.press('B');
      await page.locator('#undo-script').click();
      assert.equal(await source.inputValue(), '[I](1)初始A');
      await source.press('Control+z');
      assert.equal(await source.inputValue(), '[I](1)初始');
      await source.press('Control+Shift+z');
      assert.equal(await source.inputValue(), '[I](1)初始A');
      await page.locator('#redo-script').click();
      assert.equal(await source.inputValue(), '[I](1)初始AB');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tab data')).tabScript), '[I](1)初始AB');
      await source.fill(Array.from({ length: 60 }, () => '[I](1)中文歌词'.repeat(20)).join('\n'));
      await source.evaluate(el => { el.scrollTop = 200; el.scrollLeft = 100; el.dispatchEvent(new Event('scroll')); });
      assert.ok(await source.evaluate(el => {
        const highlight = document.querySelector('#script-highlight');
        return el.scrollTop === highlight.scrollTop && el.scrollLeft === highlight.scrollLeft;
      }));
      await page.locator('#tab-script').fill(editedScript);
      await page.locator('#tab-script').dispatchEvent('change');
      assert.equal(await page.locator('tab-maker-block .lyrics').first().textContent(), 'Editor regression check');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tab data')).tabScript), editedScript);
      await page.goto(origin + base);
      await page.waitForFunction(() => document.querySelector('#tab-title').textContent.includes('(from Local Storage)'));
      assert.equal(await page.locator('#tab-script').inputValue(), editedScript);

      // Rendering also works without the editor or its controls in the DOM.
      await page.evaluate(async () => {
        document.querySelector('.editor').remove();
        document.querySelector('#editor-splitter').remove();
        document.querySelector('.tabs-menu-header').remove();
        const { TabRenderer } = await import('./modules/tab-renderer.js?v=pwa-13');
        new TabRenderer().renderTab({
          title: 'Standalone renderer', originalKey: 'C', tabScript: '[I] (1) Independent rendering',
        }, 'D');
      });
      assert.equal(await page.locator('#tab-title').textContent(), 'Standalone renderer');
      assert.equal(await page.locator('tab-maker-block').first().getAttribute('chord'), 'D');
      assert.equal(await page.locator('tab-maker-block .lyrics').first().textContent(), 'Independent rendering');
      assert.deepEqual(errors, []);
      console.log(`PASS ${base}: manifest, icons, offline reload, all ${songs.length} songs, diagrams, transposition, text size, pitch, portrait/landscape editor`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
