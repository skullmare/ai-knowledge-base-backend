const { getAIClient } = require('./client');
const { getSetting } = require('../settings');

async function chat(messages, { model } = {}) {
    const client = await getAIClient();
    const chatModel = model || await getSetting('ai_chat_model');

    const response = await client.chat.completions.create({
        model: chatModel,
        messages,
    });

    return response.choices?.[0]?.message?.content ?? '';
}

module.exports = { chat };
