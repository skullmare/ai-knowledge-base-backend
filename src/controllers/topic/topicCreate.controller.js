const mongoose = require('mongoose');
const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { createTopicSchema } = require('../../schemas/topic.schema');
const { processTopicFiles } = require('../../services/storage.service');

module.exports = async (req, res) => {
    try {
        let { name, content, metadata, files_metadata } = req.body;

        // 1. Парсим JSON-строки из FormData (так как Multer передает их как строки)
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (e) { }
        }
        if (typeof files_metadata === 'string') {
            try { files_metadata = JSON.parse(files_metadata); } catch (e) { }
        }

        // 2. Валидация данных через Zod
        const validation = await createTopicSchema.safeParseAsync({
            name,
            content,
            metadata,
            files_metadata
        });

        if (!validation.success) {
            const formattedErrors = validation.error.issues.reduce((acc, issue) => {
                const path = issue.path.join('.');
                acc[path] = issue.message;
                return acc;
            }, {});

            return res.status(400).json({
                message: "Ошибка валидации данных",
                errors: formattedErrors
            });
        }

        // Берем провалидированные данные
        const data = validation.data;
        const topicId = new mongoose.Types.ObjectId();

        // 3. Работа с файлами
        let uploadedFiles = [];
        if (req.files && req.files.length > 0) {
            // Техническая проверка: есть ли ключ в мапе для каждого пришедшего файла
            for (const file of req.files) {
                if (!data.files_metadata || !data.files_metadata[file.originalname]) {
                    return res.status(400).json({
                        message: `Нет метаданных для файла: ${file.originalname}`
                    });
                }
            }
            // Передаем в сервис файлы и мапу
            uploadedFiles = await processTopicFiles(req.files, data.files_metadata, topicId);
        }

        // 4. Создание записи в БД
        const topic = await Topic.create({
            _id: topicId,
            name: data.name,
            content: data.content,
            metadata: data.metadata,
            files: uploadedFiles,
            createdBy: req.user.id,
            status: 'review'
        });

        // 5. Логирование
        await Log.create({
            action: 'TOPIC_CREATED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: topic._id,
            details: { name: topic.name }
        });

        res.status(201).json(topic);

    } catch (error) {
        console.error("ОШИБКА ПРИ СОЗДАНИИ ТОПИКА:", error);
        res.status(500).json({
            message: 'Ошибка сервера',
            error: error.message
        });
    }
};