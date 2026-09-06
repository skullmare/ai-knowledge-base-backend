const { chat } = require('../ai/chat');
const { getSetting } = require('../settings');
const { collectSources, buildContext, attachSources } = require('./sources');

/**
 * Ответ агента по найденному контексту.
 *
 * @returns {Promise<{answer: string, message: string, sources: Array}>}
 *   answer — текст модели (уходит в историю диалога),
 *   message — он же с метками источников (уходит пользователю в мессенджер).
 */
async function generateResponse(userMessage, chunks, history) {
    const sources = collectSources(chunks);
    const context = buildContext(sources);

    const [basePrompt, emptyPrompt, linkRules, sourceRules] = await Promise.all([
        getSetting('agent_system_prompt'),
        getSetting('agent_empty_context_prompt'),
        getSetting('agent_link_rules_prompt'),
        getSetting('agent_source_rules_prompt'),
    ]);

    const systemPrompt = context
        ? `${basePrompt}\n\nКонтекст:\n${context}\n\n${sourceRules}\n\n${linkRules}`
        : `${emptyPrompt}\n\n${linkRules}`;

    const answer = await chat([
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
    ]);

    return { answer, message: attachSources(answer, sources), sources };
}

module.exports = { generateResponse };
