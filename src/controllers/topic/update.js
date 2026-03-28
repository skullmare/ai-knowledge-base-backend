const Topic = require('../../models/topic');
const { deleteMultipleFilesFromS3 } = require('../../services/yandex/S3/delete-list');
const { deleteTopicFromQdrant } = require('../../services/qdrant/delete-chunk');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    try {
        const topic = await Topic.findById(id);

        const update = { $set: {}, $push: {}, $pull: {} };
        let changeSummary = [];

        if (data.filesToDelete?.length) {
            const toDelete = data.filesToDelete.filter(url => topic.files.some(f => f.url === url));
            if (toDelete.length) {
                await deleteMultipleFilesFromS3(toDelete);
                update.$pull.files = { url: { $in: toDelete } };
                changeSummary.push(`удалено файлов: ${toDelete.length}`);
            }
        }

        if (data.name) {
            update.$set.name = data.name;
            changeSummary.push('изменено название');
        }

        if (data.metadata) {
            Object.keys(data.metadata).forEach(key => {
                update.$set[`metadata.${key}`] = data.metadata[key];
            });
            changeSummary.push('обновлены метаданные');
        }

        if (data.status == 'archived') {
            await deleteTopicFromQdrant(id)
            update.$set.status = 'archived';
        } else {
            update.$set.status = 'review';
        }

        update.$set.updatedBy = userId;

        ['$set', '$push', '$pull'].forEach(op => {
            if (!Object.keys(update[op]).length) delete update[op];
        });

        if (Object.keys(update).length === 0) {
            return successHandler(res, 200, 'Изменений не обнаружено', topic);
        }

        const result = await Topic.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true })
            .populate('metadata.category', 'name')
            .populate('metadata.accessibleByRoles', 'name')
            .populate('createdBy', 'firstName lastName photoUrl')
            .populate('updatedBy', 'firstName lastName photoUrl')

        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.UPDATE.key,
            message: `Тема "${result.name || id}" обновлена. Детали: ${changeSummary.join(', ')}`,
            userId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Тема успешно обновлена', result);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при обновлении темы ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении темы',
            [{ path: 'server', message: error.message }]
        );
    }
};