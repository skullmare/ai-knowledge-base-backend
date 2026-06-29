const { chat } = require('../openrouter/chat');

const RESPONSE_FORMAT = {
    type: 'json_schema',
    json_schema: {
        name: 'agent_response',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                messageText: { type: 'string' },
                fileUrls: { type: 'array', items: { type: 'string' } }
            },
            required: ['messageText', 'fileUrls'],
            additionalProperties: false
        }
    }
};

async function generateResponse(userMessage, chunks, history) {
    const context = chunks.map((h, i) => `[${i + 1}] ${h.payload.text}`).join('\n\n');

    const systemPrompt = context
        ? `Ты ИИ-агент корпоративной базы знаний. Отвечай строго на основе контекста. Если ответа нет — скажи об этом честно. Если в контексте есть ссылки на файлы — включи их в fileUrls, иначе оставь fileUrls пустым массивом.\n\nКонтекст:\n${context}`
        : 'Ты ИИ-агент корпоративной базы знаний. По данному запросу информации не найдено — сообщи об этом вежливо. Оставь fileUrls пустым массивом.';

    const raw = await chat(
        [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ],
        RESPONSE_FORMAT
    );

    try {
        const parsed = JSON.parse(raw);
        return {
            messageText: parsed.messageText || '',
            fileUrls: Array.isArray(parsed.fileUrls) ? parsed.fileUrls : []
        };
    } catch {
        return { messageText: raw, fileUrls: [] };
    }
}

module.exports = { generateResponse };
