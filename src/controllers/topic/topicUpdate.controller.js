const mongoose = require('mongoose');
const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { processTopicFiles } = require('../../services/storage.service');

module.exports = async (req, res) => {
    try {
        const { id } = req.params;
        let { name, content, metadata, descriptions, existingFiles } = req.body;

        const currentTopic = await Topic.findById(id);
        if (!currentTopic) {
            return res.status(404).json({ message: 'Тема не найдена' });
        }

        // 1. Парсинг JSON-строк из multipart/form-data
        if (typeof metadata === 'string') metadata = JSON.parse(metadata);
        if (typeof descriptions === 'string') descriptions = JSON.parse(descriptions || '[]');
        
        // existingFiles — это массив объектов файлов, которые фронтенд решил оставить
        let finalFiles = [];
        if (typeof existingFiles === 'string') {
            finalFiles = JSON.parse(existingFiles || '[]');
        } else if (Array.isArray(existingFiles)) {
            finalFiles = existingFiles;
        }

        // 2. Загрузка НОВЫХ файлов, если они есть в req.files
        if (req.files && req.files.length > 0) {
            // Важно: описания для НОВЫХ файлов должны идти после описаний старых
            // Или фронтенд должен присылать отдельный массив newFilesDescriptions
            const uploaded = await processTopicFiles(req.files, descriptions, id);
            finalFiles = [...finalFiles, ...uploaded];
        }

        // 3. Проверка изменения контента для сброса статуса
        const isContentChanged = 
            (name && name !== currentTopic.name) || 
            (content && content !== currentTopic.content);

        const updateData = {
            name: name || currentTopic.name,
            content: content || currentTopic.content,
            metadata: metadata || currentTopic.metadata,
            files: finalFiles,
            updatedBy: req.user.id
        };

        if (isContentChanged) {
            updateData.status = 'review';
            updateData.vectorData = {
                ...currentTopic.vectorData,
                isIndexed: false
            };
            console.log(`⚠️ Контент топика ${id} изменен. Статус сброшен на review.`);
        }

        // 4. Сохранение
        const updatedTopic = await Topic.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('metadata.category', 'name');

        // 5. Логирование
        await Log.create({
            action: 'TOPIC_UPDATED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: id,
            details: { 
                isContentChanged, 
                newFilesCount: req.files?.length || 0,
                totalFiles: finalFiles.length 
            }
        });

        res.json(updatedTopic);
    } catch (error) {
        console.error('❌ Ошибка обновления темы:', error);
        res.status(400).json({ 
            message: 'Ошибка при обновлении темы', 
            error: error.message 
        });
    }
};