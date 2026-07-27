import axios from 'axios';

import { getHarborHtmlAttribute } from '../../../../utils/harbor/harborHtml';
import {
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
} from '../../../../utils/harbor/harborApi';
import { ARK_HARBOR_ABSOLUTE_URL } from '../../../../utils/pathMap';

const LIKE_ACTION_ID = 2;

const isCanceledRequest = (error, signal) => {
    return (
        signal?.aborted ||
        error?.code === 'ERR_CANCELED' ||
        axios.isCancel(error)
    );
};

const normalizeHtmlUrl = url => {
    return ARK_HARBOR_ABSOLUTE_URL(
        typeof url === 'string' ? url.replace(/&amp;/g, '&') : '',
    );
};

const extractPostImages = html => {
    if (!html || typeof html !== 'string') {
        return [];
    }

    const images = [];
    const lightboxTags =
        html.match(
            /<a\b[^>]*\bclass=(?:"[^"]*\blightbox\b[^"]*"|'[^']*\blightbox\b[^']*')[^>]*>/gi,
        ) || [];

    lightboxTags.forEach(tag => {
        const href = normalizeHtmlUrl(getHarborHtmlAttribute(tag, 'href'));
        if (href) {
            images.push(href);
        }
    });

    if (images.length === 0) {
        const imageTags = html.match(/<img\b[^>]*>/gi) || [];
        imageTags.forEach(tag => {
            const className = getHarborHtmlAttribute(tag, 'class');
            if (className.split(/\s+/).includes('emoji')) {
                return;
            }
            const src = normalizeHtmlUrl(getHarborHtmlAttribute(tag, 'src'));
            if (src) {
                images.push(src);
            }
        });
    }

    return [...new Set(images)];
};

const extractPostQuoteText = html => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    return html
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:blockquote|div|h[1-6]|li|p|pre)>/gi, '\n')
        .replace(/<li\b[^>]*>/gi, '• ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&hellip;/gi, '…')
        .replace(/&apos;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/&#x([0-9a-f]+);/gi, (match, entityValue) => {
            const codePoint = Number.parseInt(entityValue, 16);
            return Number.isFinite(codePoint) && codePoint <= 0x10ffff
                ? String.fromCodePoint(codePoint)
                : match;
        })
        .replace(/&#([0-9]+);/g, (match, entityValue) => {
            const codePoint = Number.parseInt(entityValue, 10);
            return Number.isFinite(codePoint) && codePoint <= 0x10ffff
                ? String.fromCodePoint(codePoint)
                : match;
        })
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const getReactionCount = post => {
    if (Number.isFinite(post?.reaction_users_count)) {
        return post.reaction_users_count;
    }
    if (Array.isArray(post?.reactions)) {
        return post.reactions.reduce((total, reaction) => {
            return total + Number(reaction?.count || 0);
        }, 0);
    }
    const likeAction = post?.actions_summary?.find(action => action?.id === 2);
    return Number(likeAction?.count || post?.like_count || 0);
};

const getLikeAction = post => {
    return post?.actions_summary?.find(action => action?.id === LIKE_ACTION_ID);
};

const getHarborMutationError = (error, fallback) => {
    const errors = error?.response?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
        return errors.join(' ');
    }
    if (typeof errors === 'string' && errors) {
        return errors;
    }
    return error?.response?.data?.error || fallback;
};

const updateOptimisticLike = (post, liked) => {
    const currentAction = getLikeAction(post) || { id: LIKE_ACTION_ID };
    const currentCount = Number(
        currentAction.count ?? post?.like_count ?? 0,
    );
    const nextCount = Math.max(0, currentCount + (liked ? 1 : -1));
    const nextAction = {
        ...currentAction,
        id: LIKE_ACTION_ID,
        count: nextCount,
        acted: liked,
        can_act: !liked,
        can_undo: liked,
    };
    return {
        ...post,
        like_count: nextCount,
        actions_summary: [
            ...(post.actions_summary || []).filter(
                action => action?.id !== LIKE_ACTION_ID,
            ),
            nextAction,
        ],
    };
};

const updateOptimisticReaction = (post, reactionId) => {
    const currentReactionId = post?.current_user_reaction?.id || null;
    const isRemoving = currentReactionId === reactionId;
    const reactions = (Array.isArray(post?.reactions) ? post.reactions : [])
        .map(reaction => ({ ...reaction }))
        .filter(reaction => reaction?.id);
    const updateCount = (id, delta) => {
        if (!id) {
            return;
        }
        const existing = reactions.find(reaction => reaction.id === id);
        if (existing) {
            existing.count = Math.max(0, Number(existing.count || 0) + delta);
            return;
        }
        if (delta > 0) {
            reactions.push({ id, type: 'emoji', count: delta });
        }
    };

    if (currentReactionId) {
        updateCount(currentReactionId, -1);
    }
    if (!isRemoving) {
        updateCount(reactionId, 1);
    }

    return {
        ...post,
        reactions: reactions.filter(reaction => reaction.count > 0),
        current_user_reaction: isRemoving
            ? null
            : { id: reactionId, type: 'emoji', can_undo: true },
        reaction_users_count: Math.max(
            0,
            Number(post?.reaction_users_count || 0) +
                (currentReactionId ? (isRemoving ? -1 : 0) : 1),
        ),
    };
};

const getNotificationLevelLabel = level => {
    switch (Number(level)) {
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.muted:
            return '靜音';
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.tracking:
            return '追蹤';
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.watching:
            return '關注';
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.watchingFirstPost:
            return '只關注第一篇';
        default:
            return '一般';
    }
};

const getTagLabel = tag => {
    if (typeof tag === 'string') {
        return tag;
    }
    return tag?.name || tag?.id || '';
};

const mergeTopicWindow = (currentTopic, nextTopic) => {
    if (!currentTopic) {
        return nextTopic;
    }

    const currentPosts = currentTopic.post_stream?.posts || [];
    const nextPosts = nextTopic?.post_stream?.posts || [];
    const stream =
        nextTopic?.post_stream?.stream || currentTopic.post_stream?.stream || [];
    const streamIndex = new Map(
        stream.map((postId, index) => [Number(postId), index]),
    );
    const postsById = new Map();

    [...currentPosts, ...nextPosts].forEach(post => {
        if (post?.id) {
            postsById.set(Number(post.id), post);
        }
    });

    const posts = [...postsById.values()].sort((left, right) => {
        const leftIndex = streamIndex.get(Number(left.id));
        const rightIndex = streamIndex.get(Number(right.id));
        if (leftIndex !== undefined && rightIndex !== undefined) {
            return leftIndex - rightIndex;
        }
        return Number(left.post_number || 0) - Number(right.post_number || 0);
    });

    return {
        ...currentTopic,
        ...nextTopic,
        post_stream: {
            ...currentTopic.post_stream,
            ...nextTopic?.post_stream,
            stream,
            posts,
        },
    };
};

const appendTopicPosts = (currentTopic, nextPosts, stream) => {
    return mergeTopicWindow(currentTopic, {
        post_stream: {
            ...currentTopic?.post_stream,
            ...(stream ? { stream } : {}),
            posts: nextPosts,
        },
    });
};


export {
    appendTopicPosts,
    extractPostImages,
    extractPostQuoteText,
    getHarborMutationError,
    getLikeAction,
    getNotificationLevelLabel,
    getReactionCount,
    getTagLabel,
    isCanceledRequest,
    mergeTopicWindow,
    normalizeHtmlUrl,
    updateOptimisticLike,
    updateOptimisticReaction,
};
