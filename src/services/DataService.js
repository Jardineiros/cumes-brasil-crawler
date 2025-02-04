const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

class DataService {
    constructor(csvFilePath, txtFilePath) {
        this.csvFilePath = csvFilePath;
        this.txtFilePath = txtFilePath;

        this.csvWriter = createObjectCsvWriter({
            path: this.csvFilePath,
            header: [
                { id: 'id', title: 'ID' },
                { id: 'nome', title: 'Nome' },
                { id: 'graduacao', title: 'Graduação' },
                { id: 'tamanho', title: 'Tamanho' },
                { id: 'tipo_protecao', title: 'Tipo de Proteção' },
                { id: 'localidade', title: 'Localidade' },
                { id: 'montanha', title: 'Montanha' },
                { id: 'numero_protecoes', title: 'Número de Proteções' },
                { id: 'conquistadores', title: 'Conquistadores' },
                { id: 'data_conquista', title: 'Data da Conquista' },
                { id: 'clube', title: 'Clube' },
                { id: 'descricao', title: 'Descrição' }
            ],
            append: false // Garante que o arquivo será reescrito toda vez
        });

        this.ensureFileExists();
    }

    ensureFileExists() {
        fs.writeFileSync(this.csvFilePath, '', { flag: 'w' }); // Apaga o conteúdo do arquivo CSV ao iniciar
    }

    async saveToCsv(data) {
        try {
            await this.csvWriter.writeRecords([data]);
            console.log(`✅ Dados salvos no CSV: ${data.nome}`);
        } catch (error) {
            console.error(`❌ Erro ao salvar no CSV: ${error.message}`);
        }
    }

    async saveToTxt(data) {
        try {
            fs.appendFileSync(this.txtFilePath, JSON.stringify(data) + '\n');
        } catch (error) {
            console.error(`❌ Erro ao salvar no TXT: ${error.message}`);
        }
    }
}

module.exports = DataService;
