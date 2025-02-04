const fs = require('fs');
const axios = require('axios');
const path = require('path');
const logger = require('../services/logger');

class CroquiService {
    constructor() {
        this.croquisDir = path.join(__dirname, '../croquis');
        if (!fs.existsSync(this.croquisDir)) {
            fs.mkdirSync(this.croquisDir, { recursive: true });
        }
    }

    async downloadCroqui(imageUrl, nomeVia) {
        try {
            const imagePath = path.join(this.croquisDir, `${nomeVia.replace(/\s+/g, '_')}`);
            const response = await axios({ url: imageUrl, responseType: 'stream' });
            response.data.pipe(fs.createWriteStream(imagePath));
            logger.info(`Imagem salva em: ${imagePath}`);
        } catch (error) {
            logger.error(`Erro ao baixar imagem: ${error.message}`);
        }
    }
}

module.exports = CroquiService;
