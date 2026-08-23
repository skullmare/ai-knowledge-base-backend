// Один набор populate на все чтения темы: разъезжающиеся списки полей
// в шести контроллерах давали разный формат ответа на одну и ту же сущность.
const TOPIC_POPULATE = [
    { path: 'metadata.category', select: 'name' },
    { path: 'metadata.accessibleByRoles', select: 'name' },
    { path: 'createdBy', select: 'firstName lastName photoUrl' },
    { path: 'updatedBy', select: 'firstName lastName photoUrl' }
];

module.exports = { TOPIC_POPULATE };
