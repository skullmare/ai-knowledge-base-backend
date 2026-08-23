const mocks = require('../helpers/mocks');
const Message = require('../../src/models/message');
const AgentUser = require('../../src/models/agent-user');
const { processMessage } = require('../../src/services/agent');
const { generateResponse } = require('../../src/services/agent/respond');
const { rewriteQuery } = require('../../src/services/agent/rewrite-query');
const { createAgentRole, createAgentUser } = require('../helpers/factories');

const activeUser = async () => {
    const role = await createAgentRole();
    return AgentUser.findById((await createAgentUser({ role: role._id, status: 'active' }))._id).populate('role');
};

describe('services/agent/rewrite-query', () => {
    it('возвращает исходный вопрос, если истории нет', async () => {
        const result = await rewriteQuery('Как оформить отпуск?', []);

        expect(result).toBe('Как оформить отпуск?');
        expect(mocks.chat).not.toHaveBeenCalled();
    });

    it('переформулирует вопрос с учётом истории', async () => {
        mocks.chat.mockResolvedValueOnce('  порядок оформления отпуска  ');

        const result = await rewriteQuery('А как его оформить?', [
            { role: 'user', content: 'Расскажи про отпуск' }
        ]);

        expect(result).toBe('порядок оформления отпуска');
        expect(mocks.chat).toHaveBeenCalledTimes(1);
    });

    it('откатывается к исходному вопросу на пустом ответе модели', async () => {
        mocks.chat.mockResolvedValueOnce('   ');

        const result = await rewriteQuery('Вопрос', [{ role: 'user', content: 'Контекст' }]);

        expect(result).toBe('Вопрос');
    });
});

describe('services/agent/respond', () => {
    it('передаёт найденный контекст в системный промпт', async () => {
        await generateResponse('Вопрос', [{ payload: { text: 'Фрагмент базы знаний' } }], []);

        const [messages] = mocks.chat.mock.calls[0];
        expect(messages[0].role).toBe('system');
        expect(messages[0].content).toContain('Фрагмент базы знаний');
        expect(messages.at(-1)).toEqual({ role: 'user', content: 'Вопрос' });
    });

    it('сообщает модели об отсутствии контекста', async () => {
        await generateResponse('Вопрос', [], []);

        const [messages] = mocks.chat.mock.calls[0];
        expect(messages[0].content).toContain('информации не найдено');
    });

    it('прокидывает историю диалога между системным промптом и вопросом', async () => {
        await generateResponse('Второй вопрос', [], [
            { role: 'user', content: 'Первый вопрос' },
            { role: 'assistant', content: 'Первый ответ' }
        ]);

        const [messages] = mocks.chat.mock.calls[0];
        expect(messages).toHaveLength(4);
        expect(messages[1]).toEqual({ role: 'user', content: 'Первый вопрос' });
    });
});

describe('services/agent (pipeline)', () => {
    it('сохраняет вопрос и ответ в историю', async () => {
        const user = await activeUser();

        const response = await processMessage(user, 'Как оформить отпуск?');

        expect(response).toBe('Ответ агента');

        const history = await Message.find({ agentUserId: user._id }).sort({ createdAt: 1 }).lean();
        expect(history.map(item => item.role)).toEqual(['user', 'assistant']);
        expect(history[0].content).toBe('Как оформить отпуск?');
    });

    it('ищет в Qdrant по роли пользователя', async () => {
        const user = await activeUser();

        await processMessage(user, 'Вопрос');

        const [, options] = mocks.qdrant.search.mock.calls[0];
        expect(options.filter.must[0].match.value).toBe(user.role._id.toString());
    });

    it('переформулирует запрос, когда история непустая', async () => {
        const user = await activeUser();
        await Message.create({ agentUserId: user._id, role: 'user', content: 'Расскажи про отпуск' });

        await processMessage(user, 'А сколько дней?');

        expect(mocks.chat).toHaveBeenCalledTimes(2);
    });

    it('продолжает работу, если переформулирование упало', async () => {
        const user = await activeUser();
        await Message.create({ agentUserId: user._id, role: 'user', content: 'Контекст' });
        mocks.chat.mockRejectedValueOnce(new Error('LLM недоступна'));

        await expect(processMessage(user, 'Вопрос')).resolves.toBe('Ответ агента');
    });

    it('пробрасывает ошибку эмбеддингов и не пишет сообщение в историю', async () => {
        const user = await activeUser();
        mocks.getEmbeddings.mockRejectedValueOnce(new Error('OpenRouter недоступен'));

        await expect(processMessage(user, 'Вопрос')).rejects.toThrow('OpenRouter недоступен');
        expect(await Message.countDocuments()).toBe(0);
    });

    it('пробрасывает ошибку поиска в Qdrant', async () => {
        const user = await activeUser();
        mocks.qdrant.search.mockRejectedValueOnce(new Error('Qdrant недоступен'));

        await expect(processMessage(user, 'Вопрос')).rejects.toThrow('Qdrant недоступен');
        expect(await Message.countDocuments()).toBe(0);
    });

    it('передаёт в ответ не более десяти последних сообщений истории', async () => {
        const user = await activeUser();
        await Message.insertMany(
            Array.from({ length: 15 }, (_, index) => ({
                agentUserId: user._id,
                role: index % 2 === 0 ? 'user' : 'assistant',
                content: `Сообщение ${index}`
            }))
        );

        await processMessage(user, 'Новый вопрос');

        const [messages] = mocks.chat.mock.calls.at(-1);
        expect(messages.length).toBe(12);
    });
});
