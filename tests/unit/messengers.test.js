const mocks = require('../helpers/mocks');
const AgentUser = require('../../src/models/agent-user');
const telegram = require('../../src/services/telegram/handlers');
const max = require('../../src/services/max/handlers');
const { createAgentRole, createAgentUser } = require('../helpers/factories');

const tgMessage = (overrides = {}) => ({
    chat: { id: 500 },
    from: { id: 500, first_name: 'Иван' },
    text: 'Вопрос',
    ...overrides
});

const maxMessage = (overrides = {}) => ({
    sender: { user_id: 700, name: 'Иван Иванов' },
    recipient: { chat_id: 800 },
    body: { text: 'Вопрос' },
    ...overrides
});

const lastTelegramText = () => mocks.telegramBot.sendMessage.mock.calls.at(-1)[1];
const lastMaxText = () => mocks.maxBot.sendMessageToChat.mock.calls.at(-1)[1];

describe('telegram/handlers', () => {
    it('просит номер телефона у незнакомого пользователя', async () => {
        await telegram.onMessage(tgMessage({ text: '/start' }), mocks.telegramBot);

        expect(lastTelegramText()).toMatch(/поделитесь своим номером телефона/i);
    });

    it('сообщает об отсутствии прав пользователю без роли', async () => {
        await createAgentUser({ chatIdTG: '500', role: null });

        await telegram.onMessage(tgMessage(), mocks.telegramBot);

        expect(lastTelegramText()).toMatch(/нет прав доступа/i);
    });

    it('сообщает о блокировке', async () => {
        const role = await createAgentRole();
        await createAgentUser({ chatIdTG: '500', role: role._id, status: 'blocked' });

        await telegram.onMessage(tgMessage(), mocks.telegramBot);

        expect(lastTelegramText()).toMatch(/заблокирован/i);
    });

    it('отвечает пользователю с ролью и считает запросы', async () => {
        const role = await createAgentRole();
        const user = await createAgentUser({ chatIdTG: '500', role: role._id, status: 'active' });

        await telegram.onMessage(tgMessage(), mocks.telegramBot);

        expect(lastTelegramText()).toBe('Ответ агента');
        expect((await AgentUser.findById(user._id)).requestsCount).toBe(1);
    });

    it('отдаёт понятное сообщение, если агент упал', async () => {
        const role = await createAgentRole();
        await createAgentUser({ chatIdTG: '500', role: role._id, status: 'active' });
        mocks.qdrant.search.mockRejectedValueOnce(new Error('Qdrant недоступен'));

        await telegram.onMessage(tgMessage(), mocks.telegramBot);

        expect(lastTelegramText()).toMatch(/ошибка при обработке/i);
    });

    it('регистрирует пользователя по контакту', async () => {
        await telegram.onContact(tgMessage({
            contact: { user_id: 500, phone_number: '79991112233', first_name: 'Иван' }
        }), mocks.telegramBot);

        const user = await AgentUser.findOne({ chatIdTG: '500' });
        expect(user.phone).toBe('+79991112233');
        expect(lastTelegramText()).toMatch(/успешно зарегистрированы/i);
    });

    it('отклоняет чужой контакт', async () => {
        await telegram.onContact(tgMessage({
            contact: { user_id: 999, phone_number: '79991112233' }
        }), mocks.telegramBot);

        expect(await AgentUser.countDocuments()).toBe(0);
        expect(lastTelegramText()).toMatch(/собственным номером/i);
    });
});

describe('max/handlers', () => {
    it('просит номер телефона у незнакомого пользователя', async () => {
        await max.onMessage(maxMessage({ body: { text: '/start' } }), mocks.maxBot);

        expect(lastMaxText()).toMatch(/поделитесь своим номером телефона/i);
    });

    it('отвечает пользователю с ролью', async () => {
        const role = await createAgentRole();
        await createAgentUser({ chatIdTG: null, chatIdMAX: '700', role: role._id, status: 'active' });

        await max.onMessage(maxMessage(), mocks.maxBot);

        expect(lastMaxText()).toBe('Ответ агента');
        expect(mocks.maxBot.sendTyping).toHaveBeenCalledWith(800);
    });

    it('регистрирует пользователя по vcf-контакту', async () => {
        await max.onMessage(maxMessage({
            body: {
                text: '',
                attachments: [{ type: 'contact', payload: { vcf_info: 'BEGIN:VCARD\nTEL;CELL:+79994445566\nEND:VCARD' } }]
            }
        }), mocks.maxBot);

        const user = await AgentUser.findOne({ chatIdMAX: '700' });
        expect(user.phone).toBe('+79994445566');
        expect(user.firstName).toBe('Иван');
        expect(user.lastName).toBe('Иванов');
    });

    it('регистрирует пользователя по callback с телефоном', async () => {
        await max.onCallback({
            user: { user_id: 701, name: 'Пётр Петров' },
            message: { recipient: { chat_id: 801 } },
            payload: '+79995556677'
        }, mocks.maxBot);

        expect(await AgentUser.findOne({ chatIdMAX: '701' })).not.toBeNull();
    });

    it('игнорирует callback без телефона', async () => {
        await max.onCallback({ user: { user_id: 702, name: 'Без телефона' }, payload: 'ping' }, mocks.maxBot);

        expect(await AgentUser.countDocuments()).toBe(0);
    });
});

describe('services/agent-user/notify', () => {
    const { notifyAccessGranted, ACCESS_GRANTED_TEXT } = require('../../src/services/agent-user/notify');

    it('уведомляет во всех привязанных мессенджерах', async () => {
        await notifyAccessGranted({ chatIdTG: '500', chatIdMAX: '700' });

        expect(mocks.telegramBot.sendMessage).toHaveBeenCalledWith('500', ACCESS_GRANTED_TEXT);
        expect(mocks.maxBot.sendMessageToUser).toHaveBeenCalledWith('700', ACCESS_GRANTED_TEXT);
    });

    it('не падает, если мессенджер вернул ошибку', async () => {
        mocks.telegramBot.sendMessage.mockRejectedValueOnce(new Error('Telegram недоступен'));

        await expect(notifyAccessGranted({ chatIdTG: '500' })).resolves.toBeUndefined();
    });
});
