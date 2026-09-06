// Реестр системных настроек. Значения хранятся в MongoDB (модель SystemSetting),
// но структура, значения по умолчанию и признак секретности описаны здесь.

const SETTINGS_GROUPS = {
    AI: 'ai',
    GOOGLE_DRIVE: 'google_drive',
    AGENT: 'agent',
    LOGS: 'logs',
    GENERAL: 'general',
    SECURITY: 'security',
};

const DEFAULT_AGENT_SYSTEM_PROMPT = `Ты ИИ-агент корпоративной базы знаний. Отвечай строго на основе контекста. Если ответа нет — скажи об этом честно.`;

const DEFAULT_AGENT_EMPTY_PROMPT = `Ты ИИ-агент корпоративной базы знаний. По данному запросу информации не найдено — сообщи об этом вежливо.`;

const DEFAULT_AGENT_LINK_RULES = `Правила оформления ссылок (обязательно):
- Никогда не оборачивай ссылки в скобки, кавычки или другие символы.
- Всегда размещай каждую ссылку на отдельной строке.
- Текст после ссылки начинай с новой строки.
- Пример правильного оформления:
Подробнее здесь:
https://example.com
Это описание источника.`;

const DEFAULT_AGENT_SOURCE_RULES = `Правила указания источников (обязательно):
- Каждый фрагмент контекста пронумерован и подписан названием документа: [1], [2] и так далее.
- После каждого утверждения ставь номер источника в квадратных скобках, например: Отпуск оформляется за две недели [1].
- Если утверждение опирается на несколько документов, укажи все номера: [1] [3].
- Ставь только те номера, которые есть в контексте. Не выдумывай названия документов и ссылки.
- Не пиши список источников в конце ответа — он добавляется автоматически.`;

const DEFAULT_AGENT_REWRITE_PROMPT = `Ты помощник, который формулирует поисковые запросы к базе знаний.
На основе истории диалога и последнего сообщения пользователя сформулируй один самодостаточный поисковый запрос, который полностью описывает информацию, которую нужно найти.
Запрос должен быть конкретным, без местоимений вроде "это", "он", "там" — только явные понятия.
Отвечай ТОЛЬКО поисковым запросом, без пояснений.`;

/**
 * @typedef {Object} SettingDefinition
 * @property {string}  key          — ключ настройки
 * @property {string}  name         — человекочитаемое имя
 * @property {string}  group        — группа (вкладка в интерфейсе)
 * @property {*}       value        — значение по умолчанию
 * @property {boolean} [isSecret]   — не отдавать значение наружу, только признак «заполнено»
 * @property {string}  [envFallback]— переменная окружения для обратной совместимости
 * @property {string}  description
 */
const SETTINGS_DEFINITIONS = [
    // ── RouterAI / OpenAI-совместимый провайдер ──────────────────────────────
    {
        key: 'ai_api_key',
        name: 'API-ключ RouterAI',
        group: SETTINGS_GROUPS.AI,
        value: '',
        isSecret: true,
        envFallback: 'ROUTER_AI_API_KEY',
        description: 'Ключ доступа к RouterAI (OpenAI-совместимый API).',
    },
    {
        key: 'ai_base_url',
        name: 'Базовый URL API',
        group: SETTINGS_GROUPS.AI,
        value: 'https://routerai.ru/api/v1',
        envFallback: 'ROUTER_AI_BASE_URL',
        description: 'Адрес OpenAI-совместимого API RouterAI.',
    },
    // ── Агент ───────────────────────────────────────────────────────────────
    {
        key: 'ai_chat_model',
        name: 'Модель ответов агента',
        group: SETTINGS_GROUPS.AGENT,
        value: 'google/gemini-2.5-flash',
        description: 'Модель, которой агент генерирует ответы пользователям.',
    },
    {
        key: 'agent_system_prompt',
        name: 'Системный промпт агента',
        group: SETTINGS_GROUPS.AGENT,
        value: DEFAULT_AGENT_SYSTEM_PROMPT,
        description: 'Инструкция агенту, когда контекст в базе знаний найден.',
    },
    {
        key: 'agent_empty_context_prompt',
        name: 'Промпт при отсутствии контекста',
        group: SETTINGS_GROUPS.AGENT,
        value: DEFAULT_AGENT_EMPTY_PROMPT,
        description: 'Инструкция агенту, когда по запросу ничего не найдено.',
    },
    {
        key: 'agent_link_rules_prompt',
        name: 'Правила оформления ссылок',
        group: SETTINGS_GROUPS.AGENT,
        value: DEFAULT_AGENT_LINK_RULES,
        description: 'Блок правил, добавляемый к системному промпту агента.',
    },
    {
        key: 'agent_source_rules_prompt',
        name: 'Правила указания источников',
        group: SETTINGS_GROUPS.AGENT,
        value: DEFAULT_AGENT_SOURCE_RULES,
        description: 'Инструкция, как агент ссылается на документы. Сам список источников добавляется к ответу автоматически.',
    },
    {
        key: 'agent_rewrite_prompt',
        name: 'Промпт переформулирования запроса',
        group: SETTINGS_GROUPS.AGENT,
        value: DEFAULT_AGENT_REWRITE_PROMPT,
        description: 'Инструкция для этапа переформулирования запроса перед поиском.',
    },
    {
        key: 'agent_search_limit',
        name: 'Количество фрагментов в контексте',
        group: SETTINGS_GROUPS.AGENT,
        value: 5,
        description: 'Сколько фрагментов базы знаний попадает в контекст ответа.',
    },

    // ── Google Drive ────────────────────────────────────────────────────────
    {
        key: 'google_drive_client_id',
        name: 'Google OAuth Client ID',
        group: SETTINGS_GROUPS.GOOGLE_DRIVE,
        value: '',
        envFallback: 'GOOGLE_CLIENT_ID',
        description: 'Client ID OAuth-приложения Google Cloud.',
    },
    {
        key: 'google_drive_client_secret',
        name: 'Google OAuth Client Secret',
        group: SETTINGS_GROUPS.GOOGLE_DRIVE,
        value: '',
        isSecret: true,
        envFallback: 'GOOGLE_CLIENT_SECRET',
        description: 'Client Secret OAuth-приложения Google Cloud.',
    },
    {
        key: 'google_drive_redirect_uri',
        name: 'Redirect URI',
        group: SETTINGS_GROUPS.GOOGLE_DRIVE,
        value: '',
        envFallback: 'GOOGLE_REDIRECT_URI',
        description: 'Адрес, на который Google возвращает код авторизации.',
    },
    {
        key: 'google_drive_refresh_token',
        name: 'Refresh token',
        group: SETTINGS_GROUPS.GOOGLE_DRIVE,
        value: '',
        isSecret: true,
        description: 'Токен обновления, полученный при подключении Google Drive.',
    },
    {
        key: 'google_drive_account_email',
        name: 'Подключённый аккаунт',
        group: SETTINGS_GROUPS.GOOGLE_DRIVE,
        value: '',
        description: 'Google-аккаунт, диск которого подключён к базе знаний.',
    },

    // ── Прочее ──────────────────────────────────────────────────────────────
    {
        key: 'logs_ttl_days',
        name: 'Срок хранения логов',
        group: SETTINGS_GROUPS.LOGS,
        value: 30,
        description: 'Срок хранения системных логов в днях.',
    },
];

const SETTINGS_MAP = SETTINGS_DEFINITIONS.reduce((acc, def) => {
    acc[def.key] = def;
    return acc;
}, {});

const SECRET_KEYS = SETTINGS_DEFINITIONS.filter(d => d.isSecret).map(d => d.key);

// Ключи, которые редактируются только системой (через OAuth-флоу), а не формой настроек
const READONLY_KEYS = ['google_drive_refresh_token', 'google_drive_account_email'];

const EDITABLE_KEYS = SETTINGS_DEFINITIONS
    .map(d => d.key)
    .filter(key => !READONLY_KEYS.includes(key));

module.exports = {
    SETTINGS_GROUPS,
    SETTINGS_DEFINITIONS,
    SETTINGS_MAP,
    SECRET_KEYS,
    READONLY_KEYS,
    EDITABLE_KEYS,
};
