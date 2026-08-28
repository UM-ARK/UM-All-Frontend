import axios from 'axios';

import { getHarborHtmlAttribute } from '../../../../utils/harbor/harborHtml';
import {
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
} from '../../../../utils/harbor/harborApi';
import { ARK_HARBOR_ABSOLUTE_URL } from '../../../../utils/pathMap';

const LIKE_ACTION_ID = 2;
const NESTED_REPLY_BATCH_SIZE = 5;
const NESTED_REPLY_PREVIEW_SIZE = 2;
const NESTED_REPLY_PREVIEW_COMMENT_THRESHOLD = 10;

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

const getHarborImagePressAction = ({ parentUrl, sourceUrl, imageUrls }) => {
    const normalizedParentUrl = normalizeHtmlUrl(parentUrl);
    const normalizedSourceUrl = normalizeHtmlUrl(sourceUrl);

    if (normalizedParentUrl) {
        const parentImageIndex = imageUrls.indexOf(normalizedParentUrl);
        if (parentImageIndex >= 0) {
            return { type: 'image', imageIndex: parentImageIndex };
        }
        if (normalizedParentUrl.startsWith('#')) {
            return null;
        }
        return { type: 'link', url: normalizedParentUrl };
    }

    const sourceImageIndex = imageUrls.indexOf(normalizedSourceUrl);
    if (sourceImageIndex >= 0) {
        return { type: 'image', imageIndex: sourceImageIndex };
    }
    if (!normalizedSourceUrl || normalizedSourceUrl.startsWith('#')) {
        return null;
    }
    return { type: 'link', url: normalizedSourceUrl };
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

const getFlagActions = (post, flagTypeIds = null) => {
    const summary = Array.isArray(post?.actions_summary)
        ? post.actions_summary
        : [];
    const allowedIds =
        flagTypeIds instanceof Set
            ? flagTypeIds
            : Array.isArray(flagTypeIds)
                ? new Set(flagTypeIds.map(Number).filter(id => id > 0))
                : null;
    return summary.filter(action => {
        const id = Number(action?.id);
        if (!Number.isInteger(id) || id <= 0 || id === LIKE_ACTION_ID) {
            return false;
        }
        if (allowedIds && allowedIds.size > 0 && !allowedIds.has(id)) {
            return false;
        }
        return action?.can_act === true;
    });
};

const isOwnHarborPost = (post, currentUsername) => {
    const normalizedCurrentUsername =
        typeof currentUsername === 'string'
            ? currentUsername.trim().toLowerCase()
            : '';
    const normalizedPostUsername =
        typeof post?.username === 'string'
            ? post.username.trim().toLowerCase()
            : '';
    return Boolean(
        normalizedCurrentUsername &&
            normalizedPostUsername &&
            normalizedCurrentUsername === normalizedPostUsername,
    );
};

const canDeleteHarborPost = (post, topic) => {
    if (post?.can_delete) {
        return true;
    }
    return (
        Number(post?.post_number) === 1 &&
        topic?.details?.can_delete === true
    );
};

// 巢狀 API 對一般成員只回傳 deleted_post_placeholder，不會帶 deleted_at
const isHarborPostDeleted = post =>
    Boolean(
        post?.deleted_at ||
            post?.user_deleted ||
            post?.deleted_post_placeholder,
    );

// 未登入也顯示入口；已登入則隱藏自己的帖，並優先依 can_act 判斷
const canShowFlagMenu = (post, currentUsername) => {
    if (isOwnHarborPost(post, currentUsername)) {
        return false;
    }
    if (!currentUsername) {
        return true;
    }
    const flagActions = getFlagActions(post);
    if (flagActions.length > 0) {
        return true;
    }
    // 已登入但 summary 尚未帶 can_act 時仍顯示，進入口再驗證
    const hasExplicitFlagDenial = (post?.actions_summary || []).some(
        action => {
            const id = Number(action?.id);
            return (
                Number.isInteger(id) &&
                id > 0 &&
                id !== LIKE_ACTION_ID &&
                action?.can_act === false &&
                action?.acted
            );
        },
    );
    return !hasExplicitFlagDenial;
};

const canFlagPost = (post, currentUsername, flagTypeIds = null) => {
    if (isOwnHarborPost(post, currentUsername)) {
        return false;
    }
    return getFlagActions(post, flagTypeIds).length > 0;
};

const mergeAvailableFlagTypes = (flagTypes, post) => {
    const types = Array.isArray(flagTypes) ? flagTypes : [];
    const actionableIds = new Set(
        getFlagActions(
            post,
            types.map(type => type?.id),
        ).map(action => Number(action.id)),
    );
    if (actionableIds.size === 0) {
        return [];
    }
    return types.filter(type => actionableIds.has(Number(type?.id)));
};

// Discourse site.json 旗標文案使用 Ruby I18n 佔位符（如 %{username}）
const interpolateHarborI18nTemplate = (template, vars = {}) => {
    if (typeof template !== 'string' || !template) {
        return '';
    }
    return template.replace(/%\{(\w+)\}/g, (match, key) => {
        if (!Object.prototype.hasOwnProperty.call(vars, key)) {
            return match;
        }
        const value = vars[key];
        return value == null ? '' : String(value);
    });
};

const formatHarborFlagTypesForPost = (flagTypes, post) => {
    const username =
        typeof post?.username === 'string' ? post.username.trim() : '';
    const vars = { username };
    return (Array.isArray(flagTypes) ? flagTypes : []).map(type => ({
        ...type,
        name: interpolateHarborI18nTemplate(type?.name, vars) || type?.name,
        description: interpolateHarborI18nTemplate(type?.description, vars),
    }));
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

const updateOptimisticFlag = (post, typeId) => {
    const flagTypeId = Number(typeId);
    if (!Number.isInteger(flagTypeId) || flagTypeId <= 0) {
        return post;
    }
    const currentAction =
        (post?.actions_summary || []).find(
            action => Number(action?.id) === flagTypeId,
        ) || { id: flagTypeId };
    const nextAction = {
        ...currentAction,
        id: flagTypeId,
        acted: true,
        can_act: false,
        can_undo: false,
    };
    return {
        ...post,
        actions_summary: [
            ...(post.actions_summary || []).filter(
                action => Number(action?.id) !== flagTypeId,
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

// 詳情頁展示用：與列表卡片相同的話題狀態
const HARBOR_TOPIC_STATUS_CONFIG = [
    { key: 'closed', icon: 'lock-outline', label: '已關閉' },
    { key: 'archived', icon: 'archive-outline', label: '已封存' },
];

const getHarborTopicStatuses = topic => {
    if (!topic) {
        return [];
    }
    return HARBOR_TOPIC_STATUS_CONFIG.filter(status =>
        Boolean(topic[status.key]),
    );
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

const getLoadedNestedReplyCount = post => {
    return (Array.isArray(post?.children) ? post.children : []).reduce(
        (count, child) => count + 1 + getLoadedNestedReplyCount(child),
        0,
    );
};

const findNestedPostWithMissingChildren = (post, depth = 0) => {
    const children = Array.isArray(post?.children) ? post.children : [];
    if (Number(post?.direct_reply_count || 0) > children.length) {
        return {depth, post};
    }
    for (const child of children) {
        const target = findNestedPostWithMissingChildren(child, depth + 1);
        if (target) {
            return target;
        }
    }
    return Number(post?.total_descendant_count || 0) >
        getLoadedNestedReplyCount(post)
        ? {depth, post}
        : null;
};

const getNestedReplyPreviewLimit = (postsCount, nestedReplyCount = 0) => {
    const commentCount = Math.max(Number(postsCount || 1) - 1, 0);
    return Math.max(
        Number(nestedReplyCount) === 1 ? 1 : 0,
        commentCount < NESTED_REPLY_PREVIEW_COMMENT_THRESHOLD
            ? NESTED_REPLY_PREVIEW_SIZE
            : 0,
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

const findTopicPost = (topic, postId) => {
    const targetId = Number(postId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
        return null;
    }
    const posts = topic?.post_stream?.posts;
    if (!Array.isArray(posts)) {
        return null;
    }
    if (topic?.is_nested_view) {
        return (
            collectNestedPosts(posts).find(
                post => Number(post.id) === targetId,
            ) || null
        );
    }
    return posts.find(post => Number(post.id) === targetId) || null;
};

const flattenNestedPosts = (
    posts,
    nestedReplyLimits,
    defaultReplyLimit = 0,
) => {
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
        const defaultPostReplyLimit =
            Number(post.post_number) === 1
                ? 0
                : Math.min(
                    Math.max(
                        Number(defaultReplyLimit || 0),
                        nestedReplyCount === 1 ? 1 : 0,
                    ),
                    nestedReplyCount,
                );
        const requestedReplyLimit =
            Number(post.post_number) === 1
                ? 0
                : nestedReplyLimits?.has(Number(post.post_number))
                    ? Math.max(
                        Number(
                            nestedReplyLimits.get(
                                Number(post.post_number),
                            ) || 0,
                        ),
                        0,
                    )
                    : defaultPostReplyLimit;
        const descendants = [];
        collectDescendants(post.children, 1, descendants);
        descendants.sort(
            (left, right) =>
                Number(left.post.post_number || 0) -
                Number(right.post.post_number || 0),
        );
        const postsByNumber = new Map(
            [post, ...descendants.map(descendant => descendant.post)].map(
                nestedPost => [Number(nestedPost.post_number), nestedPost],
            ),
        );
        const visibleDescendants = descendants.slice(
            0,
            requestedReplyLimit,
        );
        // 已有可見樓中樓時，展開按鈕改掛在最後一則可見回覆下方
        const nestedMeta = {
            __harborNestedReplyCount: nestedReplyCount,
            __harborNestedReplyPreviewCount: defaultPostReplyLimit,
            __harborNestedVisibleReplyCount: visibleDescendants.length,
        };
        const parentItem = {
            ...post,
            __harborNestedDepth: 0,
            ...nestedMeta,
        };
        const hasVisibleDescendants = visibleDescendants.length > 0;
        flattened.push(
            hasVisibleDescendants
                ? {
                    ...parentItem,
                    __harborNestedReplyCount: 0,
                    __harborNestedReplyPreviewCount: 0,
                    __harborNestedVisibleReplyCount: 0,
                }
                : parentItem,
        );
        visibleDescendants.forEach((descendant, index) => {
            const isLastVisible =
                index === visibleDescendants.length - 1;
            flattened.push({
                ...descendant.post,
                __harborNestedDepth: descendant.depth,
                __harborReplyToUsername:
                    descendant.post.reply_to_user?.username ||
                    postsByNumber.get(
                        Number(descendant.post.reply_to_post_number),
                    )?.username,
                ...(isLastVisible
                    ? {
                        ...nestedMeta,
                        __harborNestedTogglePost: parentItem,
                    }
                    : {
                        __harborNestedReplyCount: 0,
                        __harborNestedReplyPreviewCount: 0,
                        __harborNestedVisibleReplyCount: 0,
                    }),
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
    canDeleteHarborPost,
    canFlagPost,
    canShowFlagMenu,
    canUpdatePostReaction,
    collectNestedPosts,
    extractPostImages,
    findNestedPostWithMissingChildren,
    findTopicPost,
    flattenNestedPosts,
    formatHarborFlagTypesForPost,
    getFlagActions,
    getHarborImagePressAction,
    getHarborMutationError,
    getHarborTopicStatuses,
    getLikeAction,
    getLoadedNestedReplyCount,
    getNestedReplyCount,
    getNestedReplyPreviewLimit,
    getNotificationLevelLabel,
    getReactionCount,
    getTagLabel,
    interpolateHarborI18nTemplate,
    isCanceledRequest,
    isHarborPostDeleted,
    isOwnHarborPost,
    mergeAvailableFlagTypes,
    mergeTopicWindow,
    NESTED_REPLY_BATCH_SIZE,
    normalizeHtmlUrl,
    updateOptimisticFlag,
    updateOptimisticLike,
    updateOptimisticReaction,
    updateNestedPostTree,
};
