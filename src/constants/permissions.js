const PERMISSIONS_CONFIG = {
    PLATFORM_USERS: {
        label: "Сотрудники",
        actions: {
            READ: { key: 'platformUsers.read', label: 'Просмотр списка сотрудников' },
            CREATE: { key: 'platformUsers.create', label: 'Добавление новых сотрудников' },
            UPDATE: { key: 'platformUsers.update', label: 'Редактирование данных сотрудников' },
            DELETE: { key: 'platformUsers.delete', label: 'Удаление сотрудников из системы' },
        }
    },
    AGENT_USERS: {
        label: "Пользователи",
        actions: {
            READ: { key: 'agentUsers.read', label: 'Просмотр списка пользователей ИИ агента' },
            CREATE: { key: 'agentUsers.create', label: 'Добавление новых пользователей ИИ агента' },
            UPDATE: { key: 'agentUsers.update', label: 'Управление правами доступа к ИИ агенту' },
            DELETE: { key: 'agentUsers.delete', label: 'Удаление пользователей ИИ агента' },
        }
    },
    TOPICS: {
        label: "База знаний",
        actions: {
            READ: { key: 'topics.read', label: 'Просмотр тем и контента' },
            CREATE: { key: 'topics.create', label: 'Создание новых тем' },
            UPDATE: { key: 'topics.update', label: 'Редактирование существующих тем' },
            ARCHIVE: { key: 'topics.archive', label: 'Архивация устаревших тем' },
            DELETE: { key: 'topics.delete', label: 'Полное удаление тем' },
            APPROVE: { key: 'topics.approve', label: 'Модерация и векторизация тем' },
        }
    },
    TOPIC_CATEGORIES: {
        label: "Категории базы знаний",
        actions: {
            READ: { key: 'topicCategories.read', label: 'Просмотр списка категорий' },
            CREATE: { key: 'topicCategories.create', label: 'Создание новых категорий' },
            UPDATE: { key: 'topicCategories.update', label: 'Редактирование категорий' },
            DELETE: { key: 'topicCategories.delete', label: 'Удаление категорий' },
        }
    },
    ROLES: {
        label: "Роли",
        actions: {
            READ: { key: 'role.read', label: 'Просмотр списка ролей' },
            CREATE: { key: 'role.create', label: 'Создание новых ролей' },
            UPDATE: { key: 'role.update', label: 'Редактирование ролей' },
            DELETE: { key: 'role.delete', label: 'Удаление ролей' },
        }
    },
    AGENT_ROLES: {
        label: "Роли пользоватетей ИИ агента",
        actions: {
            READ: { key: 'agentRoles.read', label: 'Просмотр списка ролей пользователей ИИ агента' },
            CREATE: { key: 'agentRoles.create', label: 'Создание новых ролей пользователей ИИ агента' },
            UPDATE: { key: 'agentRoles.update', label: 'Редактирование ролей пользователей ИИ агента' },
            DELETE: { key: 'agentRoles.delete', label: 'Удаление ролей пользователей ИИ агента' },
        }
    },
    LOGS: {
        label: "Логи",
        actions: {
            READ: { key: 'logs.read', label: 'Чтение логов' },
        }
    },
    SYSTEM_SETTINGS: {
        label: "Системные настройки",
        actions: {
            READ: { key: 'system_settings.read', label: 'Просмотр системных настроек' },
            UPDATE: { key: 'system_settings.update', label: 'Редактирование системных настроек' }
        }
    },
};

// Плоский массив ключей для Mongoose: ['platformUsers.read', 'agentUsers.read', ...]
const ALL_PERMISSIONS = Object.values(PERMISSIONS_CONFIG)
    .flatMap(group => Object.values(group.actions).map(action => action.key));

const getPermissionsForUI = () => {
    return Object.keys(PERMISSIONS_CONFIG).map(key => ({
        group: PERMISSIONS_CONFIG[key].label,
        actions: Object.values(PERMISSIONS_CONFIG[key].actions)
    }));
};

module.exports = { PERMISSIONS_CONFIG, ALL_PERMISSIONS, getPermissionsForUI };