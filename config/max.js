const axios = require('axios');

const BASE_URL = 'https://botapi.max.ru';

let _client = null;

const create = (token) => {
    let marker = null;
    const headers = { Authorization: token };

    _client = {
        async getUpdates(timeout = 25) {
            const params = { timeout, limit: 100 };
            if (marker != null) params.marker = marker;
            const { data } = await axios.get(`${BASE_URL}/updates`, {
                params,
                headers,
                timeout: (timeout + 5) * 1000
            });
            if (data.marker != null) marker = data.marker;
            return data.updates || [];
        },

        async sendMessage(chatId, text, attachments = []) {
            const body = {
                recipient: { chat_id: chatId },
                type: 'text',
                body: { text }
            };
            if (attachments.length) body.attachments = attachments;
            await axios.post(`${BASE_URL}/messages`, body, { headers });
        },

        async sendTyping(chatId) {
            await axios.post(
                `${BASE_URL}/chats/${chatId}/actions`,
                { action: 'typing_on' },
                { headers }
            ).catch(() => {});
        }
    };

    return _client;
};

const get = () => _client;

module.exports = { create, get };
