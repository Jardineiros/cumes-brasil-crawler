const ScraperService = require('../services/scraperService');
const DataService = require('../services/dataService.js');
const CroquiService = require('../services/croquiService');
const logger = require('../services/logger');
const path = require('path');

class BugimCrawler {
    constructor() {
        this.scraper = new ScraperService();
        this.croquiService = new CroquiService();

        // Inicializando o DataService para CSV e TXT
        this.dataService = new DataService(
            path.resolve(__dirname, '../dados/vias.csv'),
            path.resolve(__dirname, '../dados/vias_backup.txt'),
            [
                'id', 'nome', 'graduacao', 'tamanho', 'tipo_protecao',
                'localidade', 'montanha', 'numero_protecoes', 'conquistadores',
                'data_conquista', 'clube', 'descricao', 'croquis'
            ]
        );
    }

    async scrape(quantidadeVias = 535) {
        if (quantidadeVias > 535) {
            logger.warn(`Número máximo de vias permitidas é 535. Ajustando para 535.`);
            quantidadeVias = 535;
        }

        await this.scraper.init();
        const page = await this.scraper.createPage();

        try {
            logger.info('Acessando página principal...');
            await page.goto('https://care53.grupounicad.com.br:334/H~unh2RT09IcL5PpMvvqEx03rBm/', {
                waitUntil: 'networkidle2'
            });

            const lupaSelectors = await this._buscarLupas(page, quantidadeVias);
            for (const lupaSelector of lupaSelectors) {
                await this._processarVia(page, lupaSelector);
            }
        } finally {
            await this.scraper.close();
        }
    }

    async _buscarLupas(page, quantidadeVias) {
        logger.info(`Buscando até ${quantidadeVias} lupinhas da tabela...`);
        const lupaSelectors = await page.$$eval(
            'img[class^="IMGPC"]',
            (lupas, maxVias) => lupas.slice(0, maxVias).map(lupa => `.${lupa.className}`),
            quantidadeVias
        );
        logger.info(`Total de vias encontradas: ${lupaSelectors.length}`);
        return lupaSelectors;
    }

    async _processarVia(page, lupaSelector) {
        try {
            logger.info(`Clicando na lupinha ${lupaSelector}...`);
            await page.waitForSelector(lupaSelector, { timeout: 20000 });
            await page.click(lupaSelector);

            logger.info('Esperando a página de detalhes carregar...');
            await page.waitForFunction(() => document.querySelectorAll('td font').length > 10, { timeout: 20000 });

            const detalhesVia = await this._extrairDetalhes(page);

            // Baixar croquis e salvar na pasta correta
            detalhesVia.croquis = await this._baixarCroquis(detalhesVia.nome, detalhesVia.croquis);

            await this.dataService.saveToCsv(detalhesVia);
            await this.dataService.saveToTxt(detalhesVia);

            await this._voltarParaPaginaPrincipal(page);
        } catch (error) {
            logger.error(`Erro ao processar via (${lupaSelector}): ${error.message}`);
        }
    }

    async _extrairDetalhes(page) {
        return await page.evaluate(() => {
            const getText = (xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.innerText.trim() : 'Não disponível';
            };

            const getCroquis = () => {
                return Array.from(document.querySelectorAll('table img[src*="Anexos"]'))
                    .map(img => img.src);
            };

            return {
                id: Date.now(),
                nome: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/font/b'),
                graduacao: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[1]/td/font'),
                tamanho: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[2]/td/font'),
                tipo_protecao: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[3]/td/font'),
                localidade: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[4]/td/font'),
                montanha: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[5]/td/font'),
                numero_protecoes: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[6]/td/font'),
                conquistadores: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[7]/td/font'),
                data_conquista: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[8]/td/font'),
                clube: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[9]/td/font'),
                descricao: getText('/html/body/form[1]/table[2]/tbody/tr/td[2]/table[2]/tbody/tr[10]/td/font'),
                croquis: getCroquis()
            };
        });
    }

    async _baixarCroquis(nomeVia, urlsCroquis) {
        return Promise.all(urlsCroquis.map((url, index) =>
            this.croquiService.downloadCroqui(url, nomeVia, index + 1)
        ));
    }

    async _voltarParaPaginaPrincipal(page) {
        const backButtonSelector = 'img.IMGVOLTA1CSS';
        await page.waitForSelector(backButtonSelector, { timeout: 10000 });
        await page.click(backButtonSelector);
    }
}

module.exports = BugimCrawler;
