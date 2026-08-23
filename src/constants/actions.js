// constants/actions.js

const ACTIONS_CONFIG = {
    PLATFORM_USERS: {
        label: "Сотрудники",
        entity: 'PlatformUser',
        category: 'PLATFORM_USERS',
        actions: {
            CREATE: { key: 'PLATFORM_USER_CREATE', label: 'Добавление сотрудника' },
            UPDATE: { key: 'PLATFORM_USER_UPDATE', label: 'Редактирование данных сотрудника' },
            DELETE: { key: 'PLATFORM_USER_DELETE', label: 'Удаление сотрудника' },
            SERVER_ERROR: { key: 'PLATFORM_USER_ERROR', label: 'Ошибка в модуле сотрудников' },
        }
    },
    AGENT_USERS: {
        label: "Пользователи ИИ",
        entity: 'AgentUser',
        category: 'AGENT_USERS',
        actions: {
            READ: { key: 'AGENT_USER_READ', label: 'Получение пользователей ИИ' },
            CREATE: { key: 'AGENT_USER_CREATE', label: 'Добавление пользователя ИИ' },
            UPDATE: { key: 'AGENT_USER_UPDATE', label: 'Обновление пользователя ИИ' },
            DELETE: { key: 'AGENT_USER_DELETE', label: 'Удаление пользователя ИИ' },
            SERVER_ERROR: { key: 'AGENT_USER_ERROR', label: 'Ошибка в модуле пользователей ИИ' },
        }
    },
    TOPICS: {
        label: "База знаний (Темы)",
        entity: 'Topic',
        category: 'TOPICS',
        actions: {
            CREATE: { key: 'TOPIC_CREATE', label: 'Создание темы' },
            UPDATE: { key: 'TOPIC_UPDATE', label: 'Редактирование темы' },
            DELETE: { key: 'TOPIC_DELETE', label: 'Удаление темы' },
            APPROVE: { key: 'TOPIC_APPROVE', label: 'Одобрение и векторизация' },
            CLEANUP_ERROR: { key: 'TOPIC_CLEANUP_ERROR', label: 'Ошибка очистки S3/Qdrant' },
            SERVER_ERROR: { key: 'TOPIC_ERROR', label: 'Критическая ошибка темы' },
        }
    },
    TOPIC_CATEGORIES: {
        label: "Категории",
        entity: 'TopicCategory',
        category: 'TOPIC_CATEGORIES',
        actions: {
            CREATE: { key: 'CATEGORY_CREATE', label: 'Создание категории' },
            UPDATE: { key: 'CATEGORY_UPDATE', label: 'Редактирование категории' },
            DELETE: { key: 'CATEGORY_DELETE', label: 'Удаление категории' },
            SERVER_ERROR: { key: 'CATEGORY_ERROR', label: 'Ошибка в модуле категорий' },
        }
    },
    PLATFORM_ROLES: {
        label: "Роли платформы",
        entity: 'PlatformRole',
        category: 'PLATFORM_ROLES',
        actions: {
            CREATE: { key: 'PLATFORM_ROLE_CREATE', label: 'Создание роли' },
            UPDATE: { key: 'PLATFORM_ROLE_UPDATE', label: 'Редактирование роли' },
            DELETE: { key: 'PLATFORM_ROLE_DELETE', label: 'Удаление роли' },
            DELETE_MANY: { key: 'PLATFORM_ROLE_DELETE_MANY', label: 'Удаление нескольких ролей' },
        }
    },
    AGENT_ROLES: {
        label: "Роли пользователей ИИ агента",
        entity: 'AgentRole',
        category: 'AGENT_ROLES',
        actions: {
            CREATE: { key: 'AGENT_ROLE_CREATE', label: 'Создание роли пользователя ИИ агента' },
            UPDATE: { key: 'AGENT_ROLE_UPDATE', label: 'Редактирование роли пользователя ИИ агента' },
            DELETE: { key: 'AGENT_ROLE_DELETE', label: 'Удаление роли пользователя ИИ агента' },
        }
    },
    SYSTEM_SETTINGS: {
        label: "Настройки системы",
        entity: 'SystemSetting',
        category: 'SYSTEM_SETTINGS',
        actions: {
            CREATE: { key: 'SYSTEM_SETTING_CREATE', label: 'Добавление настройки' },
            UPDATE: { key: 'SYSTEM_SETTING_UPDATE', label: 'Изменение настройки' },
            DELETE: { key: 'SYSTEM_SETTING_DELETE', label: 'Удаление настройки' },
        }
    },
    AUTH: {
        label: "Авторизация",
        entity: 'PlatformUser',
        category: 'AUTH',
        actions: {
            LOGIN_SUCCESS: { key: 'AUTH_LOGIN_SUCCESS', label: 'Успешный вход' },
            LOGIN_FAILED: { key: 'AUTH_LOGIN_FAILED', label: 'Неудачный вход' },
            REFRESH_INVALID: { key: 'AUTH_REFRESH_INVALID', label: 'Ошибка обновления токена' },
            SERVER_ERROR: { key: 'AUTH_SERVER_ERROR', label: 'Системная ошибка авторизации' },
            TWO_FACTOR_SENT: { key: 'AUTH_TWO_FACTOR_SENT', label: 'Код двухфакторной аутентификации отправлен' },
            TWO_FACTOR_SUCCESS: { key: 'AUTH_TWO_FACTOR_SUCCESS', label: 'Двухфакторная аутентификация пройдена' },
            TWO_FACTOR_FAILED: { key: 'AUTH_TWO_FACTOR_FAILED', label: 'Неверный код двухфакторной аутентификации' },
            TWO_FACTOR_EXPIRED: { key: 'AUTH_TWO_FACTOR_EXPIRED', label: 'Код двухфакторной аутентификации истёк' },
        }
    },
    INFRASTRUCTURE: {
        label: "Инфраструктура",
        entity: 'System',
        category: 'INFRASTRUCTURE',
        actions: {
            FILE_UPLOAD: { key: 'FILE_UPLOAD', label: 'Загрузка файла' },
            SERVER_ERROR: { key: 'SYSTEM_SERVER_ERROR', label: 'Критическая системная ошибка' },
        }
    },
    PROFILE: {
        label: "Личный профиль",
        entity: 'PlatformUser',
        category: 'PROFILE',
        actions: {
            UPDATE: { key: 'PROFILE_UPDATE', label: 'Обновление личных данных' },
            SERVER_ERROR: { key: 'PROFILE_ERROR', label: 'Ошибка в модуле профиля' },
        }
    },
    PASSWORD: {
        label: "Пароль",
        entity: 'PlatformUser',
        category: 'PASSWORD',
        actions: {
            PASSWORD_RESET_REQUEST: { key: 'AUTH_PASSWORD_RESET_REQUEST', label: 'Запрос на восстановление пароля' },
            PASSWORD_RESET_SUCCESS: { key: 'AUTH_PASSWORD_RESET_SUCCESS', label: 'Пароль успешно восстановлен' },
            PASSWORD_CHANGE: { key: 'PROFILE_PASSWORD_CHANGE', label: 'Смена пароля' },
            SERVER_ERROR: { key: 'PROFILE_ERROR', label: 'Ошибка в модуле профиля' },
        }
    },
};

const ALL_ACTIONS = Object.values(ACTIONS_CONFIG)
    .flatMap(group => Object.values(group.actions).map(action => action.key));


const ALL_CATEGORY = Object.values(ACTIONS_CONFIG)
    .map(group => group.category);

const ACTION_TO_ENTITY_MAP = Object.values(ACTIONS_CONFIG).reduce((map, group) => {
    Object.values(group.actions).forEach(act => {
        map[act.key] = group.entity;
    });
    return map;
}, {});

const ACTION_TO_CATEGORY_MAP = Object.values(ACTIONS_CONFIG).reduce((map, group) => {
    Object.values(group.actions).forEach(act => {
        map[act.key] = group.category;
    });
    return map;
}, {});

// action key → human-readable label (e.g. 'TOPIC_CREATE' → 'Создание темы')
const ACTION_LABEL_MAP = Object.values(ACTIONS_CONFIG).reduce((map, group) => {
    Object.values(group.actions).forEach(act => {
        map[act.key] = act.label;
    });
    return map;
}, {});

// action key → group label (e.g. 'TOPIC_CREATE' → 'База знаний (Темы)')
const ACTION_GROUP_LABEL_MAP = Object.values(ACTIONS_CONFIG).reduce((map, group) => {
    Object.values(group.actions).forEach(act => {
        map[act.key] = group.label;
    });
    return map;
}, {});

const getActionsForUI = () => {
    return Object.keys(ACTIONS_CONFIG).map(key => ({
        category: ACTIONS_CONFIG[key].category,
        group: ACTIONS_CONFIG[key].label,
        actions: Object.values(ACTIONS_CONFIG[key].actions)
    }));
};

module.exports = {
    ACTIONS_CONFIG,
    ALL_ACTIONS,
    ALL_CATEGORY,
    ACTION_TO_ENTITY_MAP,
    ACTION_TO_CATEGORY_MAP,
    ACTION_LABEL_MAP,
    ACTION_GROUP_LABEL_MAP,
    getActionsForUI
};