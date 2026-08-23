require('./env');

const mongoose = require('mongoose');
const mocks = require('./helpers/mocks');

jest.setTimeout(30000);

jest.mock('../src/services/email/send-email', () => ({ sendEmail: mocks.sendEmail }));
// getSignedUrl подписывает запрос настоящим клиентом, поэтому мокируем
// только сетевой вызов send, оставляя конфигурацию и подпись реальными.
jest.mock('../config/yandexcloud', () => {
    const { S3Client } = require('@aws-sdk/client-s3');

    const s3Client = new S3Client({
        region: 'ru-central1',
        endpoint: 'https://storage.yandexcloud.net',
        credentials: { accessKeyId: 'test-key-id', secretAccessKey: 'test-secret' }
    });

    s3Client.send = mocks.s3Send;

    return { s3Client };
});
jest.mock('../config/qdrant', () => ({
    qdrantClient: mocks.qdrant,
    getQdrantClient: () => mocks.qdrant,
    collectionName: 'knowledge_base_test'
}));
jest.mock('../src/services/openrouter/chat', () => ({ chat: mocks.chat }));
jest.mock('../src/services/openrouter/get-embeddings', () => ({ getEmbeddings: mocks.getEmbeddings }));
jest.mock('../src/services/telegram/bot', () => ({ initBot: jest.fn(), getBot: () => mocks.telegramBot }));
jest.mock('../src/services/max/bot', () => ({ initMaxBot: jest.fn(), getBot: () => mocks.maxBot }));
jest.mock('../src/services/init-collaboration', () => ({
    initHocuspocus: jest.fn(),
    getHocuspocus: () => null
}));

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST);
});

// Каждый тест стартует с чистой базой — иначе порядок файлов
// начинает влиять на результат.
afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map(collection => collection.deleteMany({})));
});

afterAll(async () => {
    await mongoose.connection.close();
});
