export class CardResource {
    constructor(options = {}) {
        const {
            name,
            colour,
            count = 0
        } = options;

        this.name = name;
        this.colour = colour;
        this.count = count;
    }
}
