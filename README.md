# 🚀 Knowledge Base for AI — Backend

Backend платформы управления корпоративными знаниями ИИ-агента.

Система хранит знания в виде тем с совместным редактированием, индексирует
одобренные темы в векторной базе и отвечает на вопросы сотрудников в Telegram
и MAX — строго в пределах того, к чему у спрашивающего есть доступ по роли.

---

## 🛠 Стек

| Компонент | Роль |
| --- | --- |
| **Node.js / Express 5** | HTTP API и WebSocket |
| **MongoDB / Mongoose** | Основное хранилище |
| **Qdrant** | Векторный поиск по базе знаний |
| **OpenRouter** | LLM и эмбеддинги |
| **Yandex Object Storage** | Файлы и аватары |
| **Hocuspocus + Yjs + BlockNote** | Совместное редактирование тем |
| **Telegram / MAX** | Каналы общения с ИИ-агентом |
| **Zod** | Валидация входящих данных |
| **Jest + supertest** | Тесты |

---

## ⚙️ Быстрый старт

```bash
git clone https://github.com/skullmare/ai-knowledge-base-backend.git
cd ai-knowledge-base-backend

npm install
cp .env.example .env     # заполните значения
npm run dev
```

Полный список переменных окружения — в [`docs/operations.md`](./docs/operations.md).

При первом запуске создаются системная роль со всеми правами и системный
администратор с учётными данными из `LOGIN_SUPER_ADMIN` / `PASSWORD_SUPER_ADMIN`.

### Docker

```bash
docker build -t knowledge-base-backend .
docker run --env-file .env -p 3000:3000 knowledge-base-backend
```

---

## 📜 Команды

| Команда | Что делает |
| --- | --- |
| `npm start` | Запуск в продакшене |
| `npm run dev` | Запуск с автоперезагрузкой |
| `npm test` | Прогон всех тестов |
| `npm run test:coverage` | Тесты с отчётом о покрытии |
| `npm run lint` | Проверка ESLint |

---

## 📚 Документация

| Документ | О чём |
| --- | --- |
| [architecture.md](./docs/architecture.md) | Общая архитектура и потоки данных |
| [project-structure.md](./docs/project-structure.md) | Карта каталогов и слоёв |
| [api.md](./docs/api.md) | Маршруты, права, формат ответа |
| [auth.md](./docs/auth.md) | Аутентификация, 2FA, права |
| [knowledge-base.md](./docs/knowledge-base.md) | Темы, редактирование, индексация |
| [ai-agent.md](./docs/ai-agent.md) | Конвейер ответа агента |
| [data-model.md](./docs/data-model.md) | Коллекции и связи |
| [integrations.md](./docs/integrations.md) | Внешние системы |
| [logging.md](./docs/logging.md) | Журнал событий и логи |
| [testing.md](./docs/testing.md) | Как устроены и как писать тесты |
| [operations.md](./docs/operations.md) | Окружение, запуск, деплой |

Правила разработки — в [`CLAUDE.md`](./CLAUDE.md).

---

## 👥 Роли по умолчанию

| Роль | Описание |
| --- | --- |
| **Системный администратор** | Полный доступ ко всем функциям системы |

Остальные роли платформы и роли ИИ-агента создаются через интерфейс.
