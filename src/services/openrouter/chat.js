const openrouter = require('../../../config/openrouter');

const MODEL = process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';

async function chat(messages) {
    const res = await openrouter.chat.send({ chatGenerationParams: { model: MODEL, messages } });
    return res.choices[0].message.content;
}

module.exports = { chat };
