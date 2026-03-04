const mongoose = require('mongoose');
const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { createTopicSchema } = require('../../schemas/topic.schema');
const { processTopicFiles } = require('../../services/storage.service');

module.exports = async (req, res) => {
    try {
        const payload = { ...req.body };
        ['metadata', 'files_metadata'].forEach(f => {
            if (typeof payload[f] === 'string') try { payload[f] = JSON.parse(payload[f]); } catch (e) {}
        });

        const validation = await createTopicSchema.safeParseAsync({ body: payload });
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'body').join('.'),
                    message: err.message
                }))
            });
        }

        const { body: data } = validation.data;
        const id = new mongoose.Types.ObjectId();

        if (req.files?.length > 0) {
            const missing = req.files.find(f => !data.files_metadata?.[f.originalname]);
            if (missing) return res.status(400).json({
                success: false,
                message: 'Ошибка файлов',
                errors: [{ path: 'files_metadata', message: `Нет описания для: ${missing.originalname}` }]
            });
        }

        const files = req.files?.length ? await processTopicFiles(req.files, data.files_metadata, id) : [];
        const result = await Topic.create({ ...data, _id: id, files, createdBy: req.user.id, status: 'review' });

        await Log.create({
            action: 'TOPIC_CREATED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: result._id,
            details: { name: result.name }
        });

        return res.status(201).json({ success: true, message: 'Тема создана', data: result });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};