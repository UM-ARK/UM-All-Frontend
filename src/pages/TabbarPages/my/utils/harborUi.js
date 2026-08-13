export const activityMeta = {
    activity: {
        icon: 'pulse-outline',
        label: '活動',
    },
    bookmark: {
        icon: 'bookmark-outline',
        label: '收藏了',
    },
    like: {
        icon: 'heart-outline',
        label: '讚好了',
    },
    likeReceived: {
        icon: 'heart-outline',
        label: '收到讚',
    },
    reply: {
        icon: 'arrow-undo-outline',
        label: '回覆了',
    },
    topic: {
        icon: 'chatbox-ellipses-outline',
        label: '建立話題',
    },
};

const notificationMeta = {
    mentioned: {icon: 'at-outline', label: '提及'},
    group_mentioned: {icon: 'people-outline', label: '提及'},
    replied: {icon: 'arrow-undo-outline', label: '回覆'},
    quoted: {icon: 'chatbox-outline', label: '引用'},
    edited: {icon: 'create-outline', label: '內容更新'},
    liked: {icon: 'heart-outline', label: '讚好'},
    liked_consolidated: {icon: 'heart-outline', label: '讚好'},
    reaction: {icon: 'happy-outline', label: '反應'},
    boost: {icon: 'rocket-outline', label: '反應'},
    private_message: {icon: 'mail-outline', label: '私人訊息'},
    invited_to_private_message: {icon: 'mail-unread-outline', label: '邀請'},
    invitee_accepted: {icon: 'person-add-outline', label: '邀請'},
    invited_to_topic: {icon: 'person-add-outline', label: '邀請'},
    event_invitation: {icon: 'calendar-outline', label: '邀請'},
    group_message_summary: {icon: 'people-outline', label: '群組消息'},
    granted_badge: {icon: 'ribbon-outline', label: '徽章'},
    topic_reminder: {icon: 'alarm-outline', label: '提醒'},
    bookmark_reminder: {icon: 'bookmark-outline', label: '提醒'},
    event_reminder: {icon: 'calendar-outline', label: '提醒'},
    posted: {icon: 'chatbubble-outline', label: '新內容'},
    watching_first_post: {icon: 'eye-outline', label: '新內容'},
    watching_category_or_tag: {icon: 'eye-outline', label: '新內容'},
    following_created_topic: {icon: 'person-outline', label: '社群動態'},
    following_replied: {icon: 'person-outline', label: '社群動態'},
    following: {icon: 'person-add-outline', label: '社群動態'},
    circles_activity: {icon: 'people-circle-outline', label: '社群動態'},
    linked: {icon: 'link-outline', label: '內容更新'},
    linked_consolidated: {icon: 'link-outline', label: '內容更新'},
    moved_post: {icon: 'swap-horizontal-outline', label: '內容更新'},
    post_approved: {icon: 'checkmark-circle-outline', label: '內容更新'},
    code_review_commit_approved: {
        icon: 'checkmark-circle-outline',
        label: '內容更新',
    },
    votes_released: {icon: 'ticket-outline', label: '內容更新'},
    question_answer_user_commented: {
        icon: 'help-circle-outline',
        label: '回覆',
    },
    suggested_edit_created: {icon: 'document-text-outline', label: '內容更新'},
    suggested_edit_accepted: {icon: 'document-text-outline', label: '內容更新'},
    membership_request_accepted: {
        icon: 'people-outline',
        label: '群組消息',
    },
    membership_request_consolidated: {
        icon: 'people-outline',
        label: '群組消息',
    },
    chat_mention: {icon: 'chatbubbles-outline', label: 'Chat 消息'},
    chat_message: {icon: 'chatbubbles-outline', label: 'Chat 消息'},
    chat_invitation: {icon: 'chatbubbles-outline', label: 'Chat 消息'},
    chat_group_mention: {icon: 'chatbubbles-outline', label: 'Chat 消息'},
    chat_quoted: {icon: 'chatbubbles-outline', label: 'Chat 消息'},
    chat_watched_thread: {icon: 'chatbubbles-outline', label: 'Chat 消息'},
    assigned: {icon: 'person-circle-outline', label: '指派'},
    custom: {icon: 'notifications-outline', label: 'Harbor 通知'},
    new_features: {
        icon: 'sparkles-outline',
        label: '新內容',
        isAdmin: true,
    },
    admin_problems: {
        icon: 'warning-outline',
        label: '系統通知',
        isAdmin: true,
    },
    upcoming_change_available: {
        icon: 'time-outline',
        label: '內容更新',
        isAdmin: true,
    },
    upcoming_change_automatically_promoted: {
        icon: 'time-outline',
        label: '內容更新',
        isAdmin: true,
    },
};
const defaultNotificationMeta = {
    icon: 'notifications-outline',
    label: '系統通知',
};
const chatNotificationTypes = new Set([
    'chat_mention',
    'chat_message',
    'chat_invitation',
    'chat_group_mention',
    'chat_quoted',
    'chat_watched_thread',
]);
const messageNotificationTypes = new Set([
    'private_message',
    'invited_to_private_message',
    'group_message_summary',
    'membership_request_consolidated',
]);
// 消息中心以頭像展示操作者：回覆／提及／點讚／反應／私信
const actorAvatarNotificationTypes = new Set([
    'replied',
    'quoted',
    'mentioned',
    'question_answer_user_commented',
    'liked',
    'liked_consolidated',
    'reaction',
    'boost',
    'private_message',
    'invited_to_private_message',
]);
// 這些通知的 post_number 指向「自己被互動的那則」
const ownPostNotificationTypes = new Set([
    'liked',
    'liked_consolidated',
    'reaction',
    'boost',
]);

function getHarborNotificationLocationLabel(item, translate) {
    const postNumber = Number(item?.postNumber);
    if (!Number.isInteger(postNumber) || postNumber < 1) {
        return '';
    }
    const isOwnPost = ownPostNotificationTypes.has(item?.typeName);
    if (postNumber === 1) {
        return translate(isOwnPost ? '你的首帖' : '首帖');
    }
    const template = translate(
        isOwnPost ? '你的第 {{count}} 樓' : '第 {{count}} 樓',
    );
    return String(template).replace(/\{\{count\}\}/g, String(postNumber));
}

function decodeHarborPathPart(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function getHarborPathTarget(value) {
    if (typeof value !== 'string' || !value.trim()) {
        return null;
    }

    const path = value
        .trim()
        .replace(/^https?:\/\/[^/]+/i, '')
        .split('#')[0];
    const topicMatch = path.match(
        /^\/t\/(?:[^/?#]+\/)?(\d+)(?:\/(\d+))?/,
    );
    if (topicMatch) {
        return {
            kind: 'topic',
            topicId: Number(topicMatch[1]),
            postNumber: Number(topicMatch[2]) || null,
        };
    }

    const categoryMatch = path.match(
        /^\/c\/(?:[^/?#]+\/)*([^/?#]+)\/(\d+)/,
    );
    if (categoryMatch) {
        return {
            kind: 'category',
            categorySlug: decodeHarborPathPart(categoryMatch[1]),
            categoryId: Number(categoryMatch[2]),
        };
    }

    const tagMatch = path.match(/^\/tag\/([^/?#]+)/);
    if (tagMatch) {
        return {
            kind: 'tag',
            tag: decodeHarborPathPart(tagMatch[1]),
        };
    }

    const query = path.match(/[?&]q=([^&#]+)/)?.[1];
    if (path.startsWith('/search') && query) {
        return {
            kind: 'search',
            query: decodeHarborPathPart(query.replace(/\+/g, ' ')),
        };
    }
    if (/^\/u\/[^/?#]+\/messages(?:[/?#]|$)/.test(path)) {
        return {kind: 'messages'};
    }

    return null;
}

export function getHarborNotificationPresentation(item, translate = value => value) {
    const meta = notificationMeta[item?.typeName] || defaultNotificationMeta;
    const typeLabel = translate(meta.label);
    const location = getHarborNotificationLocationLabel(item, translate);
    const label = location ? `${typeLabel} · ${location}` : typeLabel;
    const actor = item?.actingUsername || '';
    const context = actor || item?.data?.group_name || '';
    const link =
        item?.data?.url ||
        item?.data?.path ||
        item?.data?.link ||
        item?.data?.bookmarkable_url ||
        '';
    const isAdmin =
        Boolean(meta.isAdmin) ||
        /^(?:https?:\/\/[^/]+)?\/admin(?:[/?#]|$)/i.test(link);
    const title =
        item?.title ||
        context ||
        (meta === defaultNotificationMeta
            ? translate('Harbor 通知')
            : typeLabel);
    const excerpt =
        item?.excerpt ||
        (context && title !== context ? context : '') ||
        location;

    return {
        icon: meta.icon,
        isAdmin,
        label,
        title,
        excerpt,
    };
}

// 點讚人或私信對方；頁面再以 username／avatarUrl 組頭像
export function getHarborInboxActor(item) {
    if (item?.inboxType === 'message') {
        return {
            username: item.actingUsername || '',
            avatarUrl: item.avatarUrl || '',
        };
    }
    if (
        item?.inboxType === 'notification' &&
        actorAvatarNotificationTypes.has(item?.typeName) &&
        item?.actingUsername
    ) {
        return {
            username: item.actingUsername,
            avatarUrl: item.avatarUrl || '',
        };
    }
    return {username: '', avatarUrl: ''};
}

export function getHarborNotificationTarget(item, username) {
    if (item?.topicId) {
        return {
            kind: 'topic',
            topicId: item.topicId,
            postNumber: item.postNumber,
        };
    }
    if (item?.badgeId) {
        return {kind: 'badges'};
    }
    if (messageNotificationTypes.has(item?.typeName)) {
        return {kind: 'messages'};
    }

    const data = item?.data || {};
    if (chatNotificationTypes.has(item?.typeName)) {
        const channelId = Number(
            data.chat_channel_id || data.channel_id,
        );
        const messageId = Number(
            data.chat_message_id || data.message_id,
        );
        if (Number.isInteger(channelId) && channelId > 0) {
            return {
                kind: 'chat',
                channelId,
                messageId:
                    Number.isInteger(messageId) && messageId > 0
                        ? messageId
                        : null,
            };
        }
    }
    const explicitPath =
        data.url ||
        data.path ||
        data.link ||
        data.bookmarkable_url;
    if (typeof explicitPath === 'string' && explicitPath.trim()) {
        const nativeTarget = getHarborPathTarget(explicitPath);
        if (nativeTarget) {
            return nativeTarget;
        }
        return {kind: 'web', path: explicitPath.trim()};
    }
    if (item?.typeName === 'invitee_accepted' && item.actingUsername) {
        return {
            kind: 'web',
            path: `/u/${encodeURIComponent(item.actingUsername)}`,
        };
    }
    if (
        item?.typeName === 'membership_request_accepted' &&
        data.group_name
    ) {
        return {
            kind: 'web',
            path: `/g/${encodeURIComponent(data.group_name)}`,
        };
    }
    if (item?.typeName === 'new_features') {
        return {kind: 'web', path: '/admin/whats-new'};
    }
    if (item?.typeName === 'admin_problems') {
        return {kind: 'web', path: '/admin'};
    }
    if (
        item?.typeName === 'upcoming_change_available' ||
        item?.typeName === 'upcoming_change_automatically_promoted'
    ) {
        const changeNames = (
            data.upcoming_change_names || [data.upcoming_change_name]
        ).filter(Boolean);
        return {
            kind: 'web',
            path:
                '/admin/config/upcoming-changes' +
                (changeNames.length > 0
                    ? `?changeNamesFilter=${encodeURIComponent(
                        changeNames.join(','),
                    )}`
                    : ''),
        };
    }
    return {kind: 'none'};
}

export function formatRelativeTime(value, language = 'tc', now = Date.now()) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const seconds = Math.round((date.getTime() - now) / 1000);
    const units = [
        ['year', 60 * 60 * 24 * 365],
        ['month', 60 * 60 * 24 * 30],
        ['day', 60 * 60 * 24],
        ['hour', 60 * 60],
        ['minute', 60],
    ];
    const isEnglish = language === 'en';

    if (Math.abs(seconds) < 60) {
        return isEnglish ? 'just now' : '剛剛';
    }

    for (const [unit, duration] of units) {
        if (Math.abs(seconds) >= duration) {
            const count = Math.max(1, Math.round(Math.abs(seconds) / duration));
            if (isEnglish) {
                const unitLabel = `${unit}${count === 1 ? '' : 's'}`;
                return seconds > 0
                    ? `in ${count} ${unitLabel}`
                    : `${count} ${unitLabel} ago`;
            }

            const unitLabels = {
                year: '年',
                month: '個月',
                day: '日',
                hour: '小時',
                minute: '分鐘',
            };
            return `${count} ${unitLabels[unit]}${seconds > 0 ? '後' : '前'}`;
        }
    }

    return isEnglish ? 'just now' : '剛剛';
}

export function formatJoinedAt(value, language = 'tc') {
    if (!/^\d{4}-\d{2}$/.test(value || '')) {
        return '';
    }

    const [year, month] = value.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(language === 'en' ? 'en' : 'zh-HK', {
        year: 'numeric',
        month: 'short',
    }).format(date);
}
