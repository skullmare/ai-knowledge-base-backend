# 🚀 Knowledge Base for AI (Backend)

### Backend для платформы управления корпоративными знаниями ИИ-агента

**Knowledge Base for AI** — это платформа для хранения, обработки и предоставления корпоративных данных ИИ-агенту. Система использует гибридное чанкирование, векторный поиск и современные LLM для обеспечения точных ответов на основе внутренней базы знаний.

---

## 🛠 Стек технологий

* **Node.js/Express:** Центральное API, управляющее бизнес-логикой и интеграциями.
* **Qdrant:** Высокопроизводительная векторная база данных для семантического поиска.
* **MongoDB:** Основное хранилище метаданных и настроек системы.
* **Yandex Cloud:** Объектное хранилище (S3) для физических файлов.
* **RouterAI:** Поставщик LLM моделей и эмбеддингов (OpenAI-совместимый API).
* **Google Drive:** Источник документов для базы знаний.
* **Infrastructure:** Docker / Amvera (PaaS)

---

## ⚙️ Быстрый старт

### 1. Требования

* Установленный **Docker** и **Docker Compose**
* Развернутые внешние сервисы **MongoDB** и **Qdrant**
* **Node.js v18** или выше
* Аккаунты в **Yandex Cloud** и **RouterAI**

### 2. Клонирование репозитория

```bash
git clone https://github.com/skullmare/ai-knowledge-base-backend.git
cd ai-knowledge-base-backend

```

### 3. Настройка окружения

Создайте файл `.env` в корневом каталоге и заполните его, используя шаблон ниже (не забудьте заменить значения на свои):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Databases
MONGODB_URI=mongodb://localhost:27017/nameDB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_key

# Admin Credentials
LOGIN_SUPER_ADMIN=admin
PASSWORD_SUPER_ADMIN=your_secure_password

# Security (JWT)
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# AI & LLM
# Ключ и адрес RouterAI задаются в интерфейсе («Настройки системы» → RouterAI).
# Переменные ниже используются только для первичного заполнения настроек при старте.
ROUTER_AI_API_KEY=your_router_ai_key
ROUTER_AI_BASE_URL=https://routerai.ru/api/v1

# Google Drive (первичное заполнение настроек; далее — через интерфейс)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5174/settings/google-callback

# Cloud Storage (Yandex Cloud)
YANDEX_ACCESS_KEY_ID=your_key_id
YANDEX_SECRET_ACCESS_KEY=your_secret_key
BUCKET_NAME=operon

# Mail Service
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=your_email_from

# Frontend
RESET_PASSWORD_URL=http://localhost:3000/reset-password

```

### 4. Запуск (Docker)


### 5. Установка зависимостей и запуск приложения

```bash
npm install
npm run dev

```

### 6. Настройка через интерфейс

Ключи внешних сервисов больше не хранятся в коде — они задаются на странице
**«Настройки системы»** и лежат в коллекции `systemsettings`:

| Вкладка | Что настраивается | Право доступа |
| --- | --- | --- |
| **RouterAI** | API-ключ и базовый URL | `system_settings.ai_provider` |
| **Google Drive** | Client ID / Secret, Redirect URI, подключение аккаунта | `system_settings.google_drive` |
| **Агент** | Модель ответов (из списка RouterAI) и промпты агента | `system_settings.agent` |

**Векторизация.** Используется `google/gemini-embedding-2`. Модель и
размерность (3072) зашиты в `src/constants/ai.js` и не настраиваются: вся
векторная база лежит в пространстве этой модели.

Сама модель мультимодальная, но RouterAI проксирует эмбеддинги по обычной
OpenAI-схеме — поле `input` принимает только строки, файловый ввод отдаёт
`invalid_union: expected string, received array`. Поэтому текст из документов
извлекается на своей стороне, в процессе, без внешнего сервиса разбора
(пакет `officeparser`).

Как файл попадает в векторную базу:

| Что за файл | Как обрабатывается |
| --- | --- |
| `.txt`, `.md`, `.csv`, `.json`, `.html`… | читается напрямую |
| `.pdf`, `.docx`, `.pptx`, `.odt`, `.rtf`, `.epub` | текст извлекается через `officeparser` |
| `.xlsx`, `.ods` | строка таблицы собирается в одну строку текста, шапка повторяется в каждом чанке |
| `.doc`, `.xls`, `.ppt` | не поддерживаются — просят пересохранить в современный формат |
| изображения, аудио, видео | не поддерживаются — RouterAI принимает только текст |

Дальше текст режется markdown-сплиттером, и каждый фрагмент становится
отдельной точкой в Qdrant. Payload точки:

```json
{
  "text": "Регламент проведения работ на высоте…",
  "metadata": {
    "source": "file",
    "fileId": "68f0a1b2c3d4e5f60718293a",
    "name": "Регламент работ на высоте",
    "link": "https://storage.yandexcloud.net/…/reglament.docx",
    "accessibleByRoles": ["650000000000000000000001"]
  }
}
```

Поиск агента фильтруется по `metadata.accessibleByRoles`, поэтому пользователь
видит только те фрагменты, которые разрешены его роли.

Отсканированные PDF без текстового слоя векторизовать нельзя — OCR не входит
в обработку.

Если коллекция Qdrant была создана под другую размерность, её нужно один
раз пересоздать — кнопка «Пересоздать» на вкладке RouterAI
(`POST /api/v1/system/settings/qdrant/recreate`). Операция необратима: темы
возвращаются на проверку, файлы становятся невекторизованными. Расхождение
размерности видно в логах при старте и в `/api/v1/health/services`.

**Загрузка файлов.** Файлы идут напрямую в S3 через presigned URL
multipart-загрузки (`POST /api/v1/files/multipart/create` → `.../sign` →
`.../complete`), тело файла через бэкенд не проходит. Для этого в CORS-политике
бакета должен быть разрешён метод `PUT` и выставлен `ExposeHeaders: ["ETag"]` —
иначе браузер не сможет прочитать ETag части и собрать файл.

### 7. Диагностика

`GET /api/v1/health` — живость самого сервиса (без авторизации).

`GET /api/v1/health/services` — состояние внешних сервисов (нужен access token).
Отвечает `200`, если всё доступно, и `503` со списком проблем, если нет:

```json
{
  "success": false,
  "message": "Часть сервисов недоступна",
  "data": { "checks": [
    { "name": "mongodb", "ok": true,  "message": "Соединение подключена" },
    { "name": "qdrant",  "ok": true,  "message": "Коллекция knowledge_base, размерность 3072, точек: 0" },
    { "name": "routerai","ok": true,  "message": "Доступно моделей: 466, эмбеддинги отвечают (3072)" }
  ] }
}
```

Проверка `qdrant` отдельно ловит расхождение размерности коллекции с
размерностью модели. Проверка `routerai` не ограничивается списком моделей —
он у части провайдеров отдаётся без авторизации и потому ничего не доказывает,
— а делает настоящий запрос эмбеддингов, тот же, что и векторизация.

### 8. Ссылка на документацию по API

[![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)](https://www.postman.com/rocketmind/rocketmind/documentation/33378290-e357ac2b-9202-4baf-8bb6-3f697af3f79f)

---

## 👥 Роли пользователей по умолчанию

| Роль | Описание |
| --- | --- |
| **Системный администратор** | Полное управление системой, пользователями и инфраструктурой. |

---