const ScraperService = require('../services/scraperService');
const CsvService = require('../services/csvService');
const Via = require('../models/Via');
const logger = require('../services/logger');
const fs = require('fs');

const headers = [
    'id', 'nome', 'grau', 'crux', 'artificial', 'duracao', 'exposicao', 'extensao',
    'conquistadores', 'detalhes', 'data', 'montanha', 'face', 'fonte', 'imagem'
];

class BugimCrawler {
    constructor() {
        this.scraper = new ScraperService();
        this.csvService = new CsvService('vias.csv', headers);
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
            await page.waitForSelector(secondRowSelector, { timeout: 10000 });
            await page.click(secondRowSelector);

            logger.info('Esperando a página de detalhes carregar...');
            await page.waitForTimeout(5000); // Adiciona um tempo de espera extra para garantir carregamento
            await page.waitForFunction(() => document.querySelectorAll('td font').length > 10, { timeout: 20000 });

            // Capturar HTML para debug
            const pageContent = await page.content();
            fs.writeFileSync('page-details.html', pageContent, 'utf8');
            logger.info('HTML da página de detalhes salvo.');

            // Extração de dados
            const detalhesVia = await page.evaluate(() => {
                const getText = (index) => {
                    const elements = document.querySelectorAll('td font');
                    return elements[index] ? elements[index].innerText.trim() : 'Não disponível';
                };

                const getImages = () => {
                    return Array.from(document.querySelectorAll('table img[src*="Anexos"]'))
                        .map((img) => img.src).join(';');
                };

                return {
                    id: 1, // ID fixo
                    nome: getText(0),
                    grau: getText(1),
                    duracao: getText(2),
                    artificial: getText(3),
                    montanha: getText(5),
                    conquistadores: getText(6),
                    data: getText(7),
                    detalhes: getText(9),
                    imagem: getImages()
                };
            });

            logger.info('Dados extraídos:', detalhesVia);

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
