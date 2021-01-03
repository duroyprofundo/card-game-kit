export class CardData {
    constructor(options = {}) {
        const {
            name,
            filename,
            backFilename,
            copies
        } = options;

        this.name = name;
        this.filename = filename;
        this.backFilename = backFilename;
        this.copies = copies;
    }
}
