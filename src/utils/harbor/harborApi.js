import axios from 'axios';
import qs from 'qs';

import {ARK_HARBOR, ARK_HARBOR_AVATAR_TEMPLATE} from '../pathMap';

const REQUEST_TIMEOUT = 15000;
const TOPIC_POST_BATCH_SIZE = 20;
const USER_ACTION_PAGE_SIZE = 30;

const USER_ACTION_FILTERS = {
    all: '1,2,3,4,5,6,7,9,11,12,13',
    likes: '1',
    topics: '4',
    replies: '5',
};

export const harborApi = axios.create({
    baseURL: ARK_HARBOR,
    timeout: REQUEST_TIMEOUT,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

let activeCredentials = null;
let credentialRejectedHandler = null;

harborApi.interceptors.request.use(config => {
    const requestCredentials = config.harborCredentials || activeCredentials;
    if (!requestCredentials?.userApiKey) {
        return config;
    }

    config.harborCredentialKey = requestCredentials.userApiKey;
    config.headers.set('User-Api-Key', requestCredentials.userApiKey);
    config.headers.set('User-Api-Client-Id', requestCredentials.clientId);
    return config;
});

harborApi.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 && credentialRejectedHandler) {
            credentialRejectedHandler(error, error.config?.harborCredentialKey);
        }
        return Promise.reject(error);
    },
);

export function setActiveHarborCredentials(credentials) {
    activeCredentials = credentials;
}

export function setHarborCredentialRejectedHandler(handler) {
    credentialRejectedHandler = handler;
}

export function isHarborCredentialRejected(error, validationRequest = false) {
    const status = error?.response?.status;
    return status === 401 || (validationRequest && status === 403);
}

function stripHtml(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function getActionKind(actionType) {
    switch (Number(actionType)) {
        case 1:
            return 'like';
        case 3:
            return 'bookmark';
        case 4:
            return 'topic';
        case 5:
            return 'reply';
        default:
            return 'activity';
    }
}

function normalizeAction(action, index) {
    return {
        id: String(
            action.post_id ||
                `${action.action_type}-${action.topic_id}-${action.created_at}-${index}`,
        ),
        kind: getActionKind(action.action_type),
        title: action.title || '',
        excerpt: stripHtml(action.excerpt),
        createdAt: action.created_at || '',
        topicId: Number(action.topic_id) || null,
        postNumber: Number(action.post_number) || null,
    };
}

function normalizeBookmark(bookmark, index) {
    return {
        id: String(bookmark.id || `bookmark-${index}`),
        kind: 'bookmark',
        title: bookmark.title || bookmark.name || '',
        excerpt: stripHtml(bookmark.excerpt || bookmark.cooked),
        createdAt: bookmark.created_at || bookmark.updated_at || '',
        topicId: Number(bookmark.topic_id) || null,
        postNumber: Number(bookmark.post_number) || null,
    };
}

function normalizeNotification(notification, index) {
    const data = notification.data || {};
    return {
        id: String(notification.id || `notification-${index}`),
        title:
            data.topic_title ||
            data.badge_name ||
            data.display_username ||
            data.username ||
            '',
        excerpt: stripHtml(data.excerpt || data.message),
        createdAt: notification.created_at || '',
        isRead: Boolean(notification.read),
        type: Number(notification.notification_type) || 0,
        topicId: Number(notification.topic_id) || null,
        postNumber: Number(notification.post_number) || null,
        badgeId: Number(data.badge_id) || null,
    };
}

function normalizeMessage(topic, index) {
    return {
        id: String(topic.id || `message-${index}`),
        title: topic.title || '',
        excerpt: stripHtml(topic.excerpt),
        createdAt: topic.last_posted_at || topic.created_at || '',
        unreadCount: Number(topic.unread_posts || topic.unseen || 0),
        topicId: Number(topic.id) || null,
        slug: topic.slug || '',
    };
}

function mergeTopicPosts(posts) {
    const postMap = new Map();
    posts.filter(Boolean).forEach(post => {
        if (post.id != null) {
            postMap.set(post.id, post);
        }
    });
    return [...postMap.values()].sort((left, right) => {
        return Number(left.post_number || 0) - Number(right.post_number || 0);
    });
}

function normalizeBadges(data) {
    const badgesById = new Map(
        (data?.badges || []).map(badge => [Number(badge.id), badge]),
    );

    return (data?.user_badges || [])
        .map((userBadge, index) => {
            const badge = badgesById.get(Number(userBadge.badge_id));
            if (!badge) {
                return null;
            }
            return {
                id: String(userBadge.id || `badge-${index}`),
                name: badge.name || '',
                description: badge.description || '',
                imageUrl: badge.image_url || null,
                icon: badge.icon || '',
                badgeTypeId: Number(badge.badge_type_id) || 3,
                grantedAt: userBadge.granted_at || '',
                isFavorite: Boolean(userBadge.is_favorite),
            };
        })
        .filter(Boolean)
        .sort((left, right) => {
            if (left.isFavorite !== right.isFavorite) {
                return left.isFavorite ? -1 : 1;
            }
            return new Date(right.grantedAt) - new Date(left.grantedAt);
        });
}

function normalizeProfile(
    currentUser,
    profileData,
    summaryData,
    notificationData,
    actionData,
    badgeData,
) {
    const profile = profileData?.user || {};
    const summary = summaryData?.user_summary || {};
    const username = currentUser.username || profile.username;
    const avatarTemplate =
        currentUser.avatar_template || profile.avatar_template || '';
    const createdAt = profile.created_at ? new Date(profile.created_at) : null;
    const joinedAt =
        createdAt && !Number.isNaN(createdAt.getTime())
            ? `${createdAt.getFullYear()}-${String(
                  createdAt.getMonth() + 1,
              ).padStart(2, '0')}`
            : '';

    let role = profile.title || profile.primary_group_name || '';
    if (currentUser.admin || profile.admin) {
        role = '管理員';
    } else if (currentUser.moderator || profile.moderator) {
        role = '版主';
    } else if (!role) {
        role = 'Harbor 會員';
    }

    const notifications = (notificationData?.notifications || []).map(
        normalizeNotification,
    );
    const recentActivity = (actionData?.user_actions || [])
        .map(normalizeAction)
        .filter(action => action.topicId)
        .slice(0, 3);
    const badges = normalizeBadges(badgeData);
    const unreadNotificationCount = notifications.filter(
        notification => !notification.isRead,
    ).length;

    return {
        displayName: currentUser.name || profile.name || username,
        username,
        role,
        trustLevel: Number(profile.trust_level ?? currentUser.trust_level ?? 0),
        joinedAt,
        unreadNotifications: Number(
            currentUser.unread_notifications ?? unreadNotificationCount,
        ),
        unreadMessages: Number(currentUser.unread_private_messages || 0),
        avatarUrl: avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate, 144)
            : null,
        contributions: [
            {
                key: 'topicsCreated',
                value: String(summary.topic_count || 0),
                label: '建立話題',
            },
            {
                key: 'postsCreated',
                value: String(summary.post_count || 0),
                label: '發布貼文',
            },
            {
                key: 'likesReceived',
                value: String(summary.likes_received || 0),
                label: '收到的讚',
            },
            {
                key: 'badges',
                value: String(profile.badge_count ?? badges.length),
                label: '徽章',
            },
        ],
        stats: [
            {
                key: 'daysVisited',
                value: String(summary.days_visited || 0),
                label: '活躍天數',
            },
            {
                key: 'readTime',
                value: String(
                    Math.max(
                        0,
                        Math.round(Number(summary.time_read || 0) / 60),
                    ),
                ),
                label: '閱讀時間（分鐘）',
            },
            {
                key: 'topicsRead',
                value: String(summary.topics_entered || 0),
                label: '瀏覽話題',
            },
            {
                key: 'postsRead',
                value: String(summary.posts_read_count || 0),
                label: '已讀貼文',
            },
        ],
        activity: recentActivity,
        badges,
    };
}

export async function fetchHarborUserActions(
    username,
    {kind = 'all', offset = 0, signal} = {},
) {
    const encodedUsername = encodeURIComponent(username);

    if (kind === 'bookmarks') {
        const response = await harborApi.get(
            `/u/${encodedUsername}/bookmarks.json`,
            {signal},
        );
        const bookmarks = response.data?.user_bookmark_list?.bookmarks || [];
        const items = bookmarks.map(normalizeBookmark);
        return {items, hasMore: false, nextOffset: items.length};
    }

    const response = await harborApi.get('/user_actions.json', {
        params: {
            offset,
            username,
            filter: USER_ACTION_FILTERS[kind] || USER_ACTION_FILTERS.all,
        },
        signal,
    });
    const actions = response.data?.user_actions || [];
    const items = actions.map(normalizeAction);

    return {
        items,
        hasMore: actions.length >= USER_ACTION_PAGE_SIZE,
        nextOffset: offset + actions.length,
    };
}

export async function fetchHarborNotifications({signal} = {}) {
    const response = await harborApi.get('/notifications.json', {signal});
    return (response.data?.notifications || []).map(normalizeNotification);
}

export async function markHarborNotificationRead(notificationId) {
    const id = Number(notificationId);
    if (!Number.isInteger(id) || id <= 0) {
        return;
    }
    await harborApi.put('/notifications/mark-read.json', {id});
}

export async function fetchHarborMessages(username, {signal} = {}) {
    const encodedUsername = encodeURIComponent(username);
    const response = await harborApi.get(
        `/topics/private-messages/${encodedUsername}.json`,
        {signal},
    );
    return (response.data?.topic_list?.topics || []).map(normalizeMessage);
}

export async function fetchHarborTopic(topicId, {signal} = {}) {
    const encodedTopicId = encodeURIComponent(topicId);
    const topicResponse = await harborApi.get(`/t/${encodedTopicId}.json`, {
        params: {
            track_visit: true,
            forceLoad: true,
        },
        signal,
    });
    const topic = topicResponse.data;
    const stream = topic?.post_stream?.stream;
    const initialPosts = topic?.post_stream?.posts;

    if (!topic?.id || !Array.isArray(stream) || !Array.isArray(initialPosts)) {
        throw new Error('Invalid Harbor topic response');
    }

    const allPosts = [...initialPosts];
    const loadedPostIds = new Set(initialPosts.map(post => post?.id));
    const missingPostIds = stream.filter(postId => !loadedPostIds.has(postId));

    for (
        let index = 0;
        index < missingPostIds.length;
        index += TOPIC_POST_BATCH_SIZE
    ) {
        if (signal?.aborted) {
            const canceledError = new Error('Request canceled');
            canceledError.code = 'ERR_CANCELED';
            throw canceledError;
        }

        const postIds = missingPostIds.slice(
            index,
            index + TOPIC_POST_BATCH_SIZE,
        );
        const postsResponse = await harborApi.get(
            `/t/${encodedTopicId}/posts.json`,
            {
                params: {post_ids: postIds},
                paramsSerializer: params =>
                    qs.stringify(params, {arrayFormat: 'brackets'}),
                signal,
            },
        );
        const batch = postsResponse.data?.post_stream?.posts;
        if (!Array.isArray(batch)) {
            throw new Error('Invalid Harbor posts response');
        }
        allPosts.push(...batch);
    }

    return {
        ...topic,
        post_stream: {
            ...topic.post_stream,
            posts: mergeTopicPosts(allPosts),
        },
    };
}

export async function fetchHarborBadges(username, {signal} = {}) {
    const encodedUsername = encodeURIComponent(username);
    const response = await harborApi.get(
        `/user-badges/${encodedUsername}.json`,
        {signal},
    );
    return normalizeBadges(response.data);
}

export async function fetchCurrentHarborUser(credentials) {
    const requestConfig = {harborCredentials: credentials};
    const sessionResponse = await harborApi.get(
        '/session/current.json',
        requestConfig,
    );
    const currentUser = sessionResponse.data?.current_user;
    if (!currentUser?.username) {
        const error = new Error('Harbor 沒有返回目前使用者資料。');
        error.code = 'INVALID_HARBOR_SESSION';
        throw error;
    }

    const username = encodeURIComponent(currentUser.username);
    const [
        profileResult,
        summaryResult,
        notificationResult,
        actionResult,
        badgeResult,
    ] = await Promise.allSettled([
        harborApi.get(`/u/${username}.json`, requestConfig),
        harborApi.get(`/u/${username}/summary.json`, requestConfig),
        harborApi.get('/notifications.json', requestConfig),
        harborApi.get('/user_actions.json', {
            ...requestConfig,
            params: {
                offset: 0,
                username: currentUser.username,
                filter: USER_ACTION_FILTERS.all,
            },
        }),
        harborApi.get(`/user-badges/${username}.json`, requestConfig),
    ]);

    return normalizeProfile(
        currentUser,
        profileResult.status === 'fulfilled' ? profileResult.value.data : null,
        summaryResult.status === 'fulfilled' ? summaryResult.value.data : null,
        notificationResult.status === 'fulfilled'
            ? notificationResult.value.data
            : null,
        actionResult.status === 'fulfilled' ? actionResult.value.data : null,
        badgeResult.status === 'fulfilled' ? badgeResult.value.data : null,
    );
}

export function revokeHarborCredentials(credentials) {
    return axios.post(`${ARK_HARBOR}/user-api-key/revoke`, null, {
        timeout: REQUEST_TIMEOUT,
        headers: {
            'User-Api-Key': credentials.userApiKey,
            'User-Api-Client-Id': credentials.clientId,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });
}
