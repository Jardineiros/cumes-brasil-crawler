const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

class CsvService {
    constructor(filePath, headers) {
        this.filePath = filePath;
        this.csvWriter = createObjectCsvWriter({
            path: filePath,
            header: headers.map((header) => ({ id: header, title: header })),
        });
    }

    async writeData(data) {
        if (!fs.existsSync(this.filePath)) {
            await this.csvWriter.writeRecords(data);
        } else {
            const appendWriter = createObjectCsvWriter({
                path: this.filePath,
                header: [],
                append: true,
            });
            await appendWriter.writeRecords(data);
        }
    }
}

module.exports = CsvService;
