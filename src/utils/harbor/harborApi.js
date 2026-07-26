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

export const HARBOR_TOPIC_NOTIFICATION_LEVELS = Object.freeze({
    muted: 0,
    normal: 1,
    tracking: 2,
    watching: 3,
    watchingFirstPost: 4,
});

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

export function getHarborTopicViews(
    capabilities,
    { signedIn = false, unavailable = false } = {},
) {
    const fallbackViews = signedIn ? TOPIC_VIEWS : PUBLIC_TOPIC_VIEWS;
    if (!capabilities || unavailable) {
        return [...fallbackViews];
    }

    const available = signedIn
        ? capabilities.topicViews
        : capabilities.anonymousTopicViews;
    const supportedViews = Array.isArray(available)
        ? available.filter(view => TOPIC_VIEWS.includes(view))
        : fallbackViews;
    return supportedViews.length > 0
        ? supportedViews
        : [...fallbackViews];
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

    const uploadedLogo =
        category.uploaded_logo ||
        category.uploaded_logo_dark ||
        category.logo;
    const logoUrl =
        typeof uploadedLogo === 'string'
            ? uploadedLogo
            : typeof uploadedLogo?.url === 'string'
                ? uploadedLogo.url
                : null;

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
        emoji:
            typeof category.emoji === 'string' && category.emoji.trim()
                ? category.emoji.trim()
                : null,
        icon:
            typeof category.icon === 'string' && category.icon.trim()
                ? category.icon.trim()
                : null,
        styleType:
            typeof category.style_type === 'string' && category.style_type.trim()
                ? category.style_type.trim()
                : null,
        logoUrl,
        parentCategoryId: toNumberOrNull(category.parent_category_id),
        subcategoryIds,
        topicCount: toCount(category.topic_count ?? category.topics_all_time),
        postCount: toCount(category.post_count),
        position: toNumberOrNull(category.position),
        readRestricted: Boolean(category.read_restricted),
        notificationLevel: toNumberOrNull(category.notification_level),
        canCreateTopic: Boolean(category.can_create_topic),
        minimumRequiredTags: toCount(category.minimum_required_tags),
        allowedTags: Array.isArray(category.allowed_tags)
            ? category.allowed_tags.filter(tag => typeof tag === 'string')
            : [],
        allowedTagGroups: Array.isArray(category.allowed_tag_groups)
            ? category.allowed_tag_groups
            : [],
        requiredTagGroups: Array.isArray(category.required_tag_groups)
            ? category.required_tag_groups
            : [],
        topicTemplate:
            typeof category.topic_template === 'string'
                ? category.topic_template
                : null,
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
        .get('/categories.json', {
            params: { include_subcategories: true },
            skipHarborCredentials: true,
        })
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
    if (categoryId == null) {
        return inlineCategory;
    }

    try {
        const categories = await fetchPublicHarborCategories();
        const cached = categories.find(category => category.id === categoryId);
        if (cached) {
            return {
                ...cached,
                name: cached.name || inlineCategory?.name || '',
                slug: cached.slug || inlineCategory?.slug || '',
            };
        }
    } catch {
        // 公開分類快取失敗時退回 topic 內嵌資料
    }
    return inlineCategory;
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

function normalizeSearchResult(data, page, additionalUsers = []) {
    const rawPosts = Array.isArray(data?.posts) ? data.posts : [];
    const rawTopics = Array.isArray(data?.topics) ? data.topics : [];
    const rawUsers = [
        ...(Array.isArray(data?.users) ? data.users : []),
        ...additionalUsers,
    ];
    const categories = normalizeCategories(data);
    const categoriesById = new Map(
        categories.map(category => [category.id, category]),
    );
    const users = getTopicUsers({...data, users: rawUsers});
    const topicsById = new Map(
        rawTopics.map(topic => [toNumberOrNull(topic?.id), topic]),
    );
    const matchedTopicIds = new Set();
    const items = rawPosts
        .map((post, index) => {
            const topicId = toNumberOrNull(post?.topic_id);
            const postNumber = toNumberOrNull(post?.post_number);
            const rawTopic = topicsById.get(topicId);
            if (topicId == null || !rawTopic) {
                return null;
            }

            matchedTopicIds.add(topicId);
            const topic = normalizeTopicSummary(rawTopic, {
                categoriesById,
                users,
            });
            const author =
                users.usersByUsername.get(post?.username) ||
                normalizeUser({
                    username: post?.username,
                    avatar_template: post?.avatar_template,
                }) ||
                topic.author;

            return {
                id: `post-${post?.id ?? `${topicId}-${postNumber}-${index}`}`,
                kind: postNumber === 1 ? 'topic' : 'post',
                topicId,
                postId: toNumberOrNull(post?.id),
                postNumber,
                title: topic.title,
                excerpt: stripHtml(post?.blurb || topic.excerpt),
                author,
                createdAt: post?.created_at || topic.createdAt,
                likeCount: toCount(post?.like_count),
                category: topic.category,
                tags: topic.tags,
                topic,
            };
        })
        .filter(Boolean);

    rawTopics.forEach((rawTopic, index) => {
        const topicId = toNumberOrNull(rawTopic?.id);
        if (topicId == null || matchedTopicIds.has(topicId)) {
            return;
        }
        const topic = normalizeTopicSummary(rawTopic, {
            categoriesById,
            users,
        });
        items.push({
            id: `topic-${topicId}-${index}`,
            kind: 'topic',
            topicId,
            postId: null,
            postNumber: 1,
            title: topic.title,
            excerpt: topic.excerpt,
            author: topic.author,
            createdAt: topic.createdAt,
            likeCount: topic.likeCount,
            category: topic.category,
            tags: topic.tags,
            topic,
        });
    });

    const seenUserIds = new Set();
    rawUsers.forEach((rawUser, index) => {
        const user = normalizeUser(rawUser);
        if (!user) {
            return;
        }
        const userKey =
            user.id == null
                ? `username:${user.username.toLowerCase()}`
                : `id:${user.id}`;
        if (seenUserIds.has(userKey)) {
            return;
        }
        seenUserIds.add(userKey);
        items.push({
            id: `user-${user.id ?? user.username}-${index}`,
            kind: 'user',
            user,
        });
    });

    const groupedResult = data?.grouped_search_result || {};
    const hasMore = Boolean(
        groupedResult.more_full_page_results || groupedResult.more_posts,
    );

    return {
        items,
        hasMore,
        nextPage: hasMore ? page + 1 : null,
        searchLogId: toNumberOrNull(groupedResult.search_log_id),
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
        title: bookmark.name || bookmark.title || '',
        excerpt: stripHtml(bookmark.excerpt || bookmark.cooked),
        createdAt: bookmark.created_at || bookmark.updated_at || '',
        topicId: Number(bookmark.topic_id) || null,
        postNumber: Number(
            bookmark.linked_post_number || bookmark.post_number,
        ) || null,
        bookmarkName: bookmark.name || '',
        reminderAt: bookmark.reminder_at || null,
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

export async function fetchHarborSearch({
    query,
    userQuery = query,
    page = 0,
    signal,
} = {}) {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery) {
        return {
            items: [],
            hasMore: false,
            nextPage: null,
            searchLogId: null,
        };
    }

    const normalizedPage = Math.max(0, Math.floor(Number(page) || 0));
    const response = await harborApi.get('/search.json', {
        params: {
            q: normalizedQuery,
            page: normalizedPage,
        },
        signal,
    });
    const data = response.data;
    if (!data?.grouped_search_result || !Array.isArray(data?.posts)) {
        throw new Error('Invalid Harbor search response');
    }
    if (data.grouped_search_result.error) {
        const searchError = new Error('Harbor search query rejected');
        searchError.code = 'INVALID_HARBOR_SEARCH_QUERY';
        throw searchError;
    }

    let additionalUsers = [];
    const normalizedUserQuery =
        typeof userQuery === 'string' ? userQuery.trim() : '';
    if (normalizedPage === 0 && normalizedUserQuery) {
        try {
            const userResponse = await harborApi.get('/search/query.json', {
                params: {
                    term: normalizedUserQuery,
                    include_blurbs: true,
                },
                signal,
            });
            additionalUsers = Array.isArray(userResponse.data?.users)
                ? userResponse.data.users
                : [];
        } catch (error) {
            if (signal?.aborted || error?.code === 'ERR_CANCELED') {
                throw error;
            }
        }
    }

    let categories = normalizeCategories(data);
    if (data.topics?.length > 0 && categories.length === 0) {
        try {
            categories = await fetchPublicHarborCategories();
        } catch {
            categories = [];
        }
    }

    return normalizeSearchResult(
        categories.length > 0
            ? {
                ...data,
                categories,
            }
            : data,
        normalizedPage,
        additionalUsers,
    );
}

export async function fetchHarborCategories({ signal } = {}) {
    const response = await harborApi.get('/categories.json', {
        params: { include_subcategories: true },
        signal,
    });
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

export async function fetchHarborComposerSettings({ signal } = {}) {
    const response = await harborApi.get('/site/settings.json', { signal });
    const settings = response.data?.site_settings || response.data;

    return {
        minTopicTitleLength:
            toNumberOrNull(settings?.min_topic_title_length) ?? 1,
        maxTopicTitleLength:
            toNumberOrNull(settings?.max_topic_title_length),
        minPostLength: toNumberOrNull(settings?.min_post_length) ?? 1,
        minFirstPostLength:
            toNumberOrNull(settings?.min_first_post_length) ??
            toNumberOrNull(settings?.min_post_length) ??
            1,
        maxPostLength: toNumberOrNull(settings?.max_post_length),
        maxTagsPerTopic:
            toNumberOrNull(settings?.max_tags_per_topic),
        defaultCategoryId: toNumberOrNull(
            settings?.default_composer_category,
        ),
        allowUncategorizedTopics: Boolean(
            settings?.allow_uncategorized_topics,
        ),
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
            {
                params: { page: Math.max(0, Number(offset) || 0) },
                signal,
            },
        );
        const bookmarkList = response.data?.user_bookmark_list || {};
        const bookmarks = bookmarkList.bookmarks || [];
        const items = bookmarks.map(normalizeBookmark);
        const hasMore = Boolean(bookmarkList.more_bookmarks_url);
        return {
            items,
            hasMore,
            nextOffset: hasMore ? Math.max(0, Number(offset) || 0) + 1 : null,
        };
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

export async function fetchHarborTopic(
    topicId,
    { postNumber, signal, trackPageView = false } = {},
) {
    const encodedTopicId = encodeURIComponent(topicId);
    const normalizedPostNumber = Number(postNumber);
    const topicPath =
        Number.isInteger(normalizedPostNumber) && normalizedPostNumber > 0
            ? `/t/${encodedTopicId}/${normalizedPostNumber}.json`
            : `/t/${encodedTopicId}.json`;
    const topicResponse = await harborApi.get(topicPath, {
        params: {
            track_visit: true,
            forceLoad: true,
        },
        ...(trackPageView
            ? {
                headers: {
                    'Discourse-Track-View': 'true',
                    'Discourse-Track-View-Topic-Id': String(topicId),
                },
            }
            : {}),
        signal,
    });
    const topic = topicResponse.data;
    const stream = topic?.post_stream?.stream;
    const initialPosts = topic?.post_stream?.posts;

    if (!topic?.id || !Array.isArray(stream) || !Array.isArray(initialPosts)) {
        throw new Error('Invalid Harbor topic response');
    }

    const category = await resolveTopicCategory(topic);
    return {
        ...topic,
        ...(category ? { category } : {}),
    };
}

export async function fetchHarborTopicPosts(
    topicId,
    postIds,
    { signal } = {},
) {
    const uniquePostIds = [
        ...new Set(
            (Array.isArray(postIds) ? postIds : [])
                .map(postId => Number(postId))
                .filter(postId => Number.isInteger(postId) && postId > 0),
        ),
    ];
    if (uniquePostIds.length === 0) {
        return [];
    }

    const encodedTopicId = encodeURIComponent(topicId);
    const posts = [];
    for (
        let index = 0;
        index < uniquePostIds.length;
        index += TOPIC_POST_BATCH_SIZE
    ) {
        if (signal?.aborted) {
            const canceledError = new Error('Request canceled');
            canceledError.code = 'ERR_CANCELED';
            throw canceledError;
        }

        const batchPostIds = uniquePostIds.slice(
            index,
            index + TOPIC_POST_BATCH_SIZE,
        );
        const postsResponse = await harborApi.get(
            `/t/${encodedTopicId}/posts.json`,
            {
                params: { post_ids: batchPostIds },
                paramsSerializer: params =>
                    qs.stringify(params, { arrayFormat: 'brackets' }),
                signal,
            },
        );
        const batch = postsResponse.data?.post_stream?.posts;
        if (!Array.isArray(batch)) {
            throw new Error('Invalid Harbor posts response');
        }
        posts.push(...batch);
    }

    return mergeTopicPosts(posts);
}

export async function saveHarborTopicTimings(
    topicId,
    { postNumber, timeMs = 0, topicTimeMs = 0 } = {},
) {
    const normalizedTopicId = Number(topicId);
    const normalizedPostNumber = Number(postNumber);
    if (
        !Number.isInteger(normalizedTopicId) ||
        normalizedTopicId <= 0 ||
        !Number.isInteger(normalizedPostNumber) ||
        normalizedPostNumber <= 0
    ) {
        return;
    }

    const normalizeTime = value => {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
    };
    await harborApi.post('/topics/timings', {
        topic_id: normalizedTopicId,
        topic_time: normalizeTime(topicTimeMs),
        timings: {
            [normalizedPostNumber]: normalizeTime(timeMs),
        },
    });
}

function normalizeHarborMutationId(value, label) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new TypeError(`Invalid Harbor ${label}`);
    }
    return id;
}

function normalizeHarborComposerText(value, label) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new TypeError(`Invalid Harbor ${label}`);
    }
    return value;
}

function normalizeHarborComposerTags(tags, label) {
    if (!Array.isArray(tags)) {
        throw new TypeError(`Invalid Harbor ${label}`);
    }

    return tags.map(tag => {
        if (typeof tag === 'string') {
            const name = tag.trim();
            if (!name) {
                throw new TypeError(`Invalid Harbor ${label}`);
            }
            return { name };
        }

        if (!tag || typeof tag !== 'object' || Array.isArray(tag)) {
            throw new TypeError(`Invalid Harbor ${label}`);
        }

        const name =
            typeof tag.name === 'string' ? tag.name.trim() : '';
        if (!name) {
            throw new TypeError(`Invalid Harbor ${label}`);
        }

        if (tag.id == null || tag.id === '') {
            return { name };
        }

        return {
            id: normalizeHarborMutationId(tag.id, 'tag id'),
            name,
        };
    });
}

export async function createHarborPost({
    raw,
    title,
    categoryId,
    tags,
    topicId,
    replyToPostNumber,
    draftKey,
    signal,
} = {}) {
    const payload = {
        raw: normalizeHarborComposerText(raw, 'post raw'),
    };
    const hasTopicId = topicId != null;

    if (hasTopicId) {
        payload.topic_id = normalizeHarborMutationId(topicId, 'topic id');
    } else {
        payload.title = normalizeHarborComposerText(title, 'topic title');
    }

    if (title != null && hasTopicId) {
        throw new TypeError('Invalid Harbor topic title');
    }
    if (categoryId != null) {
        if (hasTopicId) {
            throw new TypeError('Invalid Harbor category id');
        }
        payload.category = normalizeHarborMutationId(
            categoryId,
            'category id',
        );
    }
    if (tags != null) {
        if (hasTopicId) {
            throw new TypeError('Invalid Harbor post tags');
        }
        const normalizedTags = normalizeHarborComposerTags(tags, 'post tags');
        if (normalizedTags.length > 0) {
            payload.tags = normalizedTags;
        }
    }
    if (replyToPostNumber != null) {
        if (!hasTopicId) {
            throw new TypeError('Invalid Harbor reply post number');
        }
        payload.reply_to_post_number = normalizeHarborMutationId(
            replyToPostNumber,
            'reply post number',
        );
    }
    if (draftKey != null) {
        payload.draft_key = normalizeHarborComposerText(
            draftKey,
            'draft key',
        );
    }

    const response = await harborApi.post('/posts.json', payload, { signal });
    return response.data;
}

export async function fetchHarborPostForEdit(postId, { signal } = {}) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const response = await harborApi.get(`/posts/${id}.json`, { signal });
    const post = response.data;

    if (typeof post?.raw !== 'string') {
        throw new Error('Invalid Harbor editable post response: missing raw');
    }

    return {
        id: toNumberOrNull(post.id) ?? id,
        raw: post.raw,
        topicId: toNumberOrNull(post.topic_id),
        postNumber: toNumberOrNull(post.post_number),
        title: post.topic_title || post.title || '',
        categoryId: toNumberOrNull(post.category_id),
        tags: Array.isArray(post.tags)
            ? normalizeHarborComposerTags(post.tags, 'post tags')
            : null,
        canEdit: Boolean(post.can_edit),
    };
}

export async function updateHarborPost(
    postId,
    {
        raw,
        originalText,
        topicId,
        title,
        originalTitle,
        categoryId,
        tags,
        originalTags,
        signal,
    } = {},
) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const post = {
        raw: normalizeHarborComposerText(raw, 'post raw'),
        original_text: normalizeHarborComposerText(
            originalText,
            'original post raw',
        ),
    };
    const hasTopicMetadata =
        title != null || categoryId != null || tags != null;

    let normalizedTopicId = null;
    let topic = null;

    if (hasTopicMetadata) {
        normalizedTopicId = normalizeHarborMutationId(
            topicId,
            'topic id',
        );
        topic = {};

        if (title != null) {
            topic.title = normalizeHarborComposerText(title, 'topic title');
        }
        if (originalTitle != null) {
            topic.original_title = normalizeHarborComposerText(
                originalTitle,
                'original topic title',
            );
        }
        if (categoryId != null) {
            topic.category_id = normalizeHarborMutationId(
                categoryId,
                'category id',
            );
        }
        if (tags != null) {
            topic.tags = normalizeHarborComposerTags(tags, 'topic tags');
        }
        if (originalTags != null) {
            topic.original_tags = normalizeHarborComposerTags(
                originalTags,
                'original topic tags',
            );
        }
    } else {
        if (topicId != null) {
            normalizeHarborMutationId(topicId, 'topic id');
        }
        if (originalTitle != null) {
            normalizeHarborComposerText(
                originalTitle,
                'original topic title',
            );
        }
        if (originalTags != null) {
            normalizeHarborComposerTags(
                originalTags,
                'original topic tags',
            );
        }
    }

    const response = await harborApi.put(
        `/posts/${id}.json`,
        { post },
        { signal },
    );

    if (topic) {
        try {
            await harborApi.put(
                `/t/${normalizedTopicId}.json`,
                topic,
                { signal },
            );
        } catch (error) {
            error.harborPostUpdated = true;
            error.harborUpdatedPost = response.data;
            throw error;
        }
    }

    return response.data;
}

function normalizeBookmarkFields({ name = '', reminderAt = null } = {}) {
    return {
        name: typeof name === 'string' ? name.trim() || null : null,
        reminder_at: reminderAt || null,
    };
}

export async function likeHarborPost(postId) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const response = await harborApi.post('/post_actions.json', {
        id,
        post_action_type_id: 2,
    });
    return response.data;
}

export async function unlikeHarborPost(postId) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const response = await harborApi.delete(`/post_actions/${id}.json`, {
        data: { post_action_type_id: 2 },
    });
    return response.data;
}

export async function toggleHarborPostReaction(postId, reaction) {
    const id = normalizeHarborMutationId(postId, 'post id');
    if (typeof reaction !== 'string' || !reaction.trim()) {
        throw new TypeError('Invalid Harbor reaction');
    }
    const encodedReaction = encodeURIComponent(reaction.trim());
    const response = await harborApi.put(
        `/discourse-reactions/posts/${id}/custom-reactions/${encodedReaction}/toggle.json`,
    );
    return response.data;
}

export async function createHarborPostBookmark(postId, fields = {}) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const response = await harborApi.post('/bookmarks.json', {
        bookmarkable_id: id,
        bookmarkable_type: 'Post',
        ...normalizeBookmarkFields(fields),
    });
    return response.data;
}

export async function updateHarborBookmark(bookmarkId, fields = {}) {
    const id = normalizeHarborMutationId(bookmarkId, 'bookmark id');
    const response = await harborApi.put(`/bookmarks/${id}.json`, {
        id,
        ...normalizeBookmarkFields(fields),
    });
    return response.data;
}

export async function deleteHarborBookmark(bookmarkId) {
    const id = normalizeHarborMutationId(bookmarkId, 'bookmark id');
    const response = await harborApi.delete(`/bookmarks/${id}.json`);
    return response.data;
}

export async function setHarborTopicNotificationLevel(topicId, level) {
    const id = normalizeHarborMutationId(topicId, 'topic id');
    const notificationLevel = Number(level);
    if (
        !Object.values(HARBOR_TOPIC_NOTIFICATION_LEVELS).includes(
            notificationLevel,
        )
    ) {
        throw new TypeError('Invalid Harbor topic notification level');
    }
    const response = await harborApi.post(`/t/${id}/notifications.json`, {
        notification_level: notificationLevel,
    });
    return response.data;
}

export async function markHarborTopicUnread(topicId) {
    const id = normalizeHarborMutationId(topicId, 'topic id');
    await harborApi.delete(`/t/${id}/timings.json`);
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
