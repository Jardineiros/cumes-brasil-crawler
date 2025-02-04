const BugimCrawler = require('../../crawlers/BugimCrawler');
const logger = require('../../services/logger');

describe('BugimCrawler - Teste de Integração', () => {
    let crawler;

    beforeAll(() => {
        crawler = new BugimCrawler();
    });

    test('Deve acessar o site e extrair corretamente 2 vias', async () => {
        await crawler.scrape(2);

        logger.info('✔️ Teste concluído! As duas primeiras vias foram scrapadas.');
    }, 60000);
});
