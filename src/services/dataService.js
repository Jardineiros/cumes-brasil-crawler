const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

class DataService {
    constructor(csvFilePath, txtFilePath, headers) {
        this.csvFilePath = csvFilePath;
        this.txtFilePath = txtFilePath;
        this.headers = headers;

        this.csvWriter = createObjectCsvWriter({
            path: this.csvFilePath,
            header: this.headers.map((header) => ({ id: header, title: header })),
            append: fs.existsSync(this.csvFilePath),
        });

        this.ensureFileExists();
    }

    ensureFileExists() {
        if (!fs.existsSync(this.csvFilePath)) {
            fs.writeFileSync(this.csvFilePath, this.headers.join(',') + '\n');
        }
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
