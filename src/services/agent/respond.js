const { chat } = require('../openrouter/chat');
const logger = require('../../utils/logger');

const RESPONSE_FORMAT = {
    type: 'json_schema',
    json_schema: {
        name: 'agent_response',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                textMessage: {
                    type: 'string',
                    description: 'Текст ответа пользователю без ссылок и URL',
                },
                files: {
                    type: 'array',
                    description: 'Ссылки и файлы из контекста, относящиеся к ответу',
                    items: {
                        type: 'object',
                        properties: {
                            url:  { type: 'string', description: 'URL файла или ссылки' },
                            name: { type: 'string', description: 'Название файла или ссылки' },
                        },
                        required: ['url', 'name'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['textMessage', 'files'],
            additionalProperties: false,
        },
    },
};

async function generateResponse(userMessage, chunks, history) {
    const context = chunks.map((h, i) => `[${i + 1}] ${h.payload.text}`).join('\n\n');

    const systemPrompt = context
        ? `Ты ИИ-агент корпоративной базы знаний. Отвечай строго на основе контекста. Если ответа нет — скажи об этом честно. В поле textMessage пиши текст без ссылок, все ссылки и файлы из контекста выноси в поле files.\n\nКонтекст:\n${context}`
        : 'Ты ИИ-агент корпоративной базы знаний. По данному запросу информации не найдено — сообщи об этом вежливо.';

    const raw = await chat(
        [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ],
        { response_format: RESPONSE_FORMAT }
    );

    try {
        const parsed = JSON.parse(raw);
        return {
            textMessage: parsed.textMessage || raw,
            files: Array.isArray(parsed.files) ? parsed.files : [],
        };
    } catch (err) {
        logger.error('[Agent] Не удалось распарсить JSON-ответ, возвращаем сырой текст', null, err.message);
        return { textMessage: raw, files: [] };
    }
}

module.exports = { generateResponse };
