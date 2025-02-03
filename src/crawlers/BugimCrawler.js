const ScraperService = require('../services/scraperService');
const CsvService = require('../services/csvService');
const CroquiService = require('../services/croquiService');
const Via = require('../models/Via');
const logger = require('../services/logger');
const fs = require('fs');
const path = require('path');

const headers = [
    'id', 'nome', 'grau', 'crux', 'artificial', 'duracao', 'exposicao', 'extensao',
    'conquistadores', 'detalhes', 'data', 'montanha', 'face', 'fonte', 'imagem'
];

class BugimCrawler {
    constructor() {
        this.scraper = new ScraperService();
        this.csvService = new CsvService('vias.csv', headers);
        this.croquiService = new CroquiService();
    }

    async scrape() {
        await this.scraper.init();
        const page = await this.scraper.createPage();

        try {
            logger.info('Acessando página principal...');
            await page.goto('https://care53.grupounicad.com.br:334/H~unh2RT09IcL5PpMvvqEx03rBm/', {
                waitUntil: 'networkidle2'
            });

            logger.info('Clicando na lupinha da segunda linha...');
            const secondRowSelector = 'tr:nth-of-type(2) img.IMGPC1CSS';
            await page.waitForSelector(secondRowSelector, { timeout: 20000 });
            await page.click(secondRowSelector);

            logger.info('Esperando a página de detalhes carregar...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.waitForFunction(() => document.querySelectorAll('td font').length > 10, { timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Extração de dados
            const detalhesVia = await page.evaluate(() => {
                const getText = (xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.innerText.trim() : 'Não disponível';
                };

                const getImages = () => {
                    return Array.from(document.querySelectorAll('table img[src*="Anexos"]'))
                        .map((img) => img.src).join(';');
                };

                return {
                    id: 1, // ID fixo
                    nome: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/font/b'),
                    grau: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[1]/td/font'),
                    duracao: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[2]/td/font'),
                    artificial: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td/font'),
                    montanha: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[5]/td/font'),
                    conquistadores: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[7]/td/font'),
                    data: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[8]/td/font'),
                    detalhes: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[10]/td/font'),
                    imagem: getImages()
                };
            });

            // Baixar croqui usando CroquiService
            if (detalhesVia.imagem) {
                await this.croquiService.downloadCroqui(detalhesVia.imagem, detalhesVia.nome);
            }

            // Salvar no CSV
            await this.csvService.writeData([new Via(detalhesVia)]);
            logger.info('Dados salvos no CSV.');
        } catch (error) {
            logger.error(`Erro ao extrair dados: ${error.message}`);
        } finally {
            await this.scraper.close();
        }
    }
}

module.exports = BugimCrawler;
