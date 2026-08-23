# Логирование

В системе два независимых механизма: журнал действий в базе (для аудита
и интерфейса) и файловые логи (для эксплуатации).

## Журнал действий — коллекция `Log`

Пишется через `utils/log-handler.js`:

```js
await logHandler({
    action: ACTIONS_CONFIG.TOPICS.actions.CREATE.key,
    message: `Создана новая тема: "${topic.name}"`,
    userId,
    entityId: topic._id,
    status: 'success'
});
```

`entityType` и `category` подставляются автоматически по коду события —
вызывающий код не может ошибиться в их сочетании.

Ошибка записи в журнал перехватывается внутри `log-handler` и не срывает
основную операцию: журнал важен, но не важнее действия пользователя.

### Справочник событий

`constants/actions.js` — единственный источник правды. Каждое событие задаёт:

```js
CREATE: { key: 'TOPIC_CREATE', label: 'Создание темы' }
```

а группа задаёт `entity` и `category`. Из этой структуры выводятся:

* `ALL_ACTIONS`, `ALL_CATEGORY` — enum для модели `Log` и для фильтров API;
* `ACTION_TO_ENTITY_MAP`, `ACTION_TO_CATEGORY_MAP` — автоподстановка;
* `ACTION_LABEL_MAP`, `ACTION_GROUP_LABEL_MAP` — человекочитаемые подписи в API;
* `getActionsForUI()` — справочник для интерфейса.

Коды событий обязаны быть уникальными: дубликат молча перезаписывал бы
сопоставление события с сущностью и категорией. Уникальность проверяется тестом.

### Группы событий

`PLATFORM_USERS`, `AGENT_USERS`, `TOPICS`, `TOPIC_CATEGORIES`, `PLATFORM_ROLES`,
`AGENT_ROLES`, `SYSTEM_SETTINGS`, `AUTH`, `PASSWORD`, `PROFILE`, `INFRASTRUCTURE`.

### Что логируется обязательно

* вход, неудачный вход, отправка и проверка кода 2FA, невалидный refresh;
* создание, изменение, удаление любой сущности;
* одобрение темы и ошибки очистки внешних ресурсов;
* загрузка файлов;
* серверные ошибки в модулях (`*_ERROR`).

### Чтение

`GET /api/v1/logs` (право `logs.read`) отдаёт записи с раскрытым автором
и подставленными подписями `actionLabel` и `entityTypeLabel`.
Фильтры: событие, категория, автор, сущность, статус, диапазон дат, поиск
по тексту сообщения.

## Файловые логи — winston

`utils/logger.js` пишет в консоль и в три ротируемых файла:

| Файл | Уровень | Хранение |
| --- | --- | --- |
| `logs/success-%DATE%.log` | info | 14 дней |
| `logs/error-%DATE%.log` | error | 30 дней |
| `logs/debug-%DATE%.log` | debug | 7 дней |

Ротация — по дням, максимум 20 МБ на файл. Уровень задаётся `LOG_LEVEL`.
В тестовом окружении логгер полностью отключается: иначе тесты засоряют вывод
и плодят файлы.

### API логгера

```js
logger.success(message, statusCode?, details?)
logger.error(message, statusCode?, details?)
logger.warn(message, statusCode?, details?)
logger.debug(message, details?)
```

`error-handler` вызывает `logger.error` сам, поэтому дублировать
логирование в контроллере после `errorHandler(...)` не нужно.

## Что не логируется

Пароли, токены, коды 2FA и содержимое писем в логи не попадают.
Серверные ошибки отдают пользователю обезличенный текст, а stack trace
остаётся только в файле.
