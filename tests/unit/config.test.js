describe('config/mongo', () => {
    // Успешный connectDB здесь не проверяется: он открыл бы вторую связь
    // с Mongo поверх общей тестовой, и jest не смог бы завершиться.
    const loadMongoConfig = () => {
        jest.resetModules();
        return jest.requireActual('../../config/mongo');
    };

    it('останавливает процесс, если подключиться не удалось', async () => {
        const savedUri = process.env.MONGODB_URI;
        process.env.MONGODB_URI = 'not-a-mongo-uri';

        const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const { connectDB } = loadMongoConfig();

        try {
            await connectDB();
            expect(exit).toHaveBeenCalledWith(1);
        } finally {
            exit.mockRestore();
            process.env.MONGODB_URI = savedUri;
        }
    });
});

describe('config/telegram', () => {
    const mockTelegramBot = jest.fn();

    beforeEach(() => {
        jest.resetModules();
        jest.doMock('node-telegram-bot-api', () => mockTelegramBot);
    });

    it('до создания бот недоступен', () => {
        const telegram = require('../../config/telegram');

        expect(telegram.get()).toBeNull();
    });

    it('создаёт бота с polling и отдаёт тот же инстанс', () => {
        const telegram = require('../../config/telegram');

        const bot = telegram.create('token-123');

        expect(mockTelegramBot).toHaveBeenCalledWith('token-123', { polling: true });
        expect(telegram.get()).toBe(bot);
    });
});

describe('config/max', () => {
    const mockAxios = { get: jest.fn(), post: jest.fn() };

    let max;

    beforeEach(() => {
        jest.resetModules();
        jest.doMock('axios', () => mockAxios);
        mockAxios.get.mockResolvedValue({ data: { updates: [], marker: 42 } });
        mockAxios.post.mockResolvedValue({ data: {} });
        max = require('../../config/max');
    });

    it('запрашивает обновления и запоминает marker', async () => {
        const client = max.create('token-abc');

        await client.getUpdates();
        await client.getUpdates();

        expect(mockAxios.get.mock.calls[0][1].params.marker).toBeUndefined();
        expect(mockAxios.get.mock.calls[1][1].params.marker).toBe(42);
        expect(mockAxios.get.mock.calls[0][1].headers.Authorization).toBe('token-abc');
    });

    it('возвращает пустой список, если обновлений нет', async () => {
        mockAxios.get.mockResolvedValueOnce({ data: {} });
        const client = max.create('token-abc');

        await expect(client.getUpdates()).resolves.toEqual([]);
    });

    it('отправляет сообщение пользователю', async () => {
        const client = max.create('token-abc');

        await client.sendMessageToUser('700', 'Привет');

        const [url, body, options] = mockAxios.post.mock.calls[0];
        expect(url).toContain('/messages');
        expect(body).toEqual({ text: 'Привет' });
        expect(options.params).toEqual({ user_id: '700' });
    });

    it('прикладывает вложения только когда они есть', async () => {
        const client = max.create('token-abc');

        await client.sendMessageToChat('800', 'Текст', [{ type: 'inline_keyboard' }]);

        expect(mockAxios.post.mock.calls[0][1].attachments).toHaveLength(1);
    });

    it('не роняет вызов, если индикатор набора не отправился', async () => {
        mockAxios.post.mockRejectedValueOnce(new Error('MAX недоступен'));
        const client = max.create('token-abc');

        await expect(client.sendTyping('800')).resolves.toBeUndefined();
    });

    it('отдаёт последний созданный клиент', () => {
        const client = max.create('token-abc');

        expect(max.get()).toBe(client);
    });
});

describe('config/qdrant', () => {
    it('создаёт клиент лениво и переиспользует его', () => {
        jest.resetModules();
        const constructor = jest.fn();

        jest.doMock('@qdrant/js-client-rest', () => ({
            QdrantClient: class {
                constructor(options) {
                    constructor(options);
                }
            }
        }));

        const { getQdrantClient } = jest.requireActual('../../config/qdrant');

        expect(constructor).not.toHaveBeenCalled();

        const first = getQdrantClient();
        const second = getQdrantClient();

        expect(first).toBe(second);
        expect(constructor).toHaveBeenCalledWith(expect.objectContaining({
            url: process.env.QDRANT_URL,
            port: null
        }));
    });
});
