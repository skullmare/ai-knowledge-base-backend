const axios = require('axios');

const MODEL = process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function chat(messages, options = {}) {
    const { data } = await axios.post(
        BASE_URL,
        { model: MODEL, messages, ...options },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return data.choices[0].message.content;
}

module.exports = { chat };
