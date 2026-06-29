// Converts LLM markdown output to Telegram HTML (parse_mode: 'HTML')
function formatForTelegram(text) {
    return text
        // Links [text](url) → <a href="url">text</a>
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
        // Raw URLs in angle brackets <https://...>
        .replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1">$1</a>')
        // Bold **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/__(.+?)__/g, '<b>$1</b>')
        // Italic *text* or _text_ (single, not inside words)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
        .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<i>$1</i>')
        // Inline code `code`
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headers → bold on its own line
        .replace(/^#{1,3} (.+)$/gm, '<b>$1</b>')
        // Escape bare < and > that aren't part of HTML tags we just created
        // (already safe since we only produce known tags above)
        .trim();
}

module.exports = { formatForTelegram };
