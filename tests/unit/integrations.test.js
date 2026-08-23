describe('services/openrouter', () => {
    const mockSend = jest.fn();
    const mockGenerate = jest.fn();

    beforeEach(() => {
        jest.resetModules();
        jest.doMock('../../config/openrouter', () => ({
            chat: { send: mockSend },
            embeddings: { generate: mockGenerate }
        }));
    });

    it('возвращает текст первого варианта ответа модели', async () => {
        mockSend.mockResolvedValueOnce({ choices: [{ message: { content: 'Ответ модели' } }] });
        const { chat } = jest.requireActual('../../src/services/openrouter/chat');

        const result = await chat([{ role: 'user', content: 'Вопрос' }]);

        expect(result).toBe('Ответ модели');
        expect(mockSend).toHaveBeenCalledWith({
            chatGenerationParams: expect.objectContaining({
                messages: [{ role: 'user', content: 'Вопрос' }]
            })
        });
    });

    it('запрашивает эмбеддинги пачкой в формате float', async () => {
        mockGenerate.mockResolvedValueOnce({ data: [{ embedding: [0.1] }, { embedding: [0.2] }] });
        const { getEmbeddings } = jest.requireActual('../../src/services/openrouter/get-embeddings');

        const result = await getEmbeddings(['первый', 'второй']);

        expect(result).toHaveLength(2);
        expect(mockGenerate).toHaveBeenCalledWith({
            requestBody: expect.objectContaining({ input: ['первый', 'второй'], encodingFormat: 'float' })
        });
    });
});

describe('services/telegram/bot', () => {
    const loadBot = () => {
        jest.resetModules();
        return jest.requireActual('../../src/services/telegram/bot');
    };

    it('не запускает бота без токена', () => {
        const savedToken = process.env.TG_BOT_TOKEN;
        delete process.env.TG_BOT_TOKEN;

        const create = jest.fn();
        jest.doMock('../../config/telegram', () => ({ create, get: () => null }));

        try {
            loadBot().initBot();
            expect(create).not.toHaveBeenCalled();
        } finally {
            if (savedToken) process.env.TG_BOT_TOKEN = savedToken;
        }
    });

    it('подписывается на сообщения и ошибки polling', () => {
        process.env.TG_BOT_TOKEN = 'tg-token';
        const bot = { on: jest.fn() };
        jest.doMock('../../config/telegram', () => ({ create: () => bot, get: () => bot }));

        try {
            loadBot().initBot();

            expect(bot.on.mock.calls.map(([event]) => event)).toEqual(['message', 'polling_error']);
        } finally {
            delete process.env.TG_BOT_TOKEN;
        }
    });

    it('не даёт ошибке обработчика уронить процесс', async () => {
        process.env.TG_BOT_TOKEN = 'tg-token';
        const bot = { on: jest.fn() };
        jest.doMock('../../config/telegram', () => ({ create: () => bot, get: () => bot }));
        jest.doMock('../../src/services/telegram/handlers', () => ({
            onMessage: jest.fn().mockRejectedValue(new Error('Сбой обработчика')),
            onContact: jest.fn()
        }));

        try {
            loadBot().initBot();
            const [, onMessage] = bot.on.mock.calls[0];

            await expect(onMessage({ chat: { id: 1 }, text: 'привет' })).resolves.toBeUndefined();
        } finally {
            delete process.env.TG_BOT_TOKEN;
        }
    });
});

describe('services/max/bot', () => {
    const loadBot = () => {
        jest.resetModules();
        return jest.requireActual('../../src/services/max/bot');
    };

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('не запускает бота без токена', () => {
        const create = jest.fn();
        jest.doMock('../../config/max', () => ({ create, get: () => null }));

        loadBot().initMaxBot();

        expect(create).not.toHaveBeenCalled();
    });

    it('опрашивает обновления и разводит их по обработчикам', async () => {
        process.env.MAX_BOT_TOKEN = 'max-token';

        const bot = {
            getUpdates: jest.fn()
                .mockResolvedValueOnce([
                    { update_type: 'message_created', message: { id: 1 } },
                    { update_type: 'message_callback', callback: { id: 2 } }
                ])
                .mockResolvedValue([])
        };
        const onMessage = jest.fn();
        const onCallback = jest.fn();

        jest.doMock('../../config/max', () => ({ create: () => bot, get: () => bot }));
        jest.doMock('../../src/services/max/handlers', () => ({ onMessage, onCallback }));

        try {
            loadBot().initMaxBot();
            await jest.advanceTimersByTimeAsync(1);

            expect(onMessage).toHaveBeenCalledWith({ id: 1 }, bot);
            expect(onCallback).toHaveBeenCalledWith({ id: 2 }, bot);
        } finally {
            delete process.env.MAX_BOT_TOKEN;
        }
    });

    it('повторяет опрос после ошибки сети', async () => {
        process.env.MAX_BOT_TOKEN = 'max-token';

        const bot = {
            getUpdates: jest.fn()
                .mockRejectedValueOnce(new Error('Сеть недоступна'))
                .mockResolvedValue([])
        };

        jest.doMock('../../config/max', () => ({ create: () => bot, get: () => bot }));
        jest.doMock('../../src/services/max/handlers', () => ({ onMessage: jest.fn(), onCallback: jest.fn() }));

        try {
            loadBot().initMaxBot();
            await jest.advanceTimersByTimeAsync(5000);

            expect(bot.getUpdates.mock.calls.length).toBeGreaterThan(1);
        } finally {
            delete process.env.MAX_BOT_TOKEN;
        }
    });
});

describe('services/init-collaboration', () => {
    const loadModule = () => {
        jest.resetModules();
        return jest.requireActual('../../src/services/init-collaboration');
    };

    it('до инициализации сервер совместного редактирования недоступен', () => {
        expect(loadModule().getHocuspocus()).toBeNull();
    });

    // Сам collaboration.mjs — ESM-модуль и грузится динамическим import,
    // который jest без --experimental-vm-modules выполнить не может.
    // Проверяем контракт обёртки: ошибка загрузки пробрасывается наружу,
    // а сервер не остаётся в полуинициализированном состоянии.
    it('пробрасывает ошибку загрузки и не подменяет инстанс', async () => {
        const module = loadModule();

        await expect(module.initHocuspocus()).rejects.toThrow();
        expect(module.getHocuspocus()).toBeNull();
    });
});
