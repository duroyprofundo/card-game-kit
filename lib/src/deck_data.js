export class DeckData {
    constructor(options = {}) {
        const {
            name,
            backFilename,
            cards = [],
            crossOrigin = false,
        } = options;

        this.name = name;
        this.backFilename = backFilename;
        this.cards = cards;
        this.crossOrigin = crossOrigin;
    }
}
