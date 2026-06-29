const { chat } = require('../openrouter/chat');

async function generateResponse(userMessage, chunks, history) {
    const context = chunks.map((h, i) => `[${i + 1}] ${h.payload.text}`).join('\n\n');

    const rules = `Правила форматирования ответа:
- Используй **жирный** для выделения важного.
- Для ссылок ВСЕГДА используй формат [текст ссылки](url) — никогда не пиши голый URL или <url>.
- Если в контексте есть ссылка на файл или сайт — обязательно включи её в ответ в формате [описание](url).
- Структурируй длинные ответы с помощью заголовков и списков.`;

    const systemPrompt = context
        ? `Ты ИИ-агент корпоративной базы знаний. Отвечай строго на основе контекста. Если ответа нет — скажи об этом честно.\n\n${rules}\n\nКонтекст:\n${context}`
        : `Ты ИИ-агент корпоративной базы знаний. По данному запросу информации не найдено — сообщи об этом вежливо.\n\n${rules}`;

    return chat([
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
    ]);
}

module.exports = { generateResponse };
