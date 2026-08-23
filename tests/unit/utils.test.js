const httpMocks = () => {
    const res = {
        statusCode: null,
        payload: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.payload = body; return this; }
    };
    return res;
};

describe('utils/error-handler', () => {
    const sendError = require('../../src/utils/error-handler');

    it('возвращает единый формат ошибки', () => {
        const res = httpMocks();
        sendError(res, 400, 'Ошибка валидации', [{ path: 'name', message: 'Обязательно' }]);

        expect(res.statusCode).toBe(400);
        expect(res.payload).toEqual({
            success: false,
            message: 'Ошибка валидации',
            errors: [{ path: 'name', message: 'Обязательно' }]
        });
    });

    it('по умолчанию отдаёт пустой список ошибок', () => {
        const res = httpMocks();
        sendError(res, 500, 'Ошибка сервера');

        expect(res.payload.errors).toEqual([]);
    });
});

describe('utils/success-handler', () => {
    const sendSuccess = require('../../src/utils/success-handler');

    it('возвращает данные без блока пагинации', () => {
        const res = httpMocks();
        sendSuccess(res, 200, 'Готово', { id: 1 });

        expect(res.statusCode).toBe(200);
        expect(res.payload).toEqual({ success: true, message: 'Готово', data: { id: 1 } });
        expect(res.payload).not.toHaveProperty('pagination');
    });

    it('добавляет пагинацию, когда она передана', () => {
        const res = httpMocks();
        sendSuccess(res, 200, 'Список', [], { total: 0, current: 1, limit: 10, pages: 0 });

        expect(res.payload.pagination).toEqual({ total: 0, current: 1, limit: 10, pages: 0 });
    });
});

describe('utils/password-handler', () => {
    const { hashPassword, comparePassword } = require('../../src/utils/password-handler');

    it('хеширует пароль и подтверждает совпадение', async () => {
        const hash = await hashPassword('SuperSecret123');

        expect(hash).not.toBe('SuperSecret123');
        await expect(comparePassword('SuperSecret123', hash)).resolves.toBe(true);
    });

    it('отклоняет неверный пароль', async () => {
        const hash = await hashPassword('SuperSecret123');

        await expect(comparePassword('WrongPassword', hash)).resolves.toBe(false);
    });

    it('каждый раз выдаёт разную соль', async () => {
        const [first, second] = await Promise.all([hashPassword('same'), hashPassword('same')]);

        expect(first).not.toBe(second);
    });
});

describe('utils/query-helpers', () => {
    const { escapeRegex, searchRegex, buildPagination } = require('../../src/utils/query-helpers');

    it('экранирует спецсимволы регулярных выражений', () => {
        expect(escapeRegex('a+b(c)')).toBe('a\\+b\\(c\\)');
    });

    it('ищет спецсимволы как обычный текст', () => {
        const pattern = searchRegex('a+b');

        expect(pattern.test('a+b')).toBe(true);
        expect(pattern.test('aab')).toBe(false);
    });

    it('регистронезависим', () => {
        expect(searchRegex('иван').test('ИВАНОВ')).toBe(true);
    });

    it('считает количество страниц с округлением вверх', () => {
        expect(buildPagination(25, 2, 10)).toEqual({ total: 25, current: 2, limit: 10, pages: 3 });
    });

    it('не делит на ноль при нулевом лимите', () => {
        expect(buildPagination(5, 1, 0).pages).toBe(0);
    });
});

describe('utils/log-handler', () => {
    const logHandler = require('../../src/utils/log-handler');
    const Log = require('../../src/models/log');

    it('подставляет сущность и категорию по коду события', async () => {
        await logHandler({ action: 'TOPIC_CREATE', message: 'Создана тема' });

        const log = await Log.findOne({ action: 'TOPIC_CREATE' }).lean();
        expect(log).toMatchObject({ entityType: 'Topic', category: 'TOPICS', status: 'success' });
    });

    it('не бросает исключение на неизвестном событии', async () => {
        await expect(logHandler({ action: 'UNKNOWN_ACTION', message: 'x' })).resolves.toBeUndefined();
        expect(await Log.countDocuments()).toBe(0);
    });
});

describe('constants', () => {
    const { ALL_ACTIONS, ACTION_TO_ENTITY_MAP, ACTION_LABEL_MAP, getActionsForUI } = require('../../src/constants/actions');
    const { ALL_PERMISSIONS, getPermissionsForUI } = require('../../src/constants/permissions');

    it('не содержит дублирующихся кодов событий', () => {
        expect(new Set(ALL_ACTIONS).size).toBe(ALL_ACTIONS.length);
    });

    it('сопоставляет каждому событию сущность и человекочитаемое имя', () => {
        ALL_ACTIONS.forEach(action => {
            expect(ACTION_TO_ENTITY_MAP[action]).toBeTruthy();
            expect(ACTION_LABEL_MAP[action]).toBeTruthy();
        });
    });

    it('не содержит дублирующихся прав', () => {
        expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    });

    it('отдаёт справочники для UI сгруппированными', () => {
        expect(getActionsForUI()[0]).toHaveProperty('group');
        expect(getPermissionsForUI()[0]).toHaveProperty('actions');
    });
});
