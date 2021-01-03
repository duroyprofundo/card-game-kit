import Konva from 'konva';
import { Card } from './card.js';
import { GameEvent, GameEventType } from './game_event.js';
import { Spinner } from 'spin.js';

export class Deck {
    constructor(options = {}) {
        const {
            name,
            game,
            x = 0,
            y = 0,
            width = 0,
            height = 0,
            stackFaceUp = false,
            dealFaceUp = true,
            showCount = false,
            maxCards = 0,
            shuffleOnLongPress = true,
            resetCardResourcesOnAdd = true
        } = options;

        this.name = name;
        this.game = game;
        this.width = width;
        this.height = height;
        this.stackFaceUp = stackFaceUp;
        this.dealFaceUp = dealFaceUp;
        this.showCount = showCount;
        this.maxCards = maxCards;
        this.shuffleOnLongPress = shuffleOnLongPress;
        this.resetCardResourcesOnAdd = resetCardResourcesOnAdd;

        this.cards = [];

        this.group = new Konva.Group({
            x: x,
            y: y,
            width: width,
            height: height
        });

        if (this.showCount) {
            this.countText = new Konva.Text({
                x: -5,
                y: 0,
                fontSize: this.height / 8,
                fontFamily: 'Calibri',
                fill: 'DimGrey',
                visible: false
            });
        }
    }

    loadCards(data, resources, zoomScale) {
        const length = data.cards.length;
        if (length > 0) {
            this.showSpinner();
        }

        this.data = data;
        this.loadedCount = 0;

        for (let i=0;i<length;i++) {
            const cardData = data.cards[i];
            const clonedResources = JSON.parse(JSON.stringify(resources));

            for (let j=0; j<cardData.copies; j++) {
                const card = new Card({
                    game: this.game,
                    name: cardData.name,
                    width: this.width,
                    height: this.height,
                    resources: clonedResources,
                    zoomScale: zoomScale,
                    data: cardData
                });

                const backFilename = (cardData.backFilename) ? cardData.backFilename : data.backFilename;
                card.load(cardData.filename,
                    backFilename,
                    this.stackFaceUp,
                    cardData.backFilename?false:true,
                    data.crossOrigin,
                    () => {
                        this.loadedCount++;
                        if (this.loadedCount == length) {
                            this.hideSpinner();
                        }
                    }
                );
                card.deck = this;
                this.cards.push(card);
            }
        }
    }

    showSpinner() {
        this.spinner = document.createElement('spinner_' + this.name.replace(/ /g, "_"));
        document.body.appendChild(this.spinner);
        this.spinner.style.position = 'absolute';
        this.spinner.style.top = (this.group.y()+this.height/2) + 'px';
        this.spinner.style.left = (this.group.x()+this.width/2) + 'px';
        this.spinner.style.width = this.width;
        this.spinner.style.height = this.height;

        const spinnerObj = new Spinner({color:'#fff', length:this.width/8}).spin();
        this.spinner.appendChild(spinnerObj.el);
    }

    hideSpinner() {
        this.spinner.parentNode.removeChild(this.spinner);
        setTimeout(() => {
            this.updateVisibleCards();
        }, 0);
    }

    shuffle() {
        for (let i=this.cards.length-1;i>0;i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const card = this.cards[i];
            this.cards[i] = this.cards[j];
            this.cards[j] = card;
        }

        this.updateVisibleCards();

        this.game.sendEvent(
            new GameEvent(GameEventType.DECK_SHUFFLED, {
                deck: this
            })
        );
    }

    updateVisibleCards() {
        this.group.removeChildren();
        let count = 0;
        for (let i=this.cards.length-1;i>=0;i--) {
            if (count < 2) {
                if (!this.cards[i].group.isVisible()) {
                    this.cards[i].group.show();
                }
                this.group.add(this.cards[i].group);
                this.cards[i].group.moveToBottom();
            } else if (count >= 2 && this.cards[i].group.isVisible()) {
                this.cards[i].group.hide();
            }
            count++;
        }

        if (this.countText) {
            if (this.cards.length > 0) {
                this.group.add(this.countText);
                this.countText.visible(true);
                this.countText.setText(this.cards.length);
                this.countText.offsetX(this.countText.width());
                this.countText.moveToTop();
            } else {
                this.countText.visible(false);
            }
        }

        if (this.group.getLayer()) {
            this.group.getLayer().draw();
        }
    }

    removeCard(card) {
        const index = this.cards.indexOf(card);
        if (index > -1) {
            this.cards.splice(index, 1);
        }

        card.deck = null;

        this.updateVisibleCards();

        this.game.sendEvent(
            new GameEvent(GameEventType.DECK_CARD_REMOVED, {
                deck: this,
                card: card
            })
        );
    }

    addCard(card) {
        if (this.maxCards > 0 && this.cards.length >= this.maxCards) {
            return false;
        }

        card.deck = this;
        card.group.x(0);
        card.group.y(0);
        card.group.offsetX(0);
        card.group.offsetY(0);
        card.group.rotation(0);

        if (this.resetCardResourcesOnAdd) {
            card.resetResources();
        }

        this.cards.push(card);
        this.updateVisibleCards();

        this.game.sendEvent(
            new GameEvent(GameEventType.DECK_CARD_ADDED, {
                deck: this,
                card: card
            })
        );

        return true;
    }

    getRect() {
        const rect = this.group.getClientRect();
        if (rect.width == 0 || rect.height == 0) {
            rect.width = this.width;
            rect.height = this.height;
        }

        return rect;
    }

    handleDoubleTap() {
        if (this.shuffleOnLongPress && this.cards.length > 1) {
            this.shuffle();
        }
    }

    handleLongPress() {
        if (this.cards.length > 1) {
            const card = this.cards.pop();
            this.cards.unshift(card);
            this.updateVisibleCards();

            this.game.sendEvent(
                new GameEvent(GameEventType.DECK_CARD_TOP_TO_BOTTOM, {
                    deck: this,
                    card: card
                })
            );
        }
    }
}
