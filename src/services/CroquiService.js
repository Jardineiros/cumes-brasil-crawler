const fs = require('fs');
const axios = require('axios');
const path = require('path');
const logger = require('../services/logger');

class CroquiService {
    constructor() {
        this.baseCroquisDir = path.join(__dirname, '../croquis');
        if (!fs.existsSync(this.baseCroquisDir)) {
            fs.mkdirSync(this.baseCroquisDir, { recursive: true });
        }
    }

    /**
     * Baixa e salva um croqui dentro da pasta da via correspondente.
     * @param {string} imageUrl - URL da imagem do croqui.
     * @param {string} nomeVia - Nome da via para a qual o croqui pertence.
     * @param {number} index - Índice do croqui (para arquivos numerados).
     */
    async downloadCroqui(imageUrl, nomeVia, index) {
        try {
            const viaDir = path.join(this.baseCroquisDir, this._sanitizeFileName(nomeVia));

            // Criar diretório da via, se não existir
            if (!fs.existsSync(viaDir)) {
                fs.mkdirSync(viaDir, { recursive: true });
            }

            const croquiFilename = `${this._sanitizeFileName(nomeVia)}_${String(index).padStart(2, '0')}.jpg`;
            const imagePath = path.join(viaDir, croquiFilename);

            const response = await axios({ url: imageUrl, responseType: 'stream' });
            response.data.pipe(fs.createWriteStream(imagePath));

            logger.info(`Croqui salvo em: ${imagePath}`);
            return imagePath;
        } catch (error) {
            logger.error(`Erro ao baixar croqui: ${error.message}`);
            return null;
        }
    }

    /**
     * Sanitiza o nome do arquivo, removendo caracteres inválidos.
     * @param {string} name - Nome original da via.
     * @returns {string} - Nome sanitizado.
     */
    _sanitizeFileName(name) {
        return name.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, '_').trim();
    }
}

module.exports = CroquiService;
