const { chat } = require('../ai/chat');
const { getSetting } = require('../settings');

async function generateResponse(userMessage, chunks, history) {
    const context = chunks.map((h, i) => `[${i + 1}] ${h.payload.text}`).join('\n\n');

    const [basePrompt, emptyPrompt, linkRules] = await Promise.all([
        getSetting('agent_system_prompt'),
        getSetting('agent_empty_context_prompt'),
        getSetting('agent_link_rules_prompt'),
    ]);

    const systemPrompt = context
        ? `${basePrompt}\n\nКонтекст:\n${context}\n\n${linkRules}`
        : `${emptyPrompt}\n\n${linkRules}`;

    return chat([
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
    ]);
}

module.exports = { generateResponse };
