const { chat } = require('../ai/chat');
const { getSetting } = require('../settings');

async function rewriteQuery(userMessage, history) {
    if (!history.length) return userMessage;

    const historyText = history
        .map(m => `${m.role === 'user' ? 'Пользователь' : 'Агент'}: ${m.content}`)
        .join('\n');

    const systemPrompt = await getSetting('agent_rewrite_prompt');

    const result = await chat([
        { role: 'system', content: systemPrompt },
        {
            role: 'user',
            content: `История диалога:\n${historyText}\n\nПоследнее сообщение: ${userMessage}`
        }
    ]);

    return result?.trim() || userMessage;
}

module.exports = { rewriteQuery };
