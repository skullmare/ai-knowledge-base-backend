const axios = require('axios');
const FormData = require('form-data');

const EXT_TYPE_MAP = {
    mp4: 'video', mov: 'video', avi: 'video', webm: 'video',
    mp3: 'audio', ogg: 'audio', wav: 'audio', aac: 'audio',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image'
};

function detectAttachmentType(url) {
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    return EXT_TYPE_MAP[ext] || 'file';
}

const BASE_URL = 'https://botapi.max.ru';

let _client = null;

const create = (token) => {
    const headers = { Authorization: token };

    let marker = null;

    _client = {
        async getUpdates(timeout = 25) {
            const params = { timeout, limit: 100 };
            if (marker != null) params.marker = marker;
            const { data } = await axios.get(`${BASE_URL}/updates`, {
                params,
                headers,
                timeout: (timeout + 5) * 1000
            });
            if (data.marker != null) marker = data.marker;
            return data.updates || [];
        },

        async uploadFileFromUrl(fileUrl) {
            const attachmentType = detectAttachmentType(fileUrl);

            const { data: uploadData } = await axios.post(`${BASE_URL}/uploads`, null, {
                params: { type: attachmentType },
                headers
            });
            const uploadUrl = uploadData.url;

            const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const contentType = fileResponse.headers['content-type'] || 'application/octet-stream';
            const fileName = fileUrl.split('/').pop().split('?')[0] || 'file';

            const form = new FormData();
            form.append('data', Buffer.from(fileResponse.data), { filename: fileName, contentType });

            const { data: uploadResult } = await axios.post(uploadUrl, form, {
                headers: form.getHeaders()
            });

            return { type: attachmentType, payload: { token: uploadResult.token } };
        },

        async sendMessageToUser(userId, text, attachments = []) {
            const body = { text };
            if (attachments.length) body.attachments = attachments;
            await axios.post(`${BASE_URL}/messages`, body, {
                params: { user_id: userId },
                headers
            });
        },

        async sendMessageToChat(chatId, text, attachments = []) {
            const body = { text };
            if (attachments.length) body.attachments = attachments;
            await axios.post(`${BASE_URL}/messages`, body, {
                params: { chat_id: chatId },
                headers
            });
        },

        async sendTyping(chatId) {
            await axios.post(
                `${BASE_URL}/chats/${chatId}/actions`,
                { action: 'typing_on' },
                { headers }
            ).catch(() => {});
        }
    };

    return _client;
};

const get = () => _client;

module.exports = { create, get };
