const BugimCrawler = require('./crawlers/BugimCrawler.js');

(async () => {
    const crawler = new BugimCrawler();
    await crawler.scrape();
})();
