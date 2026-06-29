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
        ? `Ты ИИ-агент корпоративной базы знаний. Отвечай строго на основе контекста.\n\nПРАВИЛА ФОРМИРОВАНИЯ ОТВЕТА:\n- messageText — только читаемый текст для пользователя. Никаких URL, markdown-ссылок вида [текст](url) или голых ссылок в этом поле.\n- fileUrls — массив всех прямых ссылок на файлы (http/https), найденных в контексте. Если ссылок нет — пустой массив [].\n- Если упоминаешь файл в messageText — называй его по имени, без ссылки.\n\nКонтекст:\n${context}`
        : 'Ты ИИ-агент корпоративной базы знаний. По данному запросу информации не найдено — сообщи об этом вежливо. fileUrls оставь пустым массивом [].';

    const raw = await chat(
        [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ],
        RESPONSE_FORMAT
    );

    const parsed = JSON.parse(raw);
    return {
        messageText: parsed.messageText || '',
        fileUrls: Array.isArray(parsed.fileUrls) ? parsed.fileUrls : []
    };
}

module.exports = { generateResponse };
