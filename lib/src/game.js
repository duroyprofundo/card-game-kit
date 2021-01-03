import Konva from 'konva';
import { GameEvent, GameEventType } from './game_event.js';

export class Game {
    constructor(options = {}) {
        const {
            container,
            width = 0,
            height = 0,
            offscreenAreas = [],
            contextMenu,
            backgroundImageUrl,
            onLoadBackgroundLayer,
            onLoadGameLayer,
            eventHandler
        } = options;

        this.width = width;
        this.height = height;
        this.contextMenu = contextMenu;
        this.backgroundImageUrl = backgroundImageUrl;
        this.onLoadBackgroundLayer = onLoadBackgroundLayer;
        this.onLoadGamerLayer = onLoadGameLayer;
        this.eventHandler = eventHandler;

        this.decks = [];
        this.cards = [];
        this.offscreenAreas = offscreenAreas;

        this.stage = new Konva.Stage({
            container: container,
            width: width,
            height: height
        });

        this.backgroundLayer = new Konva.Layer();
        this.stage.add(this.backgroundLayer);
        this.initializeBackgroundLayer();

        this.gameLayer = new Konva.Layer();
        this.stage.add(this.gameLayer);
        this.initializeGameLayer();

        this.dragLayer = new Konva.Layer();
        this.stage.add(this.dragLayer);

        for (let i=0; i<this.offscreenAreas.length; i++) {
            const area = this.offscreenAreas[i];
            this.gameLayer.add(area.createGroup(this));
        }
        this.gameLayer.draw();

        this.stage.on('click tap', (e) => {
            if (e.target == this.stage || e.target == this.background) {
                if (this.scaledCard) {
                    this.scaledCard.rescale(false, true);
                    this.scaledCard = null;
                }
            }
        });

        this.stage.on('carddragstart', (e) => {
            const card = e.card;

            card.group.moveTo(this.dragLayer);

            if (card.deck) {
                this.dragStartedInDeck = card.deck;
                if (card.deck.dealFaceUp != null) {
                    card.flip(!card.deck.dealFaceUp, false);
                }
                card.deck.removeCard(card);
            } else {
                this.dragStartedInDeck = null;

                if (card.offscreen) {
                    this.sendEvent(
                        new GameEvent(GameEventType.OFFSCREEN_CARD_REMOVED, {
                            card: card,
                            offscreen: card.offscreen
                        })
                    );

                    card.offscreen.removeCard(card);
                    card.offscreen = null;
                }
            }

            this.updateLayers();
        });

        this.stage.on('carddragend', (e) => {
            const card = e.card;

            card.group.remove();

            let added = false;
            const cardRect = card.group.getClientRect();

            for (let i=0;i<this.offscreenAreas.length;i++) {
                const area = this.offscreenAreas[i];

                if (area.group.offsetX() == 0 && this.overlaps(cardRect, area.group.getClientRect())) {
                    this.removeCard(card);
                    area.group.add(card.group);
                    added = true;

                    area.addCard(card);
                    card.offscreen = area;

                    this.sendEvent(
                        new GameEvent(GameEventType.OFFSCREEN_CARD_ADDED, {
                            card: card,
                            offscreen: area
                        })
                    );

                    break;
                }
            }

            if (!added) {
                for (let i = 0; i < this.decks.length; i++) {
                    const deck = this.decks[i];
                    if (this.dragStartedInDeck != deck && this.overlaps(cardRect, deck.getRect())) {
                        card.rotate(false, false);

                        if (deck.stackFaceUp != null) {
                            card.flip(!deck.stackFaceUp, false);
                        }

                        if (deck.addCard(card)) {
                            this.removeCard(card);
                            added = true;
                        }

                        break;
                    }
                }
            }

            if (!added) {
                card.group.moveTo(this.gameLayer);

                for (let i = 0; i < this.cards.length; i++) {
                    const c = this.cards[i];
                }

                this.addCard(card);
            }

            this.updateLayers();
        });

        this.stage.on('offscreenclick', (e) => {
            const area = e.offscreenArea;

            for (let i=0;i<this.offscreenAreas.length;i++) {
                const a = this.offscreenAreas[i];
                if (a != area && a.group.offsetX() == 0) {
                    a.group.fire('click');
                }
            }
        });

        if (this.contextMenu) {
            window.addEventListener('click', () => {
                this.contextMenu.style.display = 'none';
            });

            this.stage.on('contextmenu', (e) => {
                if (e.evt) {
                    e.evt.preventDefault();
                }

                if (e.target == this.stage || e.target == this.background) {
                    this.contextMenu.style.display = 'initial';
                    const containerRect = this.stage.container().getBoundingClientRect();
                    this.contextMenu.style.top =
                        containerRect.top + this.stage.getPointerPosition().y + 4 + 'px';
                    this.contextMenu.style.left =
                        containerRect.left + this.stage.getPointerPosition().x + 4 + 'px';
                }
            });

            this.stage.on('touchstart', (e) => {
                if (e.target == this.stage || e.target == this.background) {
                    this.longPressTimer = setTimeout(() => {
                        this.longPressTimer = null;
                        this.longPressed = true;
                        this.stage.fire('contextmenu', e);
                    }, 1000);
                }
            });

            this.stage.on('touchend', (e) => {
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                    this.contextMenu.style.display = 'none';
                }
            });
        }
    }

    updateLayers() {
        this.gameLayer.draw();
        this.dragLayer.draw();
    }

    initializeBackgroundLayer() {
        if (this.backgroundImageUrl != null) {
            this.background = new Konva.Image({
                width: this.width,
                height: this.height
            });
            this.backgroundLayer.add(this.background);

            const backgroundImage = new Image();
            backgroundImage.onload = () => {
                const scaled = this.scaleToFill(this.width, this.height, backgroundImage.width, backgroundImage.height);
                this.background.image(backgroundImage);

                this.background.size({
                    width: scaled.width,
                    height: scaled.height
                });

                this.background.x((this.width - scaled.width) / 2);
                this.background.y((this.height - scaled.height) / 2);

                if (this.onLoadBackgroundLayer != null) {
                    this.onLoadBackgroundLayer(this, this.backgroundLayer);
                }

                this.backgroundLayer.draw();
                this.backgroundLayer.moveToBottom();
                this.backgroundLayer.cache();
            };
            backgroundImage.src = this.backgroundImageUrl;
        } else if (this.onLoadBackgroundLayer != null) {
            this.onLoadBackgroundLayer(this, this.backgroundLayer);
            this.backgroundLayer.draw();
            this.backgroundLayer.moveToBottom();
            this.backgroundLayer.cache();
        }
    }

    initializeGameLayer() {
        if (this.onLoadGamerLayer != null) {
            this.onLoadGamerLayer(this, this.gameLayer);
            this.gameLayer.draw();
            this.gameLayer.moveToBottom();
        }
    }

    addDeck(deck) {
        this.gameLayer.add(deck.group);
        this.decks.push(deck);
    }

    removeDeck(deck) {
        const index = this.decks.indexOf(deck);
        if (index > -1) {
            deck.group.remove();
            this.decks.splice(index, 1);
        }
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

    getOverlaps(card) {
        let overlaps = [];

        const index = this.cards.indexOf(card);

        if (card.deck || index < 0) {
            return overlaps;
        }

        const rect = card.group.getClientRect();

        for (let i=0;i<this.cards.length;i++) {
            const c = this.cards[i];
            if (c != card) {
                if (this.overlaps(c.group.getClientRect(), rect)) {
                    overlaps.push(c);
                }
            }
        }

        return overlaps;
    }

    scaleToFill(containerWidth, containterHeight, imageWidth, imageHeight) {
        const scale = Math.max(containerWidth / imageWidth, containterHeight / imageHeight);
        const x = (containerWidth / 2) - (imageWidth / 2) * scale;
        const y = (containterHeight / 2) - (imageHeight / 2) * scale;

        return {
            x: x,
            y: y,
            width: imageWidth * scale,
            height: imageHeight * scale
        };
    }

    overlaps(r1, r2) {
        const intersection = this.intersectionRect(r1, r2);
        return (intersection.width > (r1.width / 2) && intersection.height > (r1.height / 2));
    }

    intersectionRect(r1, r2) {
        if (Konva.Util.haveIntersection(r1, r2)) {
            const x = Math.max(r1.x, r2.x);
            const width = Math.min(r1.x + r1.width, r2.x + r2.width) - x;
            const y = Math.max(r1.y, r2.y);
            const height = Math.min(r1.y + r2.height, r2.y + r2.height) - y;

            return {
                x: x,
                y: y,
                width: width,
                height: height
            };
        } else {
            return {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
        }
    }

    scalingCard(card, scale) {
        if (scale > 1.0) {
            if (this.scaledCard) {
                this.scaledCard.rescale(false, true);
            }
            this.scaledCard = card;
        } else if (this.scaledCard == card) {
            this.scaledCard = null;
        }
    }

    sendEvent(event) {
        event.game = this;
        if (this.eventHandler) {
            this.eventHandler(event);
        }
    }

    screenshot() {
        return this.stage.toDataURL({pixelRatio: 2});
    }

    getPlayedCards(offscreen) {
        let cards = [];
        Array.prototype.push.apply(cards, this.cards);

        if (offscreen) {
            for (let i=0; i<this.offscreenAreas.length; i++) {
                const area = this.offscreenAreas[i];
                Array.prototype.push.apply(cards, area.cards);
            }
        }

        return cards;
    }
}
