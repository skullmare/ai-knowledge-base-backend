// constants/actions.js

const ACTIONS_CONFIG = {
    PLATFORM_USERS: {
        label: "Сотрудники",
        entity: 'PlatformUser',
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
        actions: {
            CREATE: { key: 'AGENT_USER_CREATE', label: 'Добавление пользователя ИИ' },
            UPDATE: { key: 'AGENT_USER_UPDATE', label: 'Изменение прав пользователя ИИ' },
            DELETE: { key: 'AGENT_USER_DELETE', label: 'Удаление пользователя ИИ' },
            SERVER_ERROR: { key: 'AGENT_USER_ERROR', label: 'Ошибка в модуле пользователей ИИ' },
        }
    },
    TOPICS: {
        label: "База знаний (Темы)",
        entity: 'Topic',
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
        actions: {
            CREATE: { key: 'CATEGORY_CREATE', label: 'Создание категории' },
            UPDATE: { key: 'CATEGORY_UPDATE', label: 'Редактирование категории' },
            DELETE: { key: 'CATEGORY_DELETE', label: 'Удаление категории' },
            SERVER_ERROR: { key: 'CATEGORY_ERROR', label: 'Ошибка в модуле категорий' },
        }
    },
    ROLES: {
        label: "Роли платформы",
        entity: 'Role',
        actions: {
            CREATE: { key: 'ROLE_CREATE', label: 'Создание роли' },
            UPDATE: { key: 'ROLE_UPDATE', label: 'Редактирование роли' },
            DELETE: { key: 'ROLE_DELETE', label: 'Удаление роли' },
        }
    },
    AGENT_ROLES: {
        label: "Роли пользователей ИИ агента",
        entity: 'AgentRole',
        actions: {
            CREATE: { key: 'AGENT_ROLE_CREATE', label: 'Создание роли пользователя ИИ агента' },
            UPDATE: { key: 'AGENT_ROLE_UPDATE', label: 'Редактирование роли пользователя ИИ агента' },
            DELETE: { key: 'AGENT_ROLE_DELETE', label: 'Удаление роли пользователя ИИ агента' },
        }
    },
    SYSTEM_SETTINGS: {
        label: "Настройки системы",
        entity: 'SystemSetting',
        actions: {
            CREATE: { key: 'SYSTEM_SETTING_CREATE', label: 'Добавление настройки' },
            UPDATE: { key: 'SYSTEM_SETTING_UPDATE', label: 'Изменение настройки' },
            DELETE: { key: 'SYSTEM_SETTING_DELETE', label: 'Удаление настройки' },
        }
    },
    AUTH: {
        label: "Авторизация",
        entity: 'PlatformUser',
        actions: {
            LOGIN_SUCCESS: { key: 'AUTH_LOGIN_SUCCESS', label: 'Успешный вход' },
            LOGIN_FAILED: { key: 'AUTH_LOGIN_FAILED', label: 'Неудачный вход' },
            REFRESH_INVALID: { key: 'AUTH_REFRESH_INVALID', label: 'Ошибка обновления токена' },
            SERVER_ERROR: { key: 'AUTH_SERVER_ERROR', label: 'Системная ошибка авторизации' },
        }
    },
    INFRASTRUCTURE: {
        label: "Инфраструктура",
        entity: 'System',
        actions: {
            FILE_UPLOAD: { key: 'FILE_UPLOAD', label: 'Загрузка файла' },
            SERVER_ERROR: { key: 'SYSTEM_SERVER_ERROR', label: 'Критическая системная ошибка' },
        }
    }
};

/**
 * Вспомогательные переменные для логики приложения
 */

// 1. Плоский массив всех ключей для Mongoose enum
const ALL_ACTIONS = Object.values(ACTIONS_CONFIG)
    .flatMap(group => Object.values(group.actions).map(action => action.key));

// 2. Карта Action -> Entity для автоматического определения типа сущности в logHandler
const ACTION_TO_ENTITY_MAP = Object.values(ACTIONS_CONFIG).reduce((map, group) => {
    Object.values(group.actions).forEach(act => {
        map[act.key] = group.entity;
    });
    return map;
}, {});

// 3. Форматированный список для отображения фильтров в UI
const getActionsForUI = () => {
    return Object.keys(ACTIONS_CONFIG).map(key => ({
        group: ACTIONS_CONFIG[key].label,
        actions: Object.values(ACTIONS_CONFIG[key].actions)
    }));
};

module.exports = { 
    ACTIONS_CONFIG, 
    ALL_ACTIONS, 
    ACTION_TO_ENTITY_MAP, 
    getActionsForUI 
};