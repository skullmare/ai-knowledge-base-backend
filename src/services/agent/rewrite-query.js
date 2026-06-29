const { chat } = require('../openrouter/chat');

async function rewriteQuery(userMessage, history) {
    if (!history.length) return userMessage;

    const historyText = history
        .map(m => `${m.role === 'user' ? 'Пользователь' : 'Агент'}: ${m.content}`)
        .join('\n');

    const result = await chat([
        {
            role: 'system',
            content: `Ты помощник, который формулирует поисковые запросы к базе знаний.
На основе истории диалога и последнего сообщения пользователя сформулируй один самодостаточный поисковый запрос, который полностью описывает информацию, которую нужно найти.
Запрос должен быть конкретным, без местоимений вроде "это", "он", "там" — только явные понятия.
Отвечай ТОЛЬКО поисковым запросом, без пояснений.`
        },
        {
            role: 'user',
            content: `История диалога:\n${historyText}\n\nПоследнее сообщение: ${userMessage}`
        }
    ]);

    return result?.trim() || userMessage;
}

module.exports = { rewriteQuery };
