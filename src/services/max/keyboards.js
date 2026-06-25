module.exports = {
    phoneRequest: {
        type: 'inline_keyboard',
        payload: {
            buttons: [[
                { type: 'request_contact', text: 'Поделиться номером телефона' }
            ]]
        }
    }
};
