const puppeteer = require('puppeteer');

class ScraperService {
    async init() {
        this.browser = await puppeteer.launch({ headless: false });
    }

    async createPage() {
        if (!this.browser) throw new Error('Browser não inicializado.');
        return await this.browser.newPage();
    }

    async close() {
        if (this.browser) await this.browser.close();
    }
}

module.exports = ScraperService;
