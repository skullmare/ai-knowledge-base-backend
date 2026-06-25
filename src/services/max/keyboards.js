const { Keyboard } = require('@maxhub/max-bot-api');

module.exports = {
    phoneRequest: Keyboard.inlineKeyboard([
        [Keyboard.button.requestContact('Поделиться номером телефона')]
    ])
};
