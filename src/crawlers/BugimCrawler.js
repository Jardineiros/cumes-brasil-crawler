const ScraperService = require('../services/scraperService');
const DataService = require('../services/dataService.js');
const CroquiService = require('../services/croquiService');
const logger = require('../services/logger');
const fs = require('fs');
const path = require('path');

class BugimCrawler {
    constructor() {
        this.scraper = new ScraperService();
        this.croquiService = new CroquiService();
        this.croquiPath = path.resolve(__dirname, '../croquis');

        // Inicializando o DataService para CSV e TXT
        this.dataService = new DataService(
            path.resolve(__dirname, '../dados/vias.csv'),
            path.resolve(__dirname, '../dados/vias_backup.txt'),
            [
                'id', 'nome', 'grau', 'crux', 'artificial', 'duracao', 'exposicao', 'extensao',
                'conquistadores', 'detalhes', 'data', 'montanha', 'bairro', 'cidade', 'estado', 'pais',
                'face', 'fonte', 'imagem'
            ]
        );
    }

    sanitizeFileName(name) {
        return name.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, '_').trim();
    }

    isCroquiDownloaded(viaNome) {
        const sanitizedName = this.sanitizeFileName(viaNome);
        const existingFiles = fs.readdirSync(this.croquiPath);
        return existingFiles.some(file => file.startsWith(sanitizedName));
    }

    async scrape() {
        await this.scraper.init();
        const page = await this.scraper.createPage();

        try {
            logger.info('Acessando página principal...');
            await page.goto('https://care53.grupounicad.com.br:334/H~unh2RT09IcL5PpMvvqEx03rBm/', {
                waitUntil: 'networkidle2'
            });

            logger.info('Buscando todas as lupinhas da tabela...');
            const lupaSelectors = await page.$$eval('img[class^="IMGPC"]', lupas =>
                lupas.map(lupa => `.${lupa.className}`)
            );

            logger.info(`Total de vias encontradas: ${lupaSelectors.length}`);

            for (const lupaSelector of lupaSelectors) {
                try {
                    logger.info(`Clicando na lupinha ${lupaSelector}...`);

                    // const viaNome = await page.evaluate((selector) => {
                    //     const row = document.querySelector(selector)?.closest('tr');
                    //     return row ? row.children[1].innerText.trim() : null;
                    // }, lupaSelector);

                    // if (!viaNome) {
                    //     logger.warn(`Não foi possível obter o nome da via para ${lupaSelector}, pulando...`);
                    //     continue;
                    // }
                    //
                    // if (this.isCroquiDownloaded(viaNome)) {
                    //     logger.info(`Via "${viaNome}" já tem croqui baixado. Pulando...`);
                    //     continue;
                    // }

                    await page.waitForSelector(lupaSelector, { timeout: 20000 });
                    await page.click(lupaSelector);

                    logger.info('Esperando a página de detalhes carregar...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await page.waitForFunction(() => document.querySelectorAll('td font').length > 10, { timeout: 30000 });

                    const detalhesVia = await page.evaluate(() => {
                        const getText = (xpath) => {
                            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                            return element ? element.innerText.trim() : 'Não disponível';
                        };

                        const getImages = () => {
                            return Array.from(document.querySelectorAll('table img[src*="Anexos"]'))
                                .map((img) => img.src);
                        };

                        return {
                            id: Date.now(),
                            nome: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/font/b'),
                            grau: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[1]/td/font'),
                            bairro: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[6]/td/font'),
                            cidade: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[7]/td/font'),
                            estado: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[8]/td/font'),
                            pais: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[9]/td/font'),
                            imagens: getImages()
                        };
                    });

                    if (detalhesVia.imagens.length > 0) {
                        let count = 1;
                        for (const imageUrl of detalhesVia.imagens) {
                            const sanitizedName = this.sanitizeFileName(detalhesVia.nome);
                            const croquiFilename = `${sanitizedName}_${String(count).padStart(3, '0')}.jpg`;
                            await this.croquiService.downloadCroqui(imageUrl, croquiFilename);
                            count++;
                        }
                    }

                    await this.dataService.saveToCsv(detalhesVia);
                    await this.dataService.saveToTxt(detalhesVia);

                    const backButtonSelector = 'img.IMGVOLTA1CSS';
                    await page.waitForSelector(backButtonSelector, { timeout: 10000 });
                    await page.click(backButtonSelector);

                } catch (error) {
                    logger.error(`Erro ao processar via (${lupaSelector}): ${error.message}`);
                    continue;
                }
            }
        } finally {
            await this.scraper.close();
        }
    }
}

module.exports = BugimCrawler;
