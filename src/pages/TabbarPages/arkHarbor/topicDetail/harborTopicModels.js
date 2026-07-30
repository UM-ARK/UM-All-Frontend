import axios from 'axios';

import { getHarborHtmlAttribute } from '../../../../utils/harbor/harborHtml';
import {
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
} from '../../../../utils/harbor/harborApi';
import { ARK_HARBOR_ABSOLUTE_URL } from '../../../../utils/pathMap';

const LIKE_ACTION_ID = 2;
const NESTED_REPLY_BATCH_SIZE = 5;

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

const canUpdatePostReaction = post => {
    if (post?.current_user_reaction) {
        return post.current_user_reaction.can_undo !== false;
    }
    return Boolean(getLikeAction(post)?.can_act);
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

const getNestedReplyCount = post => {
    if (Number(post?.post_number) === 1) {
        return 0;
    }
    return Math.max(
        Number(post?.total_descendant_count || 0),
        Number(post?.direct_reply_count || 0),
        Array.isArray(post?.children) ? post.children.length : 0,
    );
};

const collectNestedPosts = posts => {
    const collected = [];
    const appendPosts = nestedPosts => {
        (Array.isArray(nestedPosts) ? nestedPosts : []).forEach(post => {
            if (!post?.id) {
                return;
            }
            collected.push(post);
            appendPosts(post.children);
        });
    };
    appendPosts(posts);
    return collected;
};

const flattenNestedPosts = (posts, nestedReplyLimits) => {
    const flattened = [];
    const collectDescendants = (nestedPosts, depth, descendants) => {
        (Array.isArray(nestedPosts) ? nestedPosts : []).forEach(post => {
            if (!post?.id) {
                return;
            }
            descendants.push({
                depth,
                post,
            });
            collectDescendants(post.children, depth + 1, descendants);
        });
    };
    (Array.isArray(posts) ? posts : []).forEach(post => {
        if (!post?.id) {
            return;
        }
        const nestedReplyCount = getNestedReplyCount(post);
        const requestedReplyLimit =
            Number(post.post_number) === 1
                ? 0
                : Math.max(
                    Number(
                        nestedReplyLimits?.get(
                            Number(post.post_number),
                        ) || 0,
                    ),
                    0,
                );
        const descendants = [];
        collectDescendants(post.children, 1, descendants);
        const visibleDescendants = descendants.slice(
            0,
            requestedReplyLimit,
        );
        flattened.push({
            ...post,
            __harborNestedDepth: 0,
            __harborNestedReplyCount: nestedReplyCount,
            __harborNestedVisibleReplyCount: visibleDescendants.length,
        });
        visibleDescendants.forEach(descendant => {
            flattened.push({
                ...descendant.post,
                __harborNestedDepth: descendant.depth,
                __harborNestedReplyCount: 0,
                __harborNestedVisibleReplyCount: 0,
            });
        });
    });
    return flattened;
};

const updateNestedPostTree = (posts, postId, updater) => {
    return (Array.isArray(posts) ? posts : []).map(post => {
        if (Number(post?.id) === Number(postId)) {
            return updater(post);
        }
        if (!Array.isArray(post?.children) || post.children.length === 0) {
            return post;
        }
        const children = updateNestedPostTree(
            post.children,
            postId,
            updater,
        );
        if (
            children.every((child, index) => child === post.children[index])
        ) {
            return post;
        }
        return {
            ...post,
            children,
        };
    });
};


export {
    appendTopicPosts,
    canUpdatePostReaction,
    collectNestedPosts,
    extractPostImages,
    flattenNestedPosts,
    getHarborMutationError,
    getLikeAction,
    getNestedReplyCount,
    getNotificationLevelLabel,
    getReactionCount,
    getTagLabel,
    isCanceledRequest,
    mergeTopicWindow,
    NESTED_REPLY_BATCH_SIZE,
    normalizeHtmlUrl,
    updateOptimisticLike,
    updateOptimisticReaction,
    updateNestedPostTree,
};
