const ScraperService = require('../services/scraperService');
const CsvService = require('../services/csvService');
const CroquiService = require('../services/croquiService');
const Via = require('../models/Via');
const logger = require('../services/logger');
const fs = require('fs');
const path = require('path');

class BugimCrawler {
    constructor() {
        this.scraper = new ScraperService();
        this.csvService = new CsvService('vias.csv', [
            'id', 'nome', 'grau', 'crux', 'artificial', 'duracao', 'exposicao', 'extensao',
            'conquistadores', 'detalhes', 'data', 'montanha', 'face', 'fonte', 'imagem'
        ]);
        this.croquiService = new CroquiService();
        this.croquiPath = path.resolve(__dirname, '../croquis');
    }

    // Método para limpar caracteres inválidos dos nomes dos arquivos
    sanitizeFileName(name) {
        return name.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, '_').trim();
    }

    // Método para verificar se a via já tem croquis baixados
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

                    // Obtendo nome da via antes de clicar
                    const viaNome = await page.evaluate((selector) => {
                        const row = document.querySelector(selector)?.closest('tr');
                        return row ? row.children[1].innerText.trim() : null; // Segunda coluna tem o nome da via
                    }, lupaSelector);

                    if (!viaNome) {
                        logger.warn(`Não foi possível obter o nome da via para ${lupaSelector}, pulando...`);
                        continue;
                    }

                    if (this.isCroquiDownloaded(viaNome)) {
                        logger.info(`Via "${viaNome}" já tem croqui baixado. Pulando...`);
                        continue;
                    }

                    await page.waitForSelector(lupaSelector, { timeout: 20000 });
                    await page.click(lupaSelector);

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
                                .map((img) => img.src);
                        };

                        return {
                            id: Date.now(),
                            nome: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/font/b'),
                            grau: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[1]/td/font'),
                            duracao: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[2]/td/font'),
                            artificial: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td/font'),
                            montanha: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[5]/td/font'),
                            conquistadores: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[7]/td/font'),
                            data: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[8]/td/font'),
                            detalhes: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[10]/td/font'),
                            imagens: getImages()
                        };
                    });

                    // Baixar múltiplos croquis se existirem
                    if (detalhesVia.imagens.length > 0) {
                        let count = 1;
                        for (const imageUrl of detalhesVia.imagens) {
                            const sanitizedName = this.sanitizeFileName(detalhesVia.nome);
                            const croquiFilename = `${sanitizedName}_${String(count).padStart(3, '0')}.jpg`;
                            await this.croquiService.downloadCroqui(imageUrl, croquiFilename);
                            count++;
                        }
                    }

                    // Salvar no CSV
                    await this.csvService.writeData([new Via(detalhesVia)]);
                    logger.info(`Dados da via "${detalhesVia.nome}" salvos no CSV.`);

                    // Clicar no botão de voltar
                    logger.info('Voltando para a página principal...');
                    const backButtonSelector = 'img.IMGVOLTA1CSS';
                    await page.waitForSelector(backButtonSelector, { timeout: 10000 });
                    await page.click(backButtonSelector);

                    // Esperar a página principal carregar de novo
                    await page.waitForSelector('.IMGPC2CSS', { timeout: 20000 });

                } catch (error) {
                    logger.error(`Erro ao processar via (${lupaSelector}): ${error.message}`);
                    continue;
                }
            }
        } catch (error) {
            logger.error(`Erro ao acessar a página principal: ${error.message}`);
        } finally {
            await this.scraper.close();
        }
    }
}

module.exports = BugimCrawler;
