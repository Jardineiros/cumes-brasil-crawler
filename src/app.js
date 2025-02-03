const BugimCrawler = require('./crawlers/BugimCrawler.js');
const CariocaCrawler = require('./crawlers/CariocaCrawler.js');

(async () => {
    const crawler = new BugimCrawler();
    await crawler.scrape();
})();
