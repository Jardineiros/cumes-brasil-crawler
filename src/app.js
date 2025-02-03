const Care53Crawler = require('./crawlers/BugimCrawler.js');

(async () => {
    const crawler = new Care53Crawler();
    await crawler.scrape();
})();
