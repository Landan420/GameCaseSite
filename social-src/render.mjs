// Renders the link-preview card from social-src/card.html:
//   public/social/card.png — 1200×630 still for og:image / Twitter / fallbacks
//   public/social/card.gif — the reel spinning and landing, for the Discord embed
//
// Uses the Chrome already installed on this machine (puppeteer-core never
// downloads one). Override the path with CHROME_PATH if it lives elsewhere.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'social');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// The GIF is smaller than the PNG: Discord shows it at roughly this width
// anyway, and full-size photo frames would make it several megabytes.
const GIF_SCALE = 0.6;
const SPIN_FRAMES = 44;
const FRAME_MS = 45;
const HOLD_MS = 2600;

fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars'] });
try {
    const page = await browser.newPage();
    const url = pathToFileURL(path.join(here, 'card.html')).href;

    async function load(scale) {
        await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: scale });
        await page.goto(url, { waitUntil: 'networkidle0' });
        await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
        });
    }

    await load(1);
    await page.evaluate(() => window.setProgress(1));
    await page.screenshot({ path: path.join(outDir, 'card.png') });
    console.log('wrote card.png');

    // Home-screen icon: the favicon on the site background, with padding.
    const svg = fs.readFileSync(path.join(here, '..', 'public', 'favicon.svg'), 'utf8');
    await page.setViewport({ width: 180, height: 180, deviceScaleFactor: 1 });
    await page.setContent(
        `<body style="margin:0;width:180px;height:180px;display:grid;place-items:center;background:#0d1016">` +
            svg.replace('<svg ', '<svg width="128" height="128" ') +
            `</body>`
    );
    await page.screenshot({ path: path.join(outDir, '..', 'apple-touch-icon.png') });
    console.log('wrote apple-touch-icon.png');

    await load(GIF_SCALE);
    const gif = GIFEncoder();
    for (let i = 0; i <= SPIN_FRAMES; i++) {
        const p = i / SPIN_FRAMES;
        await page.evaluate((v) => window.setProgress(v), p);
        const png = PNG.sync.read(await page.screenshot({ type: 'png' }));
        const palette = quantize(png.data, 256);
        const index = applyPalette(png.data, palette);
        gif.writeFrame(index, png.width, png.height, {
            palette,
            delay: i === SPIN_FRAMES ? HOLD_MS : FRAME_MS,
        });
    }
    gif.finish();
    fs.writeFileSync(path.join(outDir, 'card.gif'), gif.bytes());
    console.log('wrote card.gif');
} finally {
    await browser.close();
}
