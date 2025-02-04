const ScraperService = require('../services/scraperService');
const CsvService = require('../services/csvService');
const CroquiService = require('../services/CroquiService');
const Via = require('../models/Via');
const logger = require('../services/logger');
const path = require('path');

const headers = [
    'id', 'nome', 'grau', 'crux', 'artificial', 'duracao', 'exposicao', 'extensao',
    'conquistadores', 'detalhes', 'data', 'montanha', 'face', 'fonte', 'imagem'
];

class CariocaCrawler {
    constructor() {
        this.scraper = new ScraperService();
        this.csvService = new CsvService('via_cec.csv', headers);
        this.croquiService = new CroquiService();
    }

    async scrape() {
        await this.scraper.init();
        const page = await this.scraper.createPage();

        try {
            logger.info('Acessando página principal...');
            await page.goto('http://site2010.carioca.org.br/croqui/croquiteca.html', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');
            await page.setBypassCSP(true);

            logger.info('Extraindo primeira via para teste...');
            const primeiraVia = await page.evaluate(() => {
                const row = document.querySelector('#croquisTree tbody tr');
                return {
                    nome: row.querySelector('th')?.innerText.trim() || 'Não disponível',
                    grau: row.querySelector('td:nth-child(2)')?.innerText.trim() || 'Não disponível',
                    montanha: row.querySelector('td:nth-child(3)')?.innerText.trim() || 'Não disponível',
                    local: row.querySelector('td:nth-child(4)')?.innerText.trim() || 'Não disponível',
                    cidade: row.querySelector('td:nth-child(5)')?.innerText.trim() || 'Não disponível'
                };
            });

            logger.info(`Extraindo detalhes da via: ${primeiraVia.nome}`);
            await page.click('#croquisTree tbody tr');
            await page.waitForTimeout(2000);

            const detalhesVia = await page.evaluate(() => {
                const getText = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.innerText.trim() : 'Não disponível';
                };

                return {
                    nome: getText('#ifl_nome'),
                    grau: getText('#ifl_nome').match(/\((.*?)\)/)?.[1] || 'Não disponível',
                    localizacao: getText('#ifl_localizacao'),
                    ano: getText('#ifl_ano'),
                    conquistadores: getText('#ifl_conquistadores'),
                    clube: getText('#ifl_clube'),
                    imagem: document.querySelector('#ifl_img')?.src || ''
                };
            });

            if (detalhesVia.imagem) {
                await this.croquiService.downloadCroqui(detalhesVia.imagem, detalhesVia.nome);
            }

            await this.csvService.writeData([new Via(detalhesVia)]);

            logger.info('Teste concluído com uma via. Verifique os resultados antes de processar todas.');

        } catch (error) {
            logger.error(`Erro ao extrair dados: ${error.message}`);
            if (error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) {
                logger.error('A solicitação foi bloqueada pelo cliente. Verifique se há bloqueadores de anúncios ou outras extensões que possam estar interferindo.');
            }
        } finally {
            await this.scraper.close();
        }
    }
}

module.exports = CariocaCrawler;
