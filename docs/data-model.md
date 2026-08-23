# Модель данных

## Связи

```
PlatformRole ──1:N──▶ PlatformUser ──┬─▶ Topic.createdBy / updatedBy
                                     └─▶ Log.user

TopicCategory ──1:N──▶ Topic.metadata.category

AgentRole ──┬──N:M──▶ Topic.metadata.accessibleByRoles
            └──1:N──▶ AgentUser.role

AgentUser ──1:N──▶ Message
```

## Коллекции

### `PlatformRole`

Роль сотрудника в админ-панели.

| Поле | Тип | Примечание |
| --- | --- | --- |
| `name` | String | уникально |
| `permissions` | [String] | enum `ALL_PERMISSIONS`, непустой |
| `description` | String | обязательно |
| `isSystem` | Boolean | системную роль нельзя удалить и изменить её права |

### `PlatformUser`

Сотрудник.

| Поле | Тип | Примечание |
| --- | --- | --- |
| `firstName`, `lastName` | String | обязательны |
| `login` | String | уникален, приводится к нижнему регистру |
| `email` | String | уникален, нижний регистр, проверка формата |
| `password` | String | bcrypt, `select: false` |
| `photoUrl` | String | публичная ссылка в S3 |
| `role` | ObjectId → PlatformRole | |
| `status` | `active` \| `blocked` | |
| `isSystem` | Boolean | защищён от удаления и блокировки |
| `lastLogin` | Date | |
| `resetPasswordToken` / `resetPasswordExpires` | String / Date | `select: false`, хранится sha256 |
| `twoFactorCode` / `twoFactorCodeSentAt` / `twoFactorAttempts` | String / Date / Number | `select: false`, код хранится как bcrypt-хеш |

Все чувствительные поля помечены `select: false`: они не попадут в ответ API,
даже если контроллер забудет их исключить.

### `AgentRole`

Роль пользователя ИИ-агента. Определяет, какие темы ему доступны.

| Поле | Тип |
| --- | --- |
| `name` | String, уникально |
| `description` | String, обязательно |

### `AgentUser`

Пользователь мессенджера.

| Поле | Тип | Примечание |
| --- | --- | --- |
| `firstName`, `lastName` | String | из профиля мессенджера |
| `phone` | String | уникален, sparse; формат `+<цифры>` |
| `chatIdTG`, `chatIdMAX` | String | уникальны, sparse |
| `role` | ObjectId → AgentRole | `null` = доступа нет |
| `status` | `active` \| `blocked` \| `pending` | |
| `requestsCount`, `lastActivity` | Number, Date | статистика обращений |

Индексы `chatIdTG` и `chatIdMAX` обязательно **sparse**: у пользователя обычно
привязан только один мессенджер, и без sparse второй документ с отсутствующим
полем нарушал бы уникальность. Устаревшие индексы прежней схемы
(`chatId_1_messenger_1`) сносятся при старте — см. `src/init/agent-user-index.js`.

### `TopicCategory`

| Поле | Тип |
| --- | --- |
| `name` | String, уникально |
| `description` | String, обязательно |

### `Topic`

| Поле | Тип | Примечание |
| --- | --- | --- |
| `name` | String | индексируется, участвует в текстовом поиске |
| `markdownContent` | String | `select: false` |
| `collaborationData` | Buffer | состояние Yjs, `select: false` |
| `status` | `review` \| `approved` \| `archived` | |
| `createdBy`, `updatedBy` | ObjectId → PlatformUser | |
| `vectorData.isIndexed`, `vectorData.lastIndexedAt` | Boolean, Date | |
| `metadata.category` | ObjectId → TopicCategory | обязательна, проверяется валидатором |
| `metadata.accessibleByRoles` | [ObjectId → AgentRole] | минимум одна, проверяются валидатором |

Индексы: `name`, `status`, `metadata.category`, текстовый по
`name` + `markdownContent`.

### `Message`

История диалога пользователя с агентом.

| Поле | Тип |
| --- | --- |
| `agentUserId` | ObjectId → AgentUser, индекс |
| `role` | `user` \| `assistant` |
| `content` | String |

### `Log`

Журнал действий, см. [logging.md](./logging.md).

| Поле | Тип | Примечание |
| --- | --- | --- |
| `action` | String | enum из `ALL_ACTIONS` |
| `category` | String | enum из `ALL_CATEGORY` |
| `entityType` | String | сущность, к которой относится событие |
| `entityId` | ObjectId | идентификатор затронутой записи |
| `user` | ObjectId → PlatformUser | может отсутствовать (системные события) |
| `message` | String | человекочитаемое описание |
| `status` | `success` \| `error` | |

### `SystemSetting`

Справочник настроек. Модель и права (`system_settings.*`) заведены,
API пока не реализовано.

## Векторное хранилище

Коллекция Qdrant (по умолчанию `knowledge_base`): косинусная метрика,
размерность 1536. Payload-индексы типа `keyword` по
`metadata.category`, `metadata.accessibleByRoles`, `metadata.topicId` —
без них фильтрация поиска не работает.

Индексы создаются при каждом старте: операция идемпотентна, а коллекция
могла быть создана раньше, чем появились фильтры.
