import {ARK_HARBOR_AVATAR_TEMPLATE} from '../pathMap';
import {
    getHarborHtmlAttribute,
    replaceHarborEmojiShortcodes,
} from './harborHtml';

const decodeHtmlEntities = value =>
    String(value || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"');

const collapseHarborChatOneboxes = html =>
    String(html || '').replace(
        /<aside\b[^>]*>[\s\S]*?<\/aside>/gi,
        block => {
            const openingTag = block.match(/^<aside\b[^>]*>/i)?.[0] || '';
            const className = getHarborHtmlAttribute(openingTag, 'class');
            if (!className.toLowerCase().split(/\s+/).includes('onebox')) {
                return block;
            }
            const sourceUrl = getHarborHtmlAttribute(
                openingTag,
                'data-onebox-src',
            );
            const anchorTag = block.match(/<a\b[^>]*>/i)?.[0] || '';
            const href = getHarborHtmlAttribute(anchorTag, 'href');
            const url = sourceUrl || href;
            return url ? `\n${url}\n` : block;
        },
    );

export const getHarborChatPlainText = value =>
    replaceHarborEmojiShortcodes(
        decodeHtmlEntities(
            collapseHarborChatOneboxes(value)
                .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, block => {
                    const openingTag = block.match(/^<a\b[^>]*>/i)?.[0] || '';
                    const href = getHarborHtmlAttribute(openingTag, 'href');
                    return href.startsWith('https://umall.one/app/')
                        ? `\n${href}\n`
                        : block;
                })
                .replace(/<img\b[^>]*>/gi, tag => {
                    const className = getHarborHtmlAttribute(tag, 'class');
                    if (!className.split(/\s+/).includes('emoji')) {
                        return '';
                    }
                    return (
                        getHarborHtmlAttribute(tag, 'alt') ||
                        getHarborHtmlAttribute(tag, 'title')
                    );
                })
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]*>/g, ''),
        ),
    )
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const getTrackingForChannel = (tracking, channelId) => {
    const source = tracking?.channel_tracking || tracking || {};
    return source[channelId] || source[String(channelId)] || {};
};

const normalizeChatUser = user => {
    const avatarTemplate = user?.avatar_template || user?.avatarTemplate || '';
    return {
        id: Number(user?.id) || null,
        username: user?.username || '',
        displayName: user?.name || user?.username || '',
        avatarUrl: avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate)
            : '',
        canChat: user?.can_chat !== false && user?.has_chat_enabled !== false,
    };
};

export const normalizeHarborChatChannel = (channel, tracking = {}) => {
    const id = Number(channel?.id);
    if (
        !Number.isInteger(id) ||
        id <= 0 ||
        channel?.chatable_type !== 'DirectMessage'
    ) {
        return null;
    }
    const users = (channel?.chatable?.users || []).map(normalizeChatUser);
    const channelTracking = getTrackingForChannel(tracking, id);
    const lastMessage = channel?.last_message || {};
    const unreadCount = Math.max(
        0,
        Number(
            channelTracking.unread_count ??
            channelTracking.unreadCount ??
            0,
        ) || 0,
    );

    return {
        id,
        title:
            channel?.unicode_title ||
            channel?.title ||
            users.map(user => user.displayName).filter(Boolean).join('、') ||
            'Chat',
        isGroup: Boolean(channel?.chatable?.group || users.length > 1),
        users,
        avatarUrl: users.length === 1 ? users[0].avatarUrl : '',
        lastMessage: lastMessage.id
            ? getHarborChatPlainText(
                lastMessage.excerpt || lastMessage.cooked || lastMessage.message,
            )
            : '',
        lastMessageAt: lastMessage.id ? lastMessage.created_at || '' : '',
        lastMessageId: Number(lastMessage.id) || null,
        unreadCount,
        mentionCount: Math.max(
            0,
            Number(
                channelTracking.mention_count ??
                channelTracking.mentionCount ??
                0,
            ) || 0,
        ),
    };
};

export const normalizeHarborDirectMessageChannels = data => {
    const channels = Array.isArray(data?.direct_message_channels)
        ? data.direct_message_channels
        : [];
    const items = channels
        .map(channel => normalizeHarborChatChannel(channel, data?.tracking))
        .filter(Boolean);

    return {
        items,
        unreadCount: items.reduce(
            (total, channel) => total + channel.unreadCount,
            0,
        ),
    };
};

export const normalizeHarborChatMessage = message => {
    const id = Number(message?.id);
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }
    const user = normalizeChatUser(message?.user || {});
    return {
        id,
        channelId: Number(message?.chat_channel_id) || null,
        content: getHarborChatPlainText(
            message?.cooked || message?.message || message?.excerpt,
        ),
        createdAt: message?.created_at || '',
        deleted: Boolean(message?.deleted_at),
        edited: Boolean(message?.edited),
        user,
    };
};

export const normalizeHarborChatMessages = data => ({
    items: (data?.messages || [])
        .map(normalizeHarborChatMessage)
        .filter(Boolean),
    canLoadMorePast: Boolean(data?.meta?.can_load_more_past),
    canLoadMoreFuture: Boolean(data?.meta?.can_load_more_future),
});

export const mergeHarborChatMessages = (...collections) => {
    const messages = new Map();
    collections.flat().filter(Boolean).forEach(message => {
        messages.set(message.id, message);
    });
    return [...messages.values()].sort((left, right) => {
        const timeDifference =
            (Date.parse(left.createdAt) || 0) -
            (Date.parse(right.createdAt) || 0);
        return timeDifference || left.id - right.id;
    });
};

export const formatHarborChatListTime = (
    value,
    language = 'tc',
    now = new Date(),
) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const isEnglish = String(language).toLowerCase().startsWith('en');
    const pad = number => String(number).padStart(2, '0');
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    );
    const startOfDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
    const dayDifference = Math.round(
        (startOfToday.getTime() - startOfDate.getTime()) / 86400000,
    );
    if (dayDifference === 0) {
        return time;
    }
    if (dayDifference === 1) {
        return isEnglish ? `Yesterday ${time}` : `昨日 ${time}`;
    }
    if (date.getFullYear() === now.getFullYear()) {
        return isEnglish
            ? `${date.getMonth() + 1}/${date.getDate()}`
            : `${date.getMonth() + 1}月${date.getDate()}日`;
    }
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};
