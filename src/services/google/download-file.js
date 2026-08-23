const { getDriveClient } = require('./client');

// Нативные документы Google скачать нельзя — их нужно экспортировать
const EXPORT_FORMATS = {
    'application/vnd.google-apps.document': { mimeType: 'text/markdown', extension: '.md' },
    'application/vnd.google-apps.spreadsheet': { mimeType: 'text/csv', extension: '.csv' },
    'application/vnd.google-apps.presentation': { mimeType: 'text/plain', extension: '.txt' },
    'application/vnd.google-apps.script': { mimeType: 'application/json', extension: '.json' },
};

/**
 * Забирает содержимое файла Google Drive в память.
 *
 * @returns {Promise<{ buffer: Buffer, mimeType: string, filename: string }>}
 */
async function downloadDriveFile(fileId, { name, mimeType }) {
    const drive = await getDriveClient();
    const exportFormat = EXPORT_FORMATS[mimeType];

    if (mimeType?.startsWith('application/vnd.google-apps.') && !exportFormat) {
        throw new Error(`Файлы Google типа "${mimeType}" нельзя экспортировать для векторизации`);
    }

    const response = exportFormat
        ? await drive.files.export(
            { fileId, mimeType: exportFormat.mimeType },
            { responseType: 'arraybuffer' }
        )
        : await drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'arraybuffer' }
        );

    const baseName = name || fileId;
    const filename = exportFormat ? `${baseName}${exportFormat.extension}` : baseName;

    return {
        buffer: Buffer.from(response.data),
        mimeType: exportFormat ? exportFormat.mimeType : mimeType,
        filename,
    };
}

module.exports = { downloadDriveFile, EXPORT_FORMATS };
