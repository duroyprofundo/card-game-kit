export const GameEventType = {
    DECK_SHUFFLED: 'deck_shuffled',
    DECK_CARD_ADDED: 'deck_card_added',
    DECK_CARD_REMOVED: 'deck_card_removed',
    DECK_CARD_TOP_TO_BOTTOM: 'deck_card_top_to_bottom',
    CARD_FLIPPED: 'card_flipped',
    CARD_ROTATED: 'card_rotated',
    CARD_SCALED: 'card_scaled',
    CARD_RESOURCE_INCREASED: 'card_resource_increased',
    CARD_RESOURCE_DECREASED: 'card_resource_decreased',
    CARD_MOVE_STARTED: 'card_move_started',
    CARD_MOVE_ENDED: 'card_move_ended',
    OFFSCREEN_CARD_ADDED: 'offscreen_card_added',
    OFFSCREEN_CARD_REMOVED: 'offscreen_card_removed'
};

export class GameEvent {
    constructor(type, options = {}) {
        const {
            game,
            offscreen,
            deck,
            card,
            resource,
            value
        } = options;

        this.type = type;
        this.game = game;
        this.offscreen = offscreen;
        this.deck = deck;
        this.card = card;
        this.resource = resource;
        this.value = value;
    }
}