import axios from 'axios';
import qs from 'qs';

import { ARK_HARBOR, ARK_HARBOR_AVATAR_TEMPLATE } from '../pathMap';

const REQUEST_TIMEOUT = 15000;
const TOPIC_POST_BATCH_SIZE = 20;
const USER_ACTION_PAGE_SIZE = 30;
const DEFAULT_TOPIC_PAGE_SIZE = 30;
const TOPIC_VIEWS = ['latest', 'top', 'new', 'unread'];
const PUBLIC_TOPIC_VIEWS = ['latest', 'top'];

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
let publicCategoryCache = null;
let publicCategoryRequest = null;
let publicCategoryCacheGeneration = 0;

harborApi.interceptors.request.use(config => {
    if (config.skipHarborCredentials) {
        return config;
    }

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

export function clearHarborDiscoveryCache() {
    publicCategoryCacheGeneration += 1;
    publicCategoryCache = null;
    publicCategoryRequest = null;
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
        .replace(/&hellip;/g, '…')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
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
        .replace(/\s+/g, ' ')
        .trim();
}

function hasOwn(value, key) {
    return (
        value != null &&
        typeof value === 'object' &&
        Object.prototype.hasOwnProperty.call(value, key)
    );
}

function toNumberOrNull(value) {
    if (value == null || value === '') {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function toCount(value, fallback = 0) {
    const number = toNumberOrNull(value);
    return number == null ? fallback : Math.max(0, number);
}

function normalizeUser(user) {
    if (!user || typeof user !== 'object') {
        return null;
    }

    const username = user.username || user.display_username || '';
    const avatarTemplate = user.avatar_template || user.avatarTemplate || '';

    if (!username && user.id == null) {
        return null;
    }

    return {
        id: toNumberOrNull(user.id),
        username,
        name: user.name || '',
        avatarUrl: avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate, 96)
            : user.avatar_url || null,
        trustLevel: toNumberOrNull(user.trust_level),
        isAdmin: Boolean(user.admin),
        isModerator: Boolean(user.moderator),
    };
}

function normalizeTag(tag, descriptions = {}) {
    if (typeof tag === 'string' || typeof tag === 'number') {
        const name = String(tag);
        return {
            id: null,
            name,
            slug: name,
            routeName: name,
            description: descriptions[name] || '',
            topicCount: 0,
            pmOnly: false,
        };
    }

    if (!tag || typeof tag !== 'object') {
        return null;
    }

    const name = String(tag.name || tag.text || tag.id || '');
    if (!name) {
        return null;
    }

    return {
        id: toNumberOrNull(tag.id),
        name,
        slug: String(tag.slug || name),
        routeName: name,
        description:
            tag.description || descriptions[name] || descriptions[tag.id] || '',
        topicCount: toCount(tag.count ?? tag.topic_count),
        pmOnly: Boolean(tag.pm_only),
    };
}

function normalizeCategory(category) {
    if (!category || typeof category !== 'object') {
        return null;
    }

    const id = toNumberOrNull(category.id ?? category.category_id);
    if (id == null && !category.name && !category.slug) {
        return null;
    }

    const subcategoryIds = Array.isArray(category.subcategory_ids)
        ? category.subcategory_ids
            .map(toNumberOrNull)
            .filter(categoryId => categoryId != null)
        : [];

    return {
        id,
        name: category.name || category.category_name || '',
        slug: category.slug || category.category_slug || '',
        description: stripHtml(
            category.description_text ||
            category.description_excerpt ||
            category.description,
        ),
        color: category.color || null,
        textColor: category.text_color || null,
        parentCategoryId: toNumberOrNull(category.parent_category_id),
        subcategoryIds,
        topicCount: toCount(category.topic_count ?? category.topics_all_time),
        postCount: toCount(category.post_count),
        position: toNumberOrNull(category.position),
        readRestricted: Boolean(category.read_restricted),
        notificationLevel: toNumberOrNull(category.notification_level),
        canCreateTopic: Boolean(category.can_create_topic),
        customFields:
            category.custom_fields && typeof category.custom_fields === 'object'
                ? category.custom_fields
                : {},
    };
}

function getRawCategories(data) {
    if (Array.isArray(data?.category_list?.categories)) {
        return data.category_list.categories;
    }
    if (Array.isArray(data?.categories)) {
        return data.categories;
    }
    if (Array.isArray(data?.topic_list?.categories)) {
        return data.topic_list.categories;
    }
    return [];
}

function normalizeCategories(data) {
    const categories = [];
    const seenIds = new Set();

    const appendCategories = rawCategories => {
        rawCategories.filter(Boolean).forEach(rawCategory => {
            const category = normalizeCategory(rawCategory);
            const key =
                category?.id == null
                    ? `slug:${category?.slug}`
                    : `id:${category.id}`;

            if (category && !seenIds.has(key)) {
                seenIds.add(key);
                categories.push(category);
            }

            const nestedCategories =
                rawCategory.subcategory_list ||
                rawCategory.subcategories ||
                rawCategory.children;
            if (Array.isArray(nestedCategories)) {
                appendCategories(nestedCategories);
            }
        });
    };

    appendCategories(getRawCategories(data));
    return categories.sort((left, right) => {
        const leftPosition = left.position ?? Number.MAX_SAFE_INTEGER;
        const rightPosition = right.position ?? Number.MAX_SAFE_INTEGER;
        return leftPosition - rightPosition;
    });
}

function fetchPublicHarborCategories() {
    if (publicCategoryCache) {
        return Promise.resolve(publicCategoryCache);
    }
    if (publicCategoryRequest) {
        return publicCategoryRequest;
    }

    const requestGeneration = publicCategoryCacheGeneration;
    const request = harborApi
        .get('/categories.json', { skipHarborCredentials: true })
        .then(response => {
            const categories = normalizeCategories(response.data);
            if (requestGeneration === publicCategoryCacheGeneration) {
                publicCategoryCache = categories;
            }
            return categories;
        })
        .finally(() => {
            if (publicCategoryRequest === request) {
                publicCategoryRequest = null;
            }
        });
    publicCategoryRequest = request;
    return publicCategoryRequest;
}

async function resolveTopicCategory(topic) {
    const categoryId = toNumberOrNull(
        topic?.category_id ?? topic?.category?.id,
    );
    const inlineCategory = normalizeCategory(
        topic?.category ||
        (categoryId != null
            ? {
                id: categoryId,
                name: topic?.category_name,
                slug: topic?.category_slug,
            }
            : null),
    );
    if (categoryId == null || inlineCategory?.name || inlineCategory?.slug) {
        return inlineCategory;
    }

    try {
        const categories = await fetchPublicHarborCategories();
        return (
            categories.find(category => category.id === categoryId) ||
            inlineCategory
        );
    } catch {
        return inlineCategory;
    }
}

function getTopicUsers(data) {
    const usersById = new Map();
    const usersByUsername = new Map();

    const rawUsers = Array.isArray(data?.users) ? data.users : [];
    rawUsers.forEach(rawUser => {
        const user = normalizeUser(rawUser);
        if (!user) {
            return;
        }
        if (user.id != null) {
            usersById.set(user.id, user);
        }
        if (user.username) {
            usersByUsername.set(user.username, user);
        }
    });

    return { usersById, usersByUsername };
}

function resolveTopicPeople(topic, users) {
    const posters = Array.isArray(topic?.posters) ? topic.posters : [];
    const firstPoster = posters[0];
    const latestPoster = posters.find(poster => {
        return String(poster?.extras || '')
            .split(/\s+/)
            .includes('latest');
    });
    const embeddedAuthor =
        topic?.author || topic?.creator || topic?.first_poster;
    const embeddedLastPoster = topic?.last_poster;

    const author =
        users.usersById.get(toNumberOrNull(firstPoster?.user_id)) ||
        normalizeUser(embeddedAuthor) ||
        users.usersByUsername.get(topic?.creator_username) ||
        null;
    const lastPoster =
        users.usersByUsername.get(topic?.last_poster_username) ||
        users.usersById.get(toNumberOrNull(latestPoster?.user_id)) ||
        normalizeUser(embeddedLastPoster) ||
        author;

    return { author, lastPoster };
}

function getTopicSolvedState(topic) {
    const available =
        hasOwn(topic, 'has_accepted_answer') ||
        hasOwn(topic, 'accepted_answer_post_id') ||
        hasOwn(topic, 'solved') ||
        hasOwn(topic, 'is_solved');
    const active = Boolean(
        topic?.has_accepted_answer ||
        topic?.accepted_answer_post_id != null ||
        topic?.solved ||
        topic?.is_solved,
    );

    return { available, active };
}

function getTopicUnreadCount(topic, highestPostNumber, lastReadPostNumber) {
    const explicitUnreadCount = toNumberOrNull(
        topic?.unread_posts ?? topic?.new_posts,
    );
    if (explicitUnreadCount != null) {
        return Math.max(0, explicitUnreadCount);
    }
    if (topic?.unread === true) {
        if (lastReadPostNumber != null && highestPostNumber != null) {
            return Math.max(1, highestPostNumber - lastReadPostNumber);
        }
        return 1;
    }
    return 0;
}

function normalizeTopicSummary(topic, context) {
    const categoryId = toNumberOrNull(
        topic?.category_id ?? topic?.category?.id,
    );
    const inlineCategory = normalizeCategory(
        topic?.category ||
        (categoryId != null
            ? {
                id: categoryId,
                name: topic?.category_name,
                slug: topic?.category_slug,
            }
            : null),
    );
    const category =
        context.categoriesById.get(categoryId) || inlineCategory || null;
    const people = resolveTopicPeople(topic, context.users);
    const highestPostNumber = toNumberOrNull(topic?.highest_post_number);
    const lastReadPostNumber = toNumberOrNull(topic?.last_read_post_number);
    const postCount = toCount(topic?.posts_count);
    const unreadCount = getTopicUnreadCount(
        topic,
        highestPostNumber,
        lastReadPostNumber,
    );
    const solvedState = getTopicSolvedState(topic);
    const muted = Boolean(
        topic?.muted || toNumberOrNull(topic?.notification_level) === 0,
    );
    const statuses = {
        pinned: Boolean(topic?.pinned),
        pinnedGlobally: Boolean(topic?.pinned_globally),
        closed: Boolean(topic?.closed),
        archived: Boolean(topic?.archived),
        muted,
        solved: solvedState.active,
    };
    const tags = (Array.isArray(topic?.tags) ? topic.tags : [])
        .map(tag => normalizeTag(tag, topic?.tags_descriptions))
        .filter(Boolean);

    return {
        id: toNumberOrNull(topic?.id),
        title: stripHtml(
            topic?.unicode_title || topic?.title || topic?.fancy_title,
        ),
        slug: topic?.slug || '',
        excerpt: stripHtml(topic?.excerpt),
        imageUrl: topic?.image_url || null,
        category,
        categoryId,
        tags,
        author: people.author,
        lastPoster: people.lastPoster,
        postCount,
        replyCount: toCount(topic?.reply_count, Math.max(0, postCount - 1)),
        viewCount: toCount(topic?.views),
        likeCount: toCount(topic?.like_count),
        createdAt: topic?.created_at || '',
        lastPostedAt: topic?.last_posted_at || '',
        activityAt:
            topic?.bumped_at ||
            topic?.last_posted_at ||
            topic?.created_at ||
            '',
        unreadCount,
        lastReadPostNumber,
        highestPostNumber,
        isUnread: unreadCount > 0 || topic?.unread === true,
        isNew: Boolean(topic?.unseen || toCount(topic?.new_posts) > 0),
        pinned: statuses.pinned,
        pinnedGlobally: statuses.pinnedGlobally,
        closed: statuses.closed,
        archived: statuses.archived,
        muted: statuses.muted,
        solved: statuses.solved,
        statuses,
        capabilities: {
            solved: solvedState.available,
        },
    };
}

function getTopicPageInfo(topicList, page, itemCount) {
    const moreTopicsUrl = topicList?.more_topics_url;
    const nextPageMatch =
        typeof moreTopicsUrl === 'string'
            ? moreTopicsUrl.match(/[?&]page=(\d+)/)
            : null;
    const explicitHasMore =
        typeof moreTopicsUrl === 'string' && moreTopicsUrl.length > 0;
    const perPage =
        toNumberOrNull(topicList?.per_page) || DEFAULT_TOPIC_PAGE_SIZE;
    const hasMore =
        moreTopicsUrl === null
            ? false
            : explicitHasMore || itemCount >= perPage;

    return {
        hasMore,
        nextPage: hasMore
            ? (toNumberOrNull(nextPageMatch?.[1]) ?? page + 1)
            : null,
    };
}

function getSiteMenuValues(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(item => {
            if (typeof item === 'string') {
                return item;
            }
            const value = item?.value || item?.name;
            return typeof value === 'string'
                ? value.replace(/^\/+/, '').split(/[/?#]/)[0]
                : '';
        })
        .filter(Boolean);
}

function categoriesHaveCustomField(categories, fieldName) {
    return categories.some(category => {
        return hasOwn(category?.custom_fields, fieldName);
    });
}

function normalizeSiteCapabilities(data) {
    const filters = new Set(getSiteMenuValues(data?.filters));
    const topMenuItems = new Set(getSiteMenuValues(data?.top_menu_items));
    const anonymousMenuItems = new Set(
        getSiteMenuValues(data?.anonymous_top_menu_items),
    );
    const notificationTypes = data?.notification_types || {};
    const categories = getRawCategories(data);
    const hasTopicView = view => {
        if (filters.size === 0 && topMenuItems.size === 0) {
            return PUBLIC_TOPIC_VIEWS.includes(view);
        }
        if (filters.size === 0) {
            return topMenuItems.has(view);
        }
        if (topMenuItems.size === 0) {
            return filters.has(view);
        }
        return filters.has(view) && topMenuItems.has(view);
    };
    const solved = categoriesHaveCustomField(
        categories,
        'enable_accepted_answers',
    );
    const reactions =
        hasOwn(notificationTypes, 'reaction') ||
        hasOwn(data, 'enabled_reactions');
    const voting =
        filters.has('votes') ||
        categoriesHaveCustomField(categories, 'enable_topic_voting') ||
        categoriesHaveCustomField(categories, 'create_as_post_voting_default');
    const assign =
        hasOwn(notificationTypes, 'assigned') ||
        categoriesHaveCustomField(
            categories,
            'additional_assign_allowed_on_groups',
        );
    const calendarEvents =
        hasOwn(notificationTypes, 'event_reminder') ||
        hasOwn(notificationTypes, 'event_invitation') ||
        categoriesHaveCustomField(
            categories,
            'sort_topics_by_event_start_date',
        );
    const hashtagConfigurations = Object.values(
        data?.hashtag_configurations || {},
    );
    const chat =
        Object.keys(notificationTypes).some(type => type.startsWith('chat_')) ||
        hashtagConfigurations.some(configuration => {
            return (
                Array.isArray(configuration) &&
                configuration.includes('channel')
            );
        }) ||
        categoriesHaveCustomField(categories, 'has_chat_enabled');
    const plugins = {
        solved,
        reactions,
        voting,
        assign,
        calendarEvents,
        chat,
    };
    const topicViews = TOPIC_VIEWS.filter(hasTopicView);
    const anonymousTopicViews = TOPIC_VIEWS.filter(view => {
        return anonymousMenuItems.has(view);
    });

    return {
        topicViews,
        anonymousTopicViews:
            anonymousTopicViews.length > 0
                ? anonymousTopicViews
                : topicViews.filter(view => PUBLIC_TOPIC_VIEWS.includes(view)),
        viewRequirements: {
            latest: null,
            top: null,
            new: 'authenticated',
            unread: 'authenticated',
        },
        plugins,
        ...plugins,
        canTagTopics: Boolean(data?.can_tag_topics),
        canCreateTag: Boolean(data?.can_create_tag),
    };
}

function getTopicListPath({ view, categoryId, categorySlug, tag }) {
    if (!TOPIC_VIEWS.includes(view)) {
        throw new RangeError(`Unsupported Harbor topic view: ${view}`);
    }

    const hasCategory = categoryId != null || categorySlug;
    if (hasCategory && tag != null) {
        throw new TypeError(
            'Harbor topic list cannot filter category and tag together',
        );
    }

    if (tag != null) {
        const tagName =
            typeof tag === 'object'
                ? tag.name || tag.text || tag.id || tag.slug
                : tag;
        if (tagName == null || String(tagName).length === 0) {
            throw new TypeError('Harbor tag is required');
        }
        const basePath = `/tag/${encodeURIComponent(String(tagName))}`;
        return view === 'latest'
            ? `${basePath}.json`
            : `${basePath}/l/${view}.json`;
    }

    if (hasCategory) {
        const categoryPath = [categorySlug, categoryId]
            .filter(value => value != null && String(value).length > 0)
            .map(value => encodeURIComponent(String(value)))
            .join('/');
        const basePath = `/c/${categoryPath}`;
        return view === 'latest'
            ? `${basePath}.json`
            : `${basePath}/l/${view}.json`;
    }

    return `/${view}.json`;
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

export async function fetchHarborTopicList({
    view = 'latest',
    page = 0,
    categoryId,
    categorySlug,
    tag,
    signal,
} = {}) {
    const normalizedPage = Math.max(0, Math.floor(Number(page) || 0));
    const path = getTopicListPath({
        view,
        categoryId,
        categorySlug,
        tag,
    });
    const response = await harborApi.get(path, {
        params: { page: normalizedPage },
        signal,
    });
    const topicList = response.data?.topic_list;
    const rawTopics = topicList?.topics;
    if (!topicList || !Array.isArray(rawTopics)) {
        throw new Error('Invalid Harbor topic list response');
    }

    let categories = normalizeCategories(response.data);
    if (
        normalizedPage === 0 &&
        rawTopics.length > 0 &&
        categories.length === 0
    ) {
        try {
            categories = await fetchPublicHarborCategories();
        } catch {
            categories = [];
        }
    }
    const categoriesById = new Map(
        categories.map(category => [category.id, category]),
    );
    const users = getTopicUsers(response.data);
    const items = rawTopics
        .filter(Boolean)
        .map(topic =>
            normalizeTopicSummary(topic, {
                categoriesById,
                users,
            }),
        )
        .filter(topic => topic.id != null);
    const pageInfo = getTopicPageInfo(
        topicList,
        normalizedPage,
        rawTopics.length,
    );

    return {
        items,
        ...pageInfo,
        categories,
        capabilities: {
            canCreateTopic: Boolean(topicList.can_create_topic),
            solved: items.some(topic => topic.capabilities.solved),
        },
    };
}

export async function fetchHarborCategories({ signal } = {}) {
    const response = await harborApi.get('/categories.json', { signal });
    const items = normalizeCategories(response.data);

    return {
        items,
        hasMore: false,
        nextPage: null,
        canCreateCategory: Boolean(
            response.data?.category_list?.can_create_category,
        ),
        canCreateTopic: Boolean(response.data?.category_list?.can_create_topic),
    };
}

export async function fetchHarborTags({ signal } = {}) {
    const response = await harborApi.get('/tags.json', { signal });
    const rawTags = Array.isArray(response.data?.tags)
        ? response.data.tags
        : [];
    const items = rawTags.map(tag => normalizeTag(tag)).filter(Boolean);

    return {
        items,
        hasMore: false,
        nextPage: null,
    };
}

export async function fetchHarborSiteCapabilities({ signal } = {}) {
    const response = await harborApi.get('/site.json', { signal });
    return normalizeSiteCapabilities(response.data);
}

export async function fetchHarborUserActions(
    username,
    { kind = 'all', offset = 0, signal } = {},
) {
    const encodedUsername = encodeURIComponent(username);

    if (kind === 'bookmarks') {
        const response = await harborApi.get(
            `/u/${encodedUsername}/bookmarks.json`,
            { signal },
        );
        const bookmarks = response.data?.user_bookmark_list?.bookmarks || [];
        const items = bookmarks.map(normalizeBookmark);
        return { items, hasMore: false, nextOffset: items.length };
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

export async function fetchHarborNotifications({ signal } = {}) {
    const response = await harborApi.get('/notifications.json', { signal });
    return (response.data?.notifications || []).map(normalizeNotification);
}

export async function markHarborNotificationRead(notificationId) {
    const id = Number(notificationId);
    if (!Number.isInteger(id) || id <= 0) {
        return;
    }
    await harborApi.put('/notifications/mark-read.json', { id });
}

export async function fetchHarborMessages(username, { signal } = {}) {
    const encodedUsername = encodeURIComponent(username);
    const response = await harborApi.get(
        `/topics/private-messages/${encodedUsername}.json`,
        { signal },
    );
    return (response.data?.topic_list?.topics || []).map(normalizeMessage);
}

export async function fetchHarborTopic(topicId, { signal } = {}) {
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
                params: { post_ids: postIds },
                paramsSerializer: params =>
                    qs.stringify(params, { arrayFormat: 'brackets' }),
                signal,
            },
        );
        const batch = postsResponse.data?.post_stream?.posts;
        if (!Array.isArray(batch)) {
            throw new Error('Invalid Harbor posts response');
        }
        allPosts.push(...batch);
    }

    const category = await resolveTopicCategory(topic);
    return {
        ...topic,
        ...(category ? { category } : {}),
        post_stream: {
            ...topic.post_stream,
            posts: mergeTopicPosts(allPosts),
        },
    };
}

export async function fetchHarborBadges(username, { signal } = {}) {
    const encodedUsername = encodeURIComponent(username);
    const response = await harborApi.get(
        `/user-badges/${encodedUsername}.json`,
        { signal },
    );
    return normalizeBadges(response.data);
}

export async function fetchCurrentHarborUser(credentials) {
    const requestConfig = { harborCredentials: credentials };
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
