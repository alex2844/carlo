const puppeteer = require('puppeteer-core');

(async () => {
	const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium' });
	await browser.close();
})();
