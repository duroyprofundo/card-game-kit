import Konva from 'konva';
import { GameEvent, GameEventType } from './game_event.js';

export class Card {
    constructor(options = {}) {
        const {
            game,
            name = 'Card',
            width = 0,
            height = 0,
            resources,
            zoomScale = 1.0,
            data
        } = options;

        this.game = game;
        this.name = name;
        this.width = width;
        this.height = height;
        this.resources = resources;
        this.resourceGroups = [];
        this.zoomScale = zoomScale;
        this.data = data;

        this.group = new Konva.Group({
            draggable: true,
            visible: false
        });

        this.front = new Konva.Image({
            visible: false,
            scaleX: 0,
            width: width,
            height: height
        });

        this.back = new Konva.Image({
            visible: false,
            scaleX: 0,
            width: width,
            height: height
        });

        this.group.add(this.front, this.back);

        if (resources) {
            for (let i=0; i<resources.length; i++) {
                this.addResource(resources[i]);
            }

            this.updateResources();
        }

        this.group.on('dragstart', () => {
            if (this.pendingLongPress) {
                clearTimeout(this.pendingLongPress);
                this.pendingLongPress = null;
            }

            this.group.getStage().fire('carddragstart', {
                card: this
            });

            this.rescale(false, true);
            this.group.moveToTop();

            this.game.sendEvent(
                new GameEvent(GameEventType.CARD_MOVE_STARTED, {
                    card: this
                })
            );
        });

        this.group.on('dragend', () => {
            this.group.getStage().fire('carddragend', {
                card: this
            });

            this.group.getLayer().draw();

            this.game.sendEvent(
                new GameEvent(GameEventType.CARD_MOVE_ENDED, {
                    card: this
                })
            );
        });

        this.group.on('click tap', (e) => {
            const onCard = (e.target == this.front || e.target == this.back);

            if (onCard) {
                if (!this.isFlipped() || !this.commonBack) {
                    this.rescale(!this.isZoomed(), true);
                }
            } else {
                for (let i=0; i<this.resourceGroups.length; i++) {
                    const resource = this.resourceGroups[i];
                    let update = 0;
                    if (e.target == resource.plus) {
                        update = 1;
                    } else if (e.target == resource.minus) {
                        update = -1;
                    }

                    if (update != 0) {
                        resource.resource.count += update;
                        if (resource.resource.count < 0) {
                            resource.resource.count = 0;
                            update = 0;
                        }

                        if (update != 0) {
                            this.updateResources();
                            this.group.getLayer().draw();

                            this.game.sendEvent(
                                new GameEvent((update == 1) ? GameEventType.CARD_RESOURCE_INCREASED : GameEventType.CARD_RESOURCE_DECREASED, {
                                    card: this,
                                    resource: resource.resource
                                })
                            );
                        }
                        break;
                    }
                }
            }
        });

        this.group.on('dblclick dbltap', (e) => {
            const onCard = (e.target == this.front || e.target == this.back);
            if (!onCard) {
                return;
            }

            if (this.deck) {
                this.deck.handleDoubleTap();
            } else {
                this.rescale(false, false);
                this.rotate(!this.isRotated(), true);
            }
        });

        this.group.on('mousedown touchstart', (e) => {
            this.pendingLongPress = setTimeout(() => {
                const onCard = (e.target == this.front || e.target == this.back);
                if (onCard) {
                    if (this.deck) {
                        this.rescale(false, true);
                        this.deck.handleLongPress();
                    } else {
                        this.rescale(false, true);
                        this.flip(!this.isFlipped(), true);
                    }
                }
            }, 1000);
        });

        this.group.on('mouseup touchend', () => {
            if (this.pendingLongPress) {
                clearTimeout(this.pendingLongPress);
                this.pendingLongPress = null;
            }
        });
    }

    isZoomed() {
        return (this.group.scaleX() != 1.0);
    }

    isRotated() {
        return (this.group.rotation() == 90);
    }

    isFlipped() {
        return (this.back.isVisible());
    }

    load(frontImageUrl, backImageUrl, faceup, commonBack, crossOrigin, onLoaded) {
        this.commonBack = commonBack;

        if (faceup) {
            this.front.visible(true);
            this.front.scaleX(1);
        } else {
            this.back.visible(true);
            this.back.scaleX(1);
        }

        const frontImage = new Image();
        frontImage.onload = () => {
            this.front.image(frontImage);
            if (this.back.image() != null) {
                onLoaded(this);
            }
        };
        if (crossOrigin) {
            frontImage.crossOrigin = 'Anonymous';
        }
        frontImage.src = frontImageUrl;

        const backImage = new Image();
        backImage.onload = () => {
            this.back.image(backImage);
            if (this.front.image() != null) {
                onLoaded(this);
            }
        };
        if (crossOrigin) {
            backImage.crossOrigin = 'Anonymous';
        }
        backImage.src = backImageUrl;
    }

    addResource(resource) {
        const label = new Konva.Label({
            opacity: 0.75,
        });

        label.add(new Konva.Tag({
            fill: 'black',
        }));

        const fontSize = this.height/8;

        const count = new Konva.Text({
            text: resource.count,
            fontSize: fontSize,
            fontFamily: 'Calibri',
            fill: resource.colour,
            align: 'center',
            visible: true
        });
        count.width(count.width()*2);
        label.add(count);

        const pointerSize = this.height/10;

        const plus = new Konva.Tag({
            fill: resource.colour,
            pointerDirection: 'right',
            pointerWidth: pointerSize,
            pointerHeight: pointerSize,
            opacity: 0.75
        });
        plus.offsetY(-fontSize/2);

        const minus = new Konva.Tag({
            fill: resource.colour,
            pointerDirection: 'left',
            pointerWidth: pointerSize,
            pointerHeight: pointerSize,
            opacity: 0.75
        });
        minus.offsetY(-fontSize/2);

        const group = new Konva.Group({
            x: this.width
        });

        group.add(label, plus, minus);

        this.resourceGroups.push({'resource': resource, 'group': group, 'count': count, 'plus': plus, 'minus': minus});
        this.group.add(group);
    }

    flip(flipped, animated) {
        if (flipped == this.isFlipped()) {
            return;
        }

        let s1;
        let s2;

        if (flipped) {
            s1 = this.front;
            s2 = this.back;
        } else {
            s1 = this.back;
            s2 = this.front;
        }

        if (animated) {
            const tween1 = new Konva.Tween({
                node: s1,
                scaleX: 0,
                offsetX: this.width/2,
                duration: 0.1,
                onFinish: () => {
                    s1.visible(false);
                    s2.visible(true);
                    this.updateResources();
                    tween2.play();
                }
            });
            tween1.play();
            const tween2 = new Konva.Tween({
                node: s2,
                scaleX: 1,
                offsetX: 0,
                duration: 0.1,
                onFinish: () => {
                    s1.offsetX(0);
                }
            });
        } else {
            s1.visible(false);
            s1.scaleX(0);
            s2.visible(true);
            s2.scaleX(1);
            this.updateResources();
        }

        this.game.sendEvent(
            new GameEvent(GameEventType.CARD_FLIPPED, {
                card: this,
                value: flipped
            })
        );
    }

    rotate(rotated, animated) {
        if (rotated == this.isRotated()) {
            return;
        }

        const rotation = rotated ? 90 : 0;
        const halfHeight = this.height / 2;
        const halfWidth = this.width / 2;

        const x = rotated ? this.group.x() + halfHeight : this.group.x() - halfHeight;
        const y = rotated ? this.group.y() + halfWidth : this.group.y() - halfWidth;
        const offsetX = rotated ? halfWidth : 0;
        const offsetY = rotated ? halfWidth : 0;

        if (animated) {
            const tween = new Konva.Tween({
                node: this.group,
                rotation: rotation,
                x: x,
                y: y,
                offsetX: offsetX,
                offsetY: offsetY,
                duration: 0
            });
            tween.play();
        } else {
            this.group.rotation(rotation);
            this.group.x(x);
            this.group.y(y);
            this.group.offsetX(offsetX);
            this.group.offsetY(offsetY);
        }

        this.game.sendEvent(
            new GameEvent(GameEventType.CARD_ROTATED, {
                card: this,
                value: rotated
            })
        );
    }

    rescale(zoomed, animated) {
        const scale = zoomed ? this.zoomScale : 1.0;

        if (this.group.scaleX() == scale) {
            return;
        }

        if (zoomed) {
            this.rescaleCardZ = this.group.zIndex();
            this.group.moveToTop();

            if (this.deck) {
                this.rescaleDeckZ = this.deck.group.zIndex();
                this.deck.group.moveToTop();
            }
        } else {
            this.group.zIndex(this.rescaleCardZ);

            if (this.deck) {
                this.deck.group.zIndex(this.rescaleDeckZ);
            }
        }

        this.game.scalingCard(this, scale);

        let offsetX = (this.isRotated()) ? this.width / 2 : 0;
        let offsetY = (this.isRotated()) ? this.width / 2 : 0;

        if (zoomed) {
            const pos = this.group.getAbsolutePosition();
            let right = 0;
            let bottom = 0;

            if (this.isRotated()) {
                right = pos.x - offsetX + (this.height * scale) / 2;
                bottom = pos.y + (this.width * scale) / 2;
            } else {
                right = pos.x + (this.width * scale);
                bottom = pos.y + (this.height * scale);
            }

            if (right > this.game.width) {
                if (this.isRotated()) {
                    offsetX -= (right - this.game.width)/scale;
                } else {
                    offsetX += (right - this.game.width)/scale;
                }
            }

            if (bottom > this.game.height) {
                offsetY += (bottom - this.game.height)/scale;
            }

            if (this.isRotated()) {
                [offsetX, offsetY] = [offsetY, offsetX];
            }
        }

        if (animated) {
            const tween = new Konva.Tween({
                node: this.group,
                scaleX: scale,
                scaleY: scale,
                offsetX: offsetX,
                offsetY: offsetY,
                duration: 0.1,
                onFinish: () => {
                    this.updateResources();
                }
            });
            tween.play();
        } else {
            this.group.scaleX(scale);
            this.group.scaleY(scale);
            this.group.offsetX(offsetX);
            this.group.offsetY(offsetY);
            this.updateResources();
        }

        this.game.sendEvent(
            new GameEvent(GameEventType.CARD_SCALED, {
                card: this,
                value: scale
            })
        );
    }

    updateResources() {
        let visibleCount = 0;
        for (let i=0;i<this.resourceGroups.length;i++) {
            const resource = this.resourceGroups[i];
            const count = resource.resource.count;
            resource.count.text(count);

            resource.group.visible((!this.isFlipped() || !this.commonBack) && (count > 0 || this.isZoomed()));

            if (resource.group.isVisible()) {
                resource.group.offsetX(resource.count.width());
                resource.group.y(resource.count.height()*visibleCount);
            }

            resource.minus.visible(this.isZoomed());
            if (resource.minus.isVisible()) {
                resource.minus.offsetX(resource.minus.width()+2);
            }

            resource.plus.visible(this.isZoomed());
            if (resource.plus.isVisible()) {
                resource.plus.offsetX(-resource.count.width()-2);
                resource.group.offsetX(resource.group.offsetX()+resource.plus.pointerWidth());
            }

            if (resource.group.isVisible()) {
                visibleCount++;
            }
        }
    }

    resetResources() {
        for (let i=0;i<this.resources.length;i++) {
            this.resources[i].count = 0;
        }
        this.updateResources();
    }
}