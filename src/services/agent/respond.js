const { chat } = require('../openrouter/chat');

async function generateResponse(userMessage, chunks, history) {
    const context = chunks.map((h, i) => `[${i + 1}] ${h.payload.text}`).join('\n\n');

    const systemPrompt = context
        ? `Ты ИИ-агент корпоративной базы знаний. Отвечай строго на основе контекста. Если ответа нет — скажи об этом честно.\n\nКонтекст:\n${context}`
        : 'Ты ИИ-агент корпоративной базы знаний. По данному запросу информации не найдено — сообщи об этом вежливо.';

    return chat([
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
    ]);
}

module.exports = { generateResponse };
