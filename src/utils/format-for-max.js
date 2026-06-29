// Extracts links from markdown text and returns plain text + Max link attachments.
// Max does not render markdown links in message body — they must be sent as attachments.
function formatForMax(text) {
    const attachments = [];

    // Extract [title](url) links
    let formatted = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, title, url) => {
        attachments.push({ type: 'link', payload: { url, title } });
        return title;
    });

    // Extract bare <https://...> links
    formatted = formatted.replace(/<(https?:\/\/[^>]+)>/g, (_, url) => {
        attachments.push({ type: 'link', payload: { url, title: url } });
        return url;
    });

    // Strip markdown formatting (Max shows plain text)
    formatted = formatted
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
        .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^#{1,3} /gm, '')
        .trim();

    return { text: formatted, attachments };
}

module.exports = { formatForMax };
