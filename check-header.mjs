import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 700 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('https://nendosantei-form.vercel.app/', { waitUntil: 'networkidle' });
const header = await page.locator('header').first();
await header.screenshot({ path: 'c:/Users/fujik/vscode/nendosantei-form/_header-pc.png' });
await ctx.close();

const mctx = await browser.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2 });
const mpage = await mctx.newPage();
await mpage.goto('https://nendosantei-form.vercel.app/', { waitUntil: 'networkidle' });
await mpage.locator('header').first().screenshot({ path: 'c:/Users/fujik/vscode/nendosantei-form/_header-mobile.png' });
await browser.close();
console.log('done');
