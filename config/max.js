let _bot = null;

const create = (token) => {
    const { Bot } = require('@maxhub/max-bot-api');
    _bot = new Bot(token);
    return _bot;
};

const get = () => _bot;

module.exports = { create, get };
