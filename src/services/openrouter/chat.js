const openrouter = require('../../../config/openrouter');

const MODEL = process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';

async function chat(messages, responseFormat = null) {
    const params = { model: MODEL, messages };
    if (responseFormat) params.response_format = responseFormat;
    const res = await openrouter.chat.send({ chatGenerationParams: params });
    return res.choices[0].message.content;
}

module.exports = { chat };
