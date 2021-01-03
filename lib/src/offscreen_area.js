import Konva from 'konva';

export class OffscreenArea {
    constructor(options = {}) {
        const {
            name = 'Offscreen Area',
            y = 0,
            width = 0,
            height = 0,
            tagSize = 0,
            direction = 'right'
        } = options;

        this.name = name;
        this.y = y;
        this.width = width;
        this.height = height;
        this.tagSize = tagSize;
        this.direction = direction;
        this.cards = [];
    }

    createGroup(game) {
        this.game = game;

        const toRight = (this.direction == 'right') ? true : false;
        const offscreenOffset = toRight ? (this.width) : -(this.width);

        this.group = new Konva.Group({
            width: this.game.width,
            height: this.game.height,
            offsetX: offscreenOffset
        });

        const rect = new Konva.Rect({
            x: toRight?0:this.game.width-this.width,
            y: this.y,
            fill: '#555',
            width: this.width,
            height: this.height,
            visible: false,
            opacity: 0.5
        });
        this.group.add(rect);

        const pointerRect = new Konva.Rect({
            x: toRight?this.width:this.game.width-this.width-2*this.tagSize,
            y: this.y,
            fill: '#555',
            width: this.tagSize*2,
            height: this.height,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffsetX: toRight?10:-10,
            shadowOffsetY: 10,
            opacity: 0.0
        });
        this.group.add(pointerRect);

        const pointer = new Konva.Tag({
            x: toRight?this.width:this.game.width-this.width,
            y: this.y+(this.height/2),
            fill: 'dimGrey',
            pointerDirection: this.direction,
            pointerWidth: this.tagSize,
            pointerHeight: this.tagSize,
            lineJoin: 'round',
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffsetX: toRight?10:-10,
            shadowOffsetY: 10,
            shadowOpacity: 0.5,
        });
        this.group.add(pointer);

        this.group.on('click tap', (e) => {
            if (!(!e.target || e.target == this.group || e.target == rect || e.target == pointerRect || e.target == pointer)) {
                return;
            }

            const offsetX = (this.group.offsetX() == 0) ? offscreenOffset : 0;

            if (offsetX == 0) {
                for (let i=0;i<this.group.children.length;i++) {
                    this.group.children[i].visible(true);
                }
                pointer.visible(false);
                pointerRect.visible(false);

                this.group.moveToTop();
            } else {
                for (let i=0; i<this.cards.length; i++) {
                    const card = this.cards[i];
                    if (card.isZoomed()) {
                        card.rescale(false, false);
                    }
                }
            }

            this.group.getStage().fire('offscreenclick', {
                offscreenArea: this
            });

            const tween = new Konva.Tween({
                node: this.group,
                offsetX: offsetX,
                duration: 0.5,
                onFinish: () => {
                    if (offsetX != 0) {
                        for (let i = 0; i < this.group.children.length; i++) {
                            const child = this.group.children[i];

                            if (child != pointerRect && child != pointer) {
                                child.visible(false);
                            }
                        }

                        pointer.visible(true);
                        pointerRect.visible(true);
                    }
                }
            });
            tween.play();
        });

        return this.group;
    }

    addCard(card) {
        const index = this.cards.indexOf(card);
        if (index < 0) {
            this.cards.push(card);
        }
    }

    removeCard(card) {
        const index = this.cards.indexOf(card);
        if (index > -1) {
            this.cards.splice(index, 1);
        }
    }
}
