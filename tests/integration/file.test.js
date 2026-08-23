const mocks = require('../helpers/mocks');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const Log = require('../../src/models/log');

const BASE = '/api/v1/files';
const VALID_KEY = 'uploads/ab/cd/0189d0f3-4c2a-4a3b-9c1d-8f0a1b2c3d4e.png';

describe(`POST ${BASE}/presigned-url`, () => {
    it('выдаёт ссылку для прямой загрузки в хранилище', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .post(`${BASE}/presigned-url`)
            .send({ originalName: 'Договор.pdf', mimeType: 'application/pdf' });

        expect(response.status).toBe(200);
        expect(response.body.data.uploadUrl).toContain('https://');
        expect(response.body.data.key).toMatch(/^uploads\/[0-9a-f]{2}\/[0-9a-f]{2}\/.+\.pdf$/);
        expect(response.body.data.url).toContain(response.body.data.key);
        expect(response.body.data.expiresIn).toBe(900);
    });

    it('требует имя файла', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).post(`${BASE}/presigned-url`).send({});

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('originalName');
    });

    it('требует право files.upload', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        const response = await authRequest(token)
            .post(`${BASE}/presigned-url`)
            .send({ originalName: 'file.pdf' });

        expect(response.status).toBe(403);
    });

    it('требует авторизации', async () => {
        expect((await request(app).post(`${BASE}/presigned-url`).send({ originalName: 'a.pdf' })).status).toBe(401);
    });
});

describe(`POST ${BASE}/presigned-complete`, () => {
    it('подтверждает загрузку и возвращает публичный URL', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .post(`${BASE}/presigned-complete`)
            .send({ key: VALID_KEY, originalName: 'Договор.pdf', mimeType: 'application/pdf' });

        expect(response.status).toBe(200);
        expect(response.body.data.url).toContain(VALID_KEY);
        expect(mocks.s3Send).toHaveBeenCalledTimes(1);
        expect(await Log.countDocuments({ action: 'FILE_UPLOAD' })).toBe(1);
    });

    it('возвращает 404, если объекта нет в хранилище', async () => {
        const { token } = await createAuthenticatedUser();
        const notFound = Object.assign(new Error('NotFound'), { name: 'NotFound' });
        mocks.s3Send.mockRejectedValueOnce(notFound);

        const response = await authRequest(token)
            .post(`${BASE}/presigned-complete`)
            .send({ key: VALID_KEY });

        expect(response.status).toBe(404);
    });

    it('отклоняет ключ за пределами каталога загрузок', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .post(`${BASE}/presigned-complete`)
            .send({ key: '../../etc/passwd' });

        expect(response.status).toBe(400);
        expect(mocks.s3Send).not.toHaveBeenCalled();
    });

    it('требует ключ файла', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).post(`${BASE}/presigned-complete`).send({})).status).toBe(400);
    });
});

describe(`POST ${BASE}/upload`, () => {
    it('загружает файл в хранилище', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .post(`${BASE}/upload`)
            .attach('file', Buffer.from('содержимое файла'), 'notes.txt');

        expect(response.status).toBe(201);
        expect(response.body.data.originalName).toBe('notes.txt');
        expect(response.body.data.url).toMatch(/^https:\/\/storage\.yandexcloud\.net\/test-bucket\/uploads\//);
        expect(mocks.s3Send).toHaveBeenCalledTimes(1);
    });

    it('возвращает 400, если файл не приложен', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).post(`${BASE}/upload`);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('file');
    });

    it('возвращает 500 и пишет ошибку в журнал, если хранилище недоступно', async () => {
        const { token } = await createAuthenticatedUser();
        mocks.s3Send.mockRejectedValueOnce(new Error('S3 недоступен'));

        const response = await authRequest(token)
            .post(`${BASE}/upload`)
            .attach('file', Buffer.from('данные'), 'notes.txt');

        expect(response.status).toBe(500);
        expect(await Log.countDocuments({ action: 'FILE_UPLOAD', status: 'error' })).toBe(1);
    });

    it('требует право files.upload', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        const response = await authRequest(token)
            .post(`${BASE}/upload`)
            .attach('file', Buffer.from('данные'), 'notes.txt');

        expect(response.status).toBe(403);
    });
});
