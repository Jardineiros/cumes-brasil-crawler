const ScraperService = require('../services/scraperService');
const CsvService = require('../services/csvService');
const Via = require('../models/Via');
const logger = require('../services/logger');
const fs = require('fs');

const headers = [
    'id',
    'nome',
    'grau',
    'crux',
    'artificial',
    'duracao',
    'exposicao',
    'extensao',
    'conquistadores',
    'detalhes',
    'data',
    'montanha',
    'face',
    'fonte',
    'imagem',
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
                waitUntil: 'networkidle2',
            });

            logger.info('Clicando na lupinha da segunda linha...');
            const secondRowSelector = 'tr:nth-of-type(2) img.IMGPC1CSS';
            await page.waitForSelector(secondRowSelector);
            await page.click(secondRowSelector);

            logger.info('Esperando a página de detalhes carregar...');
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Capturar o HTML para inspeção
            const pageContent = await page.content();
            fs.writeFileSync('page-details.html', pageContent, 'utf8');
            logger.info('HTML da página de detalhes salvo como page-details.html.');

            // Extração de dados
            const detalhesVia = await page.evaluate(() => {
                const getText = (selector) => {
                    try {
                        const element = document.querySelector(selector);
                        const value = element ? element.textContent.trim() : 'Não disponível';
                        console.log(`Valor extraído para [${selector}]:`, value);
                        return value;
                    } catch (error) {
                        console.error(`Erro ao buscar o seletor: ${selector}`, error);
                        return 'Não disponível';
                    }
                };

                const getImages = () => {
                    try {
                        const images = Array.from(
                            document.querySelectorAll('table img[src*="Anexos"]')
                        ).map((img) => img.src);
                        console.log('Imagens encontradas:', images);
                        return images;
                    } catch (error) {
                        console.error('Erro ao buscar imagens:', error);
                        return [];
                    }
                };

                return {
                    id: 1, // ID fixo por enquanto
                    nome: getText('table:nth-of-type(2) font[size="3"]'),
                    grau: getText('font:contains("Graduação:")'),
                    duracao: getText('font:contains("Tamanho:")'),
                    artificial: getText('font:contains("Tipo de Proteção:")'),
                    montanha: getText('font:contains("Montanha:")'),
                    conquistadores: getText('font:contains("Conquistadores:")'),
                    data: getText('font:contains("Data da Conquista:")'),
                    detalhes: getText('font:contains("Descrição:")'),
                    imagem: getImages().join(';'),
                };
            });

            logger.info('Dados extraídos:', detalhesVia);

            // Salvar no CSV
            const via = new Via(detalhesVia);
            await this.csvService.writeData([via]);

            logger.info('Dados salvos no CSV.');
        } catch (error) {
            logger.error(`Erro ao extrair dados: ${error.message}`);
        } finally {
            await this.scraper.close();
        }
    }
}

module.exports = BugimCrawler;
