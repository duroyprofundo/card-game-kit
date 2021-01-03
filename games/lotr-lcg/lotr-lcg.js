const LotrEventType = {
    LOTR_LCG_DECK_LOADED : 'lotr_lcg_deck_loaded',
    THREAT_INCREASED : 'threat_increased',
    THREAT_DECREASED : 'threat_decreased',
    NEW_ROUND : 'new_round'
};

class LotrLcg {
        constructor() {
        const realCardWidth = 1484;
        const realCardHeight = 2108;

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        const maxCardWidth = (this.width - 120) / 5;
        const maxCardHeight = (this.height - 40) / 4;
        const scaledSize = this.scaleToFit(maxCardWidth, maxCardHeight, realCardWidth, realCardHeight);

        this.cardWidth = scaledSize.width;
        this.cardHeight = scaledSize.height;
        this.scrollingLogTextWidth = 300;
        this.scrollingLogTextMargin = 10;
        this.scrollingLogTextFontSize = 14;
        this.zoomScale = 400 / this.cardHeight;
        this.threat = 0;
        this.events = [];
    }

    initialize() {
        const menuNode = document.getElementById('menu');

        document.getElementById('round-button').addEventListener('click', () => {
            const played = this.game.getPlayedCards(true);
            let heroes = [];

            for (let i=0; i<played.length; i++) {
                const card = played[i];
                if (card.isRotated()) {
                    card.rotate(false, false);
                }

                if (card.isZoomed()) {
                    card.rescale(false, false);
                }

                if (card.data.type == 'Hero') {
                    heroes.push(card);
                }
            }

            this.setThreat(this.threat+1);
            this.game.sendEvent(
                new CardGameKit.GameEvent(LotrEventType.THREAT_INCREASED, {
                    value: this.threat
                })
            );

            this.round++;
            this.game.sendEvent(
                new CardGameKit.GameEvent(LotrEventType.NEW_ROUND, {
                    value: this.round
                })
            );

            for (let i=0;i<heroes.length;i++) {
                const hero = heroes[i];
                const resources = hero.resources;

                for (let j=0;j<resources.length;j++) {
                    const resource = resources[j];
                    if (resource.name == 'Resources') {
                        resource.count++;
                        hero.updateResources();
                        this.game.sendEvent(
                            new CardGameKit.GameEvent(CardGameKit.GameEventType.CARD_RESOURCE_INCREASED, {
                                card: hero,
                                resource: resource
                            })
                        );
                        break;
                    }
                }
            }

            this.game.updateLayers();
        });

        document.getElementById('export-button').addEventListener('click', () => {
            setTimeout(() => {
                const filename = 'lotr-lcg-' + Date.now() + '.txt';
                let log = this.events.join("\n");
                if (this.events.length == 0) {
                    log = "No logs.\n";
                }

                this.downloadText(log, filename);
            }, 0);
        });

        document.getElementById('screenshot-button').addEventListener('click', () => {
            setTimeout(() => {
                const filename = 'lotr-lcg-' + Date.now() + '.png';
                this.downloadURI(this.game.screenshot(), filename);
            }, 0);
        });

        const tagSize = 25;
        const offscreenHeight = (this.height - 2*this.cardHeight - 40) / 2;
        const offscreenAreas = [];

        offscreenAreas.push(new CardGameKit.OffscreenArea({
            name: 'Offscreen 1',
            y: this.height/2-offscreenHeight-1,
            width: this.width - tagSize,
            height: offscreenHeight,
            tagSize: tagSize,
            direction: 'right'
        }));

        offscreenAreas.push(new CardGameKit.OffscreenArea({
            name: 'Offscreen 2',
            y: this.height/2-offscreenHeight-1,
            width: this.width - tagSize,
            height: offscreenHeight,
            tagSize: tagSize,
            direction: 'left'
        }));

        offscreenAreas.push(new CardGameKit.OffscreenArea({
            name: 'Offscreen 3',
            y: this.height/2+1,
            width: this.width - tagSize,
            height: offscreenHeight,
            tagSize: tagSize,
            direction: 'right'
        }));

        offscreenAreas.push(new CardGameKit.OffscreenArea({
            name: 'Offscreen 4',
            y: this.height/2+1,
            width: this.width - tagSize,
            height: offscreenHeight,
            tagSize: tagSize,
            direction: 'left'
        }));

        this.game = new CardGameKit.Game({
            container: 'container',
            width: this.width,
            height: this.height,
            offscreenAreas: offscreenAreas,
            contextMenu: menuNode,
            backgroundImageUrl: './background.jpg',
            onLoadBackgroundLayer: (_game, layer) => {
                this.backgroundLayer = layer;
                this.createDecks(layer);
                this.addScrollingLogText(this.gameLayer);
            },
            onLoadGameLayer: (_game, layer) => {
                this.gameLayer = layer;
                this.addButtons(layer);
                this.addThreatTracker(layer);
            },
            eventHandler: (event) => {
                this.logEvent(event);
            }
        });

        this.round = 1;
        this.game.sendEvent(
            new CardGameKit.GameEvent(LotrEventType.NEW_ROUND, {
                value: this.round
            })
        );
    }

    createDecks(backgroundLayer) {
        this.encounterDiscard = this.createDeckAndAddOutlines(backgroundLayer, 0, 0, 'Encounter\nDiscard', false, {
            name: 'Encounter Discard',
            stackFaceUp: true,
            dealFaceUp: true,
            showCount: true
        });

        this.encounterDeck = this.createDeckAndAddOutlines(backgroundLayer, 0, 1, 'Encounter\nDeck', false, {
            name: 'Encounter Deck',
            stackFaceUp: false,
            dealFaceUp: true,
            showCount: true
        });

        this.questDeck = this.createDeckAndAddOutlines(backgroundLayer, 0, 2, 'Quest\nDeck', false, {
            name: 'Quest Deck',
            stackFaceUp: true,
            dealFaceUp: null,
            showCount: false,
            shuffleOnLongPress: false,
            resetCardResourcesOnAdd: false
        });

        this.activeLocation = this.createDeckAndAddOutlines(backgroundLayer, 0, 3, 'Active\nLocation', true, {
            name: 'Active Location',
            stackFaceUp: true,
            dealFaceUp: true,
            showCount: false,
            maxCards: 1,
            resetCardResourcesOnAdd: false
        });

        this.playerDiscard = this.createDeckAndAddOutlines(backgroundLayer, 1, 0, 'Player\nDiscard', false, {
            name: 'Player Discard',
            stackFaceUp: true,
            dealFaceUp: true,
            showCount: true
        });

        this.playerDeck = this.createDeckAndAddOutlines(backgroundLayer, 1, 1, 'Player\nDeck', false, {
            name: 'Player Deck',
            stackFaceUp: false,
            dealFaceUp: true,
            showCount: true
        });
    }

    createDeckAndAddOutlines(backgroundLayer, row, col, text, visibleOutlines, deckOptions = {}) {
        let x = col * this.cardWidth + 30 + col*30;
        let y = (row == 0) ? 10 : this.height - this.cardHeight;

        let width = this.cardWidth;
        let height = this.cardHeight;

        if (row == 0) {
            if (col == 2) {
                // quest deck -- swap width/height
                [width, height] = [height, width];
            } else if (col > 2) {
                // offset x to account for quest deck
                x += (height - width);
            }
        }

        const outlineWidth = width + (visibleOutlines?10:-10);
        const outlineHeight = height + (visibleOutlines?10:-10);

        const group = new Konva.Group({
            x: x,
            y: y,
            width: outlineWidth,
            height: outlineHeight,
        });

        const rect = new Konva.Rect({
            stroke: '#555',
            strokeWidth: this.cardWidth/25,
            width: outlineWidth,
            height: outlineHeight,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffsetX: 10,
            shadowOffsetY: 10,
            shadowOpacity: 0.2,
            cornerRadius: 2,
        });
        group.add(rect);

        const label = new Konva.Text({
            text: text,
            fontSize: this.cardWidth / 7,
            fontFamily: 'Calibri',
            fill: '#555',
            width: outlineWidth,
            height: outlineHeight,
            align: 'center',
            verticalAlign: 'middle'
        });
        group.add(label);

        backgroundLayer.add(group);

        x += (visibleOutlines?5:-5);
        y += (visibleOutlines?5:-5);

        deckOptions.game = this.game;
        deckOptions.x = x;
        deckOptions.y = y;
        deckOptions.width = width;
        deckOptions.height = height;

        const deck = new CardGameKit.Deck(deckOptions);
        this.game.addDeck(deck);

        return deck;
    }

    addButtons(layer) {
        const encounterLoadButton = this.addLoadButton(layer,
            this.cardWidth + 60, 10, this.cardWidth - 10, this.cardHeight - 10, 'Load',
            () => {
                this.loadEncounterDeck(encounterLoadButton);
            });

        const playerLoadButton = this.addLoadButton(layer,
            this.cardWidth + 60, this.height-this.cardHeight, this.cardWidth-10, this.cardHeight-10, 'Load',
            () => {
                this.loadPlayerDeck(playerLoadButton);
            });
    }

    addLoadButton(layer, x, y, width, height, text, clickHandler) {
        var button = new Konva.Label({
            x: x,
            y: y,
            opacity: 0.5,
        });

        layer.add(button);

        button.add(new Konva.Tag({
            fill: 'dimgrey',
            lineJoin: 'round',
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: 10,
            shadowOpacity: 0.5
        }));

        button.add(new Konva.Text({
            text: text,
            fontFamily: 'Calibri',
            fontSize: this.cardWidth / 7,
            padding: 5,
            fill: 'white',
            width: width,
            height: height,
            align: 'center',
            verticalAlign: 'middle',
            offsetY: this.cardWidth / 7 * 2
        }));

        if (clickHandler) {
            button.on('click tap', () => {
                clickHandler();
            });
        }

        return button;
    }

    addThreatTracker(layer) {
        const x =  this.cardWidth + 55;
        const fontSize = this.cardWidth / 4;
        const pointerSize = this.cardWidth / 4;

        const group = new Konva.Group({
            x: x,
            y: this.height - this.cardHeight - 2*pointerSize,
            width: this.cardWidth,
            height: this.pointerSize*2
        });

        group.add(new Konva.Rect({
            width: this.cardWidth,
            height: pointerSize*2,
            opacity: 0.0
        }));

        this.threatLabel = new Konva.Text({
            text: '0',
            fontFamily: 'Calibri',
            fontSize: fontSize,
            fill: 'green',
            height: pointerSize*2,
            width: this.cardWidth,
            verticalAlign: 'middle',
            align: 'center'
        });
        group.add(this.threatLabel);

        const plusTag = new Konva.Tag({
            x: this.cardWidth-pointerSize,
            y: pointerSize,
            fill: 'dimGrey',
            pointerDirection: 'right',
            pointerWidth: pointerSize,
            pointerHeight: pointerSize
        });
        group.add(plusTag);

        const minusTag = new Konva.Tag({
            x: pointerSize,
            y: pointerSize,
            fill: 'dimGrey',
            pointerDirection: 'left',
            pointerWidth: pointerSize,
            pointerHeight: pointerSize
        });
        group.add(minusTag);

        const midX = group.x() + this.threatLabel.width()/2;
        group.on('click tap', (e) => {
            const pos = this.game.stage.getPointerPosition();
            if (pos.x > midX) {
                this.setThreat(this.threat+1);
                this.game.sendEvent(
                    new CardGameKit.GameEvent(LotrEventType.THREAT_INCREASED, {
                        value: this.threat
                    })
                );
            } else if (this.threat > 0) {
                this.setThreat(this.threat-1);
                this.game.sendEvent(
                    new CardGameKit.GameEvent(LotrEventType.THREAT_DECREASED, {
                        value: this.threat
                    })
                );
            }
        });

        layer.add(group);
    }

    addScrollingLogText(layer) {
        var position = this.activeLocation.group.absolutePosition();

        if ((this.width - position.x - this.activeLocation.width) > (this.scrollingLogTextWidth + this.scrollingLogTextMargin*2)) {
            this.scrollingLogText = new Konva.Text({
                x: this.width - this.scrollingLogTextWidth - this.scrollingLogTextMargin,
                y: position.y,
                width: this.scrollLogTextWidth,
                height: this.activeLocation.height,
                wrap: 'none',
                ellipsis: true,
                text: '',
                fontSize: this.scrollingLogTextFontSize,
                fontFamily: 'Calibri',
                fill: '#555',
                align: 'left',
                clip: {
                    x: 0,
                    y: 0,
                }
            });

            layer.add(this.scrollingLogText);

            this.scrollingLogTextLines = Math.floor(this.activeLocation.height / this.scrollingLogTextFontSize);
        }
    }

    jsonFileLoad(callback) {
        const input = document.createElement('input');
        input.type = 'file';

        input.onchange = (e) => {
           const file = e.target.files[0];

           const reader = new FileReader();
           reader.readAsText(file, 'UTF-8');
           reader.onload = (readerEvent) => {
              const content = readerEvent.target.result;
              callback(JSON.parse(content));
           };
        };

        input.click();
    }

    loadEncounterDeck(button) {
        this.jsonFileLoad((json) => {
            try {
                const encounterJson = {};
                encounterJson.name = json.name;
                encounterJson.backFilename = json.backFilename;
                encounterJson.cards = [];
                encounterJson.crossOrigin = json.crossOrigin;

                json.encounterSets.forEach((set) => {
                    Array.prototype.push.apply(encounterJson.cards, set.cards);
                });

                if (json.setup && json.setup.cards) {
                    const setupCards = [];

                    encounterJson.cards.forEach((card) => {
                        for (let i = 0; i < json.setup.cards.length; i++) {
                            const name = json.setup.cards[i];
                            if (card.name == name) {
                                card.copies = card.copies - 1;
                                const cardCopy = JSON.parse(JSON.stringify(card));
                                cardCopy.copies = 1;
                                setupCards.push(cardCopy);
                            }
                        }
                    });

                    Array.prototype.push.apply(encounterJson.cards, setupCards);
                }

                this.encounterDeck.loadCards(encounterJson, [
                    new CardGameKit.CardResource({
                        name: 'Damage',
                        colour: 'red'
                    }),
                    new CardGameKit.CardResource({
                        name: 'Progress',
                        colour: 'green'
                    })], this.zoomScale);

                const questJson = {};
                questJson.name = json.name;
                questJson.cards = json.quests.cards.reverse();
                questJson.crossOrigin = json.crossOrigin;

                this.questDeck.loadCards(questJson, [
                    new CardGameKit.CardResource({
                        name: 'Progress',
                        colour: 'green'
                    })], this.zoomScale);
                this.questDeck.stackFaceUp = null;

                button.destroy();
                this.game.updateLayers();

                this.game.sendEvent(
                    new CardGameKit.GameEvent(LotrEventType.LOTR_LCG_DECK_LOADED, {
                        value: json.name
                    })
                );
            } catch (ex) {
                console.log(ex);
                alert('Invalid Encounter Deck');
            }
        });
    }

    loadPlayerDeck(button) {
        this.jsonFileLoad((json) => {
            try {
                const playerJson = {};
                playerJson.name = json.name;
                playerJson.backFilename = json.backFilename;
                playerJson.cards = json.cards;
                playerJson.crossOrigin = json.crossOrigin;

                Array.prototype.push.apply(playerJson.cards, json.heroes.cards);

                this.setThreat(json.heroes.startingThreat);
                this.playerDeck.loadCards(json, [
                    new CardGameKit.CardResource({
                        name: 'Resources',
                        colour: 'white'
                    }),
                    new CardGameKit.CardResource({
                        name: 'Damage',
                        colour: 'red'
                    })], this.zoomScale);

                button.destroy();
                this.game.updateLayers();

                this.game.sendEvent(
                    new CardGameKit.GameEvent(LotrEventType.LOTR_LCG_DECK_LOADED, {
                        value: json.name
                    })
                );
            } catch (ex) {
                console.log(ex);
                alert('Invalid Player Deck');
            }
        });
    }

    scaleToFit(containerWidth, containerHeight, width, height) {
        const scale = Math.min(containerWidth / width, containerHeight / height);
        const x = (containerWidth / 2) - (width / 2) * scale;
        const y = (containerHeight / 2) - (height / 2) * scale;

        return {
            x: x,
            y: y,
            width: width * scale,
            height: height * scale
        };
    }

    setThreat(threat) {
        this.threat = threat;

        if (this.threat < 30) {
            this.threatLabel.fill('green');
        } else if (this.threat < 40) {
            this.threatLabel.fill('yellow');
        } else {
            this.threatLabel.fill('red');
        }

        this.threatLabel.text(this.threat);
        this.threatLabel.getLayer().draw();
    }

    // function from https://stackoverflow.com/a/15832662/512042
    downloadURI(uri, name) {
        let link = document.createElement('a');
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    downloadText(text, name) {
        const blob = new Blob([text], {type: 'text/plain'});
        const link = document.createElement('a');
        link.download = name;
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    logEvent(event) {
        let string;

        switch (event.type) {
            case CardGameKit.GameEventType.DECK_SHUFFLED: {
                string = event.deck.name + ' shuffled.';
                break;
            }
            case CardGameKit.GameEventType.DECK_CARD_ADDED: {
                string = event.card.name + ' moved to ' + event.deck.name + '.';
                break;
            }
            case CardGameKit.GameEventType.DECK_CARD_REMOVED: {
                let verb;

                if (event.deck.name == 'Player Deck' || event.deck.name == 'Encounter Deck') {
                    verb = 'drawn';
                } else {
                    verb = 'moved';
                }

                string = event.card.name + ' ' + verb + ' from ' + event.deck.name + '.';
                break;
            }
            case CardGameKit.GameEventType.DECK_CARD_TOP_TO_BOTTOM: {
                string = event.card.name + ' moved to bottom of ' + event.deck.name + '.';
                break;
            }
            case CardGameKit.GameEventType.CARD_ROTATED: {
                string = event.card.name + (event.value ? ' exhausted.': ' readied.');
                break;
            }
            case CardGameKit.GameEventType.CARD_RESOURCE_INCREASED:
            case CardGameKit.GameEventType.CARD_RESOURCE_DECREASED: {
                const verb = (event.type == CardGameKit.GameEventType.CARD_RESOURCE_INCREASED) ? ' increased ' : ' decreased ';
                string = event.card.name + verb + event.resource.name + ' to ' + event.resource.count + '.';
                break;
            }
            case CardGameKit.GameEventType.CARD_MOVE_ENDED: {
                if (event.card.data.type == 'Attachment') {
                    let attachedTo = null;

                    let overlaps = this.game.getOverlaps(event.card);

                    let filterItems = [event.card];
                    const filterFunc = (item) => {
                        return !filterItems.includes(item);
                    };

                    while (overlaps.length > 0) {
                        attachedTo = overlaps.shift();
                        filterItems.push(attachedTo);

                        const newOverlaps = this.game.getOverlaps(attachedTo).filter(filterFunc);
                        Array.prototype.push.apply(overlaps, newOverlaps);
                    }

                    if (attachedTo) {
                        string = event.card.name + ' attached to ' + attachedTo.name + '.';
                    }
                }
                break;
            }
            case CardGameKit.GameEventType.OFFSCREEN_CARD_ADDED: {
                string = event.card.name + ' added to ' + event.offscreen.name + '.';
                break;
            }
            case CardGameKit.GameEventType.OFFSCREEN_CARD_REMOVED: {
                string = event.card.name + ' moved from ' + event.offscreen.name + '.';
                break;
            }
            case LotrEventType.LOTR_LCG_DECK_LOADED: {
                string = 'Loaded: ' + event.value;
                break;
            }
            case LotrEventType.THREAT_INCREASED:
            case LotrEventType.THREAT_DECREASED: {
                const verb = (event.type == LotrEventType.THREAT_INCREASED) ? 'increased' : 'decreased';
                string = 'Threat ' + verb + ' to ' + event.value + '.';
                break;
            }
            case LotrEventType.NEW_ROUND: {
                string = 'Round: ' + event.value;
                break;
            }
            case CardGameKit.GameEventType.CARD_FLIPPED:
            case CardGameKit.GameEventType.CARD_SCALED:
            default: {
                break;
            }
        }

        if (string) {
            this.events.push(string);

            if (this.scrollingLogText) {
                const startIndex = (this.events.length - this.scrollingLogTextLines) >= 0 ? (this.events.length - this.scrollingLogTextLines) : 0;
                const endIndex = this.events.length;

                var logText = this.events[startIndex];
                for (var i=startIndex+1; i<endIndex; i++) {
                    logText = logText + '\n' + this.events[i];
                }

                this.scrollingLogText.setText(logText);
            }
        }
    }
}

const lotrLcg = new LotrLcg();
lotrLcg.initialize();