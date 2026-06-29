const { chat } = require('../openrouter/chat');
const logger = require('../../utils/logger');

const RESPONSE_SCHEMA = `{
  "textMessage": "текст ответа пользователю",
  "files": [
    { "url": "https://...", "name": "название файла или ссылки" }
  ]
}`;

async function generateResponse(userMessage, chunks, history) {
    const context = chunks.map((h, i) => `[${i + 1}] ${h.payload.text}`).join('\n\n');

    const systemPrompt = context
        ? `Ты ИИ-агент корпоративной базы знаний. Отвечай строго на основе контекста. Если ответа нет — скажи об этом честно.

Ты ОБЯЗАН вернуть ответ строго в формате JSON без каких-либо пояснений вне JSON:
${RESPONSE_SCHEMA}

Правила:
- В "textMessage" пиши чистый текст ответа без ссылок и URL.
- В "files" помещай ВСЕ ссылки и файлы из контекста, которые относятся к ответу. Если ссылок нет — оставь пустой массив.
- Не дублируй ссылки в textMessage.

Контекст:\n${context}`
        : `Ты ИИ-агент корпоративной базы знаний. По данному запросу информации не найдено — сообщи об этом вежливо.

Вернуть строго JSON:
${RESPONSE_SCHEMA}`;

    const raw = await chat(
        [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ],
        { response_format: { type: 'json_object' } }
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
