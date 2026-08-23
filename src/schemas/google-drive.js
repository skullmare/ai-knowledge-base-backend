const { z } = require('zod');

const connectGoogleDriveSchema = z.object({
    body: z.object({
        code: z.string().trim().min(1, 'Не передан код авторизации Google'),
    })
});

const listGoogleDriveFilesSchema = z.object({
    query: z.object({
        folderId: z.string().trim().optional(),
        search: z.string().trim().optional(),
        pageToken: z.string().trim().optional(),
    })
});

module.exports = { connectGoogleDriveSchema, listGoogleDriveFilesSchema };
