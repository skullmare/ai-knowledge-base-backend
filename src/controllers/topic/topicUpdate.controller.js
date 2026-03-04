const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { processTopicFiles, deleteSingleFileFromS3 } = require('../../services/storage.service');
const { patchTopicSchema } = require('../../schemas/topic.schema');

module.exports = async (req, res) => {
    const { id } = req.params;
    try {
        const payload = { ...req.body };
        ['metadata', 'filesToDelete', 'files_metadata'].forEach(f => {
            if (typeof payload[f] === 'string') try { payload[f] = JSON.parse(payload[f]); } catch (e) {}
        });

        const validation = await patchTopicSchema.safeParseAsync({ params: req.params, body: payload });
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: validation.error.issues.map(err => ({
                    path: err.path.filter(p => !['body', 'params'].includes(p)).join('.') || 'id',
                    message: err.message
                }))
            });
        }

        const { body: data } = validation.data;
        const topic = await Topic.findById(id);
        if (!topic) return res.status(404).json({
            success: false,
            message: 'Не найдено',
            errors: [{ path: 'id', message: 'Тема не существует' }]
        });

        const update = { $set: {}, $push: {}, $pull: {} };
        const changes = [];

        if (data.filesToDelete?.length) {
            const valid = data.filesToDelete.filter(url => topic.files.some(f => f.url === url));
            if (valid.length) {
                valid.forEach(url => deleteSingleFileFromS3(url));
                update.$pull.files = { url: { $in: valid } };
                changes.push(`удалено: ${valid.length}`);
            }
        }

        if (req.files?.length) {
            const missing = req.files.find(f => !data.files_metadata?.[f.originalname]);
            if (missing) return res.status(400).json({
                success: false,
                message: 'Ошибка файлов',
                errors: [{ path: 'files_metadata', message: `Нет описания для: ${missing.originalname}` }]
            });
            const uploaded = await processTopicFiles(req.files, data.files_metadata, id);
            update.$push.files = { $each: uploaded };
            changes.push(`добавлено: ${uploaded.length}`);
        }

        ['name', 'content'].forEach(f => {
            if (data[f]) {
                update.$set[f] = data[f];
                update.$set.status = 'review';
                update.$set['vectorData.isIndexed'] = false;
            }
        });

        if (data.metadata) Object.keys(data.metadata).forEach(k => update.$set[`metadata.${k}`] = data.metadata[k]);

        ['$set', '$push', '$pull'].forEach(op => { if (!Object.keys(update[op]).length) delete update[op]; });

        const result = Object.keys(update).length 
            ? await Topic.findByIdAndUpdate(id, update, { new: true, runValidators: true }).populate('metadata.category', 'name')
            : topic;

        await Log.create({
            action: 'TOPIC_PATCHED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: id,
            details: { changes, name: result?.name || topic.name }
        });

        return res.status(200).json({ success: true, message: 'Тема обновлена', data: result });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};