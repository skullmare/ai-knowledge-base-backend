// Переменные окружения должны быть выставлены до первого require приложения:
// часть модулей читает process.env на этапе загрузки.
process.env.NODE_ENV = 'test';
process.env.SUPPRESS_JEST_WARNINGS = 'true';
// Тесты CORS должны опираться на явный список, а не на дефолт окружения.
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.QDRANT_URL = 'http://localhost:6333';
process.env.COLLECTION_NAME = 'knowledge_base_test';
process.env.BUCKET_NAME = 'test-bucket';
process.env.RESET_PASSWORD_URL = 'http://localhost:5173/reset-password';
process.env.EMAIL_FROM = 'noreply@example.com';
process.env.LOGIN_SUPER_ADMIN = 'root';
process.env.PASSWORD_SUPER_ADMIN = 'root-password';
process.env.EMAIL_SUPER_ADMIN = 'root@example.com';
