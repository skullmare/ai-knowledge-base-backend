const WebSocket = require('ws');
const { app } = require('../helpers/request');

const listen = () => new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
});

const connect = (port) => new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/collaboration`);

    socket.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    socket.on('error', reject);
});

describe('WS /api/v1/collaboration', () => {
    let server;

    beforeAll(async () => {
        server = await listen();
    });

    afterAll(async () => {
        await new Promise(resolve => server.close(resolve));
    });

    // getHocuspocus замокан на null: проверяем, что соединение закрывается
    // управляемо, а не роняет процесс обращением к неинициализированному серверу.
    it('закрывает соединение, пока сервер совместного редактирования не готов', async () => {
        const { code, reason } = await connect(server.address().port);

        expect(code).toBe(1011);
        expect(reason).toBe('Hocuspocus not ready');
    });
});

describe('config клиентов внешних сервисов', () => {
    it('создаёт клиент OpenRouter с ключом из окружения', () => {
        jest.resetModules();
        const constructor = jest.fn();

        jest.doMock('@openrouter/sdk', () => ({
            OpenRouter: class {
                constructor(options) {
                    constructor(options);
                }
            }
        }));

        process.env.OPENROUTER_API_KEY = 'openrouter-key';
        jest.requireActual('../../config/openrouter');

        expect(constructor).toHaveBeenCalledWith({ apiKey: 'openrouter-key' });
    });

    it('создаёт S3-клиент Yandex Cloud с нужным регионом и эндпоинтом', () => {
        jest.resetModules();
        const constructor = jest.fn();

        jest.doMock('@aws-sdk/client-s3', () => ({
            S3Client: class {
                constructor(options) {
                    constructor(options);
                }
            }
        }));

        process.env.YANDEX_ACCESS_KEY_ID = 'yc-key';
        process.env.YANDEX_SECRET_ACCESS_KEY = 'yc-secret';
        jest.requireActual('../../config/yandexcloud');

        expect(constructor).toHaveBeenCalledWith(expect.objectContaining({
            region: 'ru-central1',
            endpoint: 'https://storage.yandexcloud.net',
            credentials: { accessKeyId: 'yc-key', secretAccessKey: 'yc-secret' }
        }));
    });
});
