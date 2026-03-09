# 🚀 Knowledge Base for AI (Backend)

### Backend для платформы управления корпоративными знаниями ИИ-агента

**Knowledge Base for AI** — это платформа для хранения, обработки и предоставления корпоративных данных ИИ-агенту. Система использует гибридное чанкирование, векторный поиск и современные LLM для обеспечения точных ответов на основе внутренней базы знаний.

---

## 🛠 Стек технологий

* **Node.js/Express:** Центральное API, управляющее бизнес-логикой и интеграциями.
* **Docling:** Специализированный сервис для умного гибридного чанкирования документов.
* **Qdrant:** Высокопроизводительная векторная база данных для семантического поиска.
* **MongoDB:** Основное хранилище метаданных и настроек системы.
* **Yandex Cloud:** Объектное хранилище (S3) для физических файлов.
* **OpenRouter:** Поставщик LLM моделей.
* **Infrastructure:** Docker / Amvera (PaaS)

---

## ⚙️ Быстрый старт

### 1. Требования

* Установленный **Docker** и **Docker Compose**
* Развернутые внешние сервисы **MpngoDB**, **Qdrant**, **Docling**
* **Node.js** v18 или выше
* Аккаунты в **Yandex Cloud** и **OpenRouter**

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
OPENROUTER_MODEL=openai/text-embedding-3-small
OPENROUTER_API_KEY=your_openrouter_key
DOCLING_URL=http://localhost:5001

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

Самый быстрый способ поднять всю инфраструктуру (MongoDB, Qdrant, Docling):

```bash
docker-compose up -d

```

### 5. Установка зависимостей и запуск приложения

```bash
npm install
npm run dev

```

---

## 👥 Роли пользователей по умолчанию

| Роль | Описание |
| --- | --- |
| **Системный администратор** | Полное управление системой, пользователями и инфраструктурой. |

---