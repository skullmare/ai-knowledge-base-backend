const jwt = require('jsonwebtoken');
const mocks = require('../helpers/mocks');

describe('services/auth', () => {
    const authService = require('../../src/services/auth');

    it('выдаёт пару токенов с полезной нагрузкой', () => {
        const { accessToken, refreshToken } = authService.generateTokens({ id: '507f1f77bcf86cd799439011', role: 'admin' });

        expect(jwt.decode(accessToken)).toMatchObject({ id: '507f1f77bcf86cd799439011', role: 'admin' });
        expect(accessToken).not.toBe(refreshToken);
    });

    it('подписывает access и refresh разными секретами', () => {
        const { accessToken } = authService.generateTokens({ id: '1' });

        expect(authService.validateAccessToken(accessToken)).toMatchObject({ id: '1' });
        expect(authService.validateRefreshToken(accessToken)).toBeNull();
    });

    it('возвращает null на повреждённом токене', () => {
        expect(authService.validateAccessToken('broken.token.value')).toBeNull();
        expect(authService.validateRefreshToken('')).toBeNull();
    });

    it('возвращает null на просроченном токене', () => {
        const expired = jwt.sign({ id: '1' }, process.env.JWT_ACCESS_SECRET, { expiresIn: -10 });

        expect(authService.validateAccessToken(expired)).toBeNull();
    });
});

describe('services/agent-user/register', () => {
    const AgentUser = require('../../src/models/agent-user');
    const { registerAgentUser, normalizePhone, phoneVariants } = require('../../src/services/agent-user/register');

    it('приводит телефон к формату +<цифры>', () => {
        expect(normalizePhone('8 (999) 123-45-67')).toBe('+89991234567');
        expect(normalizePhone('')).toBeNull();
    });

    it('перечисляет варианты записи телефона для поиска старых записей', () => {
        expect(phoneVariants('79991234567')).toEqual(['79991234567', '+79991234567']);
    });

    it('создаёт нового пользователя', async () => {
        const result = await registerAgentUser({
            field: 'chatIdTG', chatId: '111', phone: '+79990000001', firstName: 'Иван'
        });

        expect(result.status).toBe('created');
        expect(result.user.chatIdTG).toBe('111');
        expect(result.user.phone).toBe('+79990000001');
        expect(result.user.status).toBe('pending');
    });

    it('отклоняет регистрацию без телефона', async () => {
        const result = await registerAgentUser({ field: 'chatIdTG', chatId: '112', phone: '' });

        expect(result).toEqual({ status: 'invalid', user: null });
        expect(await AgentUser.countDocuments()).toBe(0);
    });

    it('привязывает второй мессенджер к существующей записи по телефону', async () => {
        await registerAgentUser({ field: 'chatIdTG', chatId: '113', phone: '+79990000002' });

        const result = await registerAgentUser({ field: 'chatIdMAX', chatId: '999', phone: '79990000002' });

        expect(result.status).toBe('linked');
        expect(result.user.chatIdTG).toBe('113');
        expect(result.user.chatIdMAX).toBe('999');
        expect(await AgentUser.countDocuments()).toBe(1);
    });

    it('повторную регистрацию того же мессенджера считает existing', async () => {
        await registerAgentUser({ field: 'chatIdTG', chatId: '114', phone: '+79990000003' });

        const result = await registerAgentUser({ field: 'chatIdTG', chatId: '114', phone: '+79990000003' });

        expect(result.status).toBe('existing');
        expect(await AgentUser.countDocuments()).toBe(1);
    });

    it('находит записи, сохранённые до нормализации телефона', async () => {
        await AgentUser.create({ phone: '79990000004', firstName: 'Старый' });

        const result = await registerAgentUser({ field: 'chatIdMAX', chatId: '115', phone: '+79990000004' });

        expect(result.status).toBe('linked');
        expect(await AgentUser.countDocuments()).toBe(1);
    });
});

describe('services/chunker/markdown-chunker', () => {
    const { getMarkdownChunks } = require('../../src/services/chunker/markdown-chunker');

    it('разбивает длинный текст на несколько чанков', async () => {
        const chunks = await getMarkdownChunks('# Заголовок\n\n' + 'Текст абзаца. '.repeat(400));

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => expect(chunk.length).toBeGreaterThan(0));
    });

    it('возвращает один чанк для короткого текста', async () => {
        const chunks = await getMarkdownChunks('# Короткая тема\n\nОдин абзац.');

        expect(chunks).toHaveLength(1);
    });

    it('бросает ошибку на пустом тексте', async () => {
        await expect(getMarkdownChunks('')).rejects.toThrow('чанки не получены');
    });
});

describe('services/qdrant', () => {
    const { syncTopicToQdrant } = require('../../src/services/qdrant/sync-chunk');
    const { deleteTopicFromQdrant } = require('../../src/services/qdrant/delete-chunk');
    const { searchChunks } = require('../../src/services/agent/search');
    const { createTopic, createAgentRole, createTopicCategory } = require('../helpers/factories');

    it('удаляет чанки темы по фильтру topicId', async () => {
        await deleteTopicFromQdrant('507f1f77bcf86cd799439011');

        expect(mocks.qdrant.delete).toHaveBeenCalledWith('knowledge_base_test', expect.objectContaining({
            filter: { must: [{ key: 'metadata.topicId', match: { value: '507f1f77bcf86cd799439011' } }] }
        }));
    });

    it('перед загрузкой чанков удаляет старые', async () => {
        const topic = await createTopic();
        await syncTopicToQdrant(topic);

        expect(mocks.qdrant.delete).toHaveBeenCalled();
        expect(mocks.qdrant.upsert).toHaveBeenCalled();
        expect(mocks.qdrant.delete.mock.invocationCallOrder[0])
            .toBeLessThan(mocks.qdrant.upsert.mock.invocationCallOrder[0]);
    });

    it('кладёт в payload идентификаторы категории и ролей строками', async () => {
        const category = await createTopicCategory();
        const role = await createAgentRole();
        const topic = await createTopic({ category: category._id, roles: [role._id] });

        await syncTopicToQdrant(topic);

        const [, { points }] = mocks.qdrant.upsert.mock.calls[0];
        expect(points[0].payload.metadata).toMatchObject({
            topicId: topic._id.toString(),
            category: category._id.toString(),
            accessibleByRoles: [role._id.toString()]
        });
        expect(points[0].payload.text).toContain(topic.name);
    });

    it('ищет чанки только по роли пользователя', async () => {
        await searchChunks([0.1, 0.2], '507f1f77bcf86cd799439011');

        expect(mocks.qdrant.search).toHaveBeenCalledWith('knowledge_base_test', expect.objectContaining({
            filter: { must: [{ key: 'metadata.accessibleByRoles', match: { value: '507f1f77bcf86cd799439011' } }] },
            with_payload: true
        }));
    });
});

describe('services/yandex/S3', () => {
    const { buildObjectKey, buildPublicUrl, extractKeyFromUrl } = require('../../src/services/yandex/S3/url');
    const { deleteSingleFileFromS3 } = require('../../src/services/yandex/S3/delete');
    const { deleteMultipleFilesFromS3 } = require('../../src/services/yandex/S3/delete-list');

    it('шардирует ключ по первым символам идентификатора', () => {
        const key = buildObjectKey('Договор.PDF');

        expect(key).toMatch(/^uploads\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f-]{36}\.pdf$/);
    });

    it('собирает и разбирает публичный URL без потерь', () => {
        const key = buildObjectKey('file.png');

        expect(extractKeyFromUrl(buildPublicUrl(key))).toBe(key);
    });

    it('возвращает null для чужого URL', () => {
        expect(extractKeyFromUrl('https://example.com/other/file.png')).toBeNull();
        expect(extractKeyFromUrl(null)).toBeNull();
    });

    it('не обращается к S3, если ключ извлечь не удалось', async () => {
        await deleteSingleFileFromS3('https://example.com/unknown.png');

        expect(mocks.s3Send).not.toHaveBeenCalled();
    });

    it('удаляет пачку файлов одним запросом', async () => {
        await deleteMultipleFilesFromS3([buildPublicUrl('uploads/a/b/1.png'), buildPublicUrl('uploads/c/d/2.png')]);

        expect(mocks.s3Send).toHaveBeenCalledTimes(1);
    });

    it('игнорирует пустой список файлов', async () => {
        await deleteMultipleFilesFromS3([]);
        await deleteMultipleFilesFromS3(undefined);

        expect(mocks.s3Send).not.toHaveBeenCalled();
    });

    it('не роняет вызов при ошибке S3', async () => {
        mocks.s3Send.mockRejectedValueOnce(new Error('S3 недоступен'));

        await expect(deleteSingleFileFromS3(buildPublicUrl('uploads/a/b/1.png'))).resolves.toBeUndefined();
    });
});
