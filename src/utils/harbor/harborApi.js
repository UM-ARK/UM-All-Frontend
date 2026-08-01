import axios from 'axios';
import qs from 'qs';

import {
    ARK_HARBOR,
    ARK_HARBOR_ABSOLUTE_URL,
    ARK_HARBOR_AVATAR_TEMPLATE,
} from '../pathMap';
import {
    getHarborHtmlAttribute,
    replaceHarborEmojiShortcodes,
} from './harborHtml';
import {
    createHarborRateLimitCooldownError,
    isHarborRateLimited,
    recordHarborRateLimit,
} from './harborRateLimit';

const REQUEST_TIMEOUT = 15000;
const TOPIC_POST_BATCH_SIZE = 20;
const USER_ACTION_PAGE_SIZE = 30;
const NOTIFICATION_PAGE_SIZE = 30;
const REACTION_GIVEN_PAGE_SIZE = 20;
const DEFAULT_TOPIC_PAGE_SIZE = 30;
const COMPOSER_METADATA_TTL = 5 * 60 * 1000;
const COMPOSER_SETTINGS_TTL = 30 * 60 * 1000;
const SESSION_VALIDATION_COOLDOWN = 30 * 1000;
const TOPIC_VIEWS = ['latest', 'top', 'new', 'unread'];
const PUBLIC_TOPIC_VIEWS = ['latest', 'top'];

const HARBOR_NOTIFICATION_TYPES = Object.freeze({
    1: 'mentioned',
    2: 'replied',
    3: 'quoted',
    4: 'edited',
    5: 'liked',
    6: 'private_message',
    7: 'invited_to_private_message',
    8: 'invitee_accepted',
    9: 'posted',
    10: 'moved_post',
    11: 'linked',
    12: 'granted_badge',
    13: 'invited_to_topic',
    14: 'custom',
    15: 'group_mentioned',
    16: 'group_message_summary',
    17: 'watching_first_post',
    18: 'topic_reminder',
    19: 'liked_consolidated',
    20: 'post_approved',
    21: 'code_review_commit_approved',
    22: 'membership_request_accepted',
    23: 'membership_request_consolidated',
    24: 'bookmark_reminder',
    25: 'reaction',
    26: 'votes_released',
    27: 'event_reminder',
    28: 'event_invitation',
    29: 'chat_mention',
    30: 'chat_message',
    31: 'chat_invitation',
    32: 'chat_group_mention',
    33: 'chat_quoted',
    34: 'assigned',
    35: 'question_answer_user_commented',
    36: 'watching_category_or_tag',
    37: 'new_features',
    38: 'admin_problems',
    39: 'linked_consolidated',
    40: 'chat_watched_thread',
    41: 'upcoming_change_available',
    42: 'upcoming_change_automatically_promoted',
    43: 'boost',
    44: 'suggested_edit_created',
    45: 'suggested_edit_accepted',
    800: 'following',
    801: 'following_created_topic',
    802: 'following_replied',
    900: 'circles_activity',
});

const USER_ACTION_FILTERS = {
    all: '1,2,3,4,5,6,7,9,11,12,13',
    // likes 改走 discourse-reactions；此處保留給合併 heart 影子讚
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
let sessionValidationRequest = null;
let sessionValidationAt = 0;
let sessionValidationResult = null;
let sessionValidationError = null;
let discoveryCategoryCache = null;
let discoveryCategoryRequest = null;
let discoveryCategoryCacheGeneration = 0;
const composerMetadataCache = {
    categories: {value: null, expiresAt: 0, request: null, generation: 0},
    tags: {value: null, expiresAt: 0, request: null, generation: 0},
    settings: {value: null, expiresAt: 0, request: null, generation: 0},
    flagTypes: {value: null, expiresAt: 0, request: null, generation: 0},
};

harborApi.interceptors.request.use(config => {
    const cooldownError = createHarborRateLimitCooldownError();
    if (cooldownError) {
        cooldownError.config = config;
        return Promise.reject(cooldownError);
    }
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
        if (
            isHarborRateLimited(error) &&
            error.code !== 'HARBOR_RATE_LIMIT_COOLDOWN'
        ) {
            recordHarborRateLimit(error);
        }
        if (error.response?.status === 401 && credentialRejectedHandler) {
            credentialRejectedHandler(error, error.config?.harborCredentialKey);
        }
        return Promise.reject(error);
    },
);

export function setActiveHarborCredentials(credentials) {
    const previousCredentialKey = activeCredentials?.userApiKey;
    activeCredentials = credentials;
    if (previousCredentialKey !== credentials?.userApiKey) {
        sessionValidationRequest = null;
        sessionValidationAt = 0;
        sessionValidationResult = null;
        sessionValidationError = null;
        clearHarborDiscoveryCache();
        clearHarborComposerMetadataCache();
    }
}

export function setHarborCredentialRejectedHandler(handler) {
    credentialRejectedHandler = handler;
}

export function clearHarborDiscoveryCache() {
    discoveryCategoryCacheGeneration += 1;
    discoveryCategoryCache = null;
    discoveryCategoryRequest = null;
}

export function clearHarborComposerMetadataCache() {
    Object.values(composerMetadataCache).forEach(entry => {
        entry.generation += 1;
        entry.value = null;
        entry.expiresAt = 0;
        entry.request = null;
    });
}

export function isHarborCredentialRejected(error, validationRequest = false) {
    const status = error?.response?.status;
    return status === 401 || (validationRequest && status === 403);
}

export function validateActiveHarborSession() {
    const credentials = activeCredentials;
    if (!credentials?.userApiKey) {
        return Promise.resolve(false);
    }
    if (sessionValidationRequest) {
        return sessionValidationRequest;
    }
    if (Date.now() - sessionValidationAt < SESSION_VALIDATION_COOLDOWN) {
        if (sessionValidationError) {
            return Promise.reject(sessionValidationError);
        }
        if (sessionValidationResult != null) {
            return Promise.resolve(sessionValidationResult);
        }
    }

    sessionValidationAt = Date.now();
    sessionValidationResult = null;
    sessionValidationError = null;
    const credentialKey = credentials.userApiKey;
    const request = fetchCurrentHarborSession(credentials)
        .then(() => {
            if (activeCredentials?.userApiKey !== credentialKey) {
                return null;
            }
            sessionValidationResult = true;
            return true;
        })
        .catch(error => {
            if (activeCredentials?.userApiKey !== credentialKey) {
                return null;
            }
            if (
                isHarborCredentialRejected(error, true) ||
                error?.code === 'INVALID_HARBOR_SESSION'
            ) {
                sessionValidationResult = false;
                credentialRejectedHandler?.(error, credentialKey);
                return false;
            }
            sessionValidationError = error;
            throw error;
        })
        .finally(() => {
            if (sessionValidationRequest === request) {
                sessionValidationRequest = null;
            }
        });
    sessionValidationRequest = request;
    return request;
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

    return replaceHarborEmojiShortcodes(
        value
            // emoji 圖片先保留 shortcode，避免整段標籤被清掉後表情消失
            .replace(/<img\b[^>]*>/gi, tag => {
                const className = getHarborHtmlAttribute(tag, 'class');
                if (!className.split(/\s+/).includes('emoji')) {
                    return ' ';
                }
                return (
                    getHarborHtmlAttribute(tag, 'alt') ||
                    getHarborHtmlAttribute(tag, 'title') ||
                    ' '
                );
            })
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
            .trim(),
    );
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

function fetchHarborDiscoveryCategories() {
    if (discoveryCategoryCache) {
        return Promise.resolve(discoveryCategoryCache);
    }
    if (discoveryCategoryRequest) {
        return discoveryCategoryRequest;
    }

    const requestGeneration = discoveryCategoryCacheGeneration;
    const credentials = activeCredentials;
    const request = harborApi
        .get('/categories.json', {
            params: { include_subcategories: true },
            ...(credentials
                ? { harborCredentials: credentials }
                : { skipHarborCredentials: true }),
        })
        .then(response => {
            const categories = normalizeCategories(response.data);
            if (requestGeneration === discoveryCategoryCacheGeneration) {
                discoveryCategoryCache = categories;
            }
            return categories;
        })
        .finally(() => {
            if (discoveryCategoryRequest === request) {
                discoveryCategoryRequest = null;
            }
        });
    discoveryCategoryRequest = request;
    return discoveryCategoryRequest;
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
        const categories = await fetchHarborDiscoveryCategories();
        const cached = categories.find(category => category.id === categoryId);
        if (cached) {
            return {
                ...cached,
                name: cached.name || inlineCategory?.name || '',
                slug: cached.slug || inlineCategory?.slug || '',
            };
        }
    } catch {
        // 分類快取失敗時退回 topic 內嵌資料
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
        replyCount: Math.max(toCount(topic?.reply_count), postCount - 1, 0),
        viewCount: toCount(topic?.views),
        likeCount: toCount(topic?.like_count),
        // Discourse 登入後列表會帶 liked（TopicUser.liked）
        liked: Boolean(topic?.liked),
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
                // 寫回搜尋命中作者，讓複用 HarborTopicCard 時頭像／ID 正確
                topic: author ? {...topic, author} : topic,
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

// discourse-reactions「我回應過」列表項目
function normalizeReactionGiven(item, index) {
    const post = item?.post || {};
    const topic = post.topic || {};
    const reactionId = item?.id;
    return {
        id: String(
            reactionId ||
            item?.post_id ||
            post.id ||
            `reaction-${index}`,
        ),
        kind: 'like',
        title: post.topic_title || topic.title || '',
        excerpt: stripHtml(post.excerpt || ''),
        createdAt: item?.created_at || '',
        topicId: Number(post.topic_id || topic.id) || null,
        postNumber: Number(post.post_number) || null,
    };
}

// discourse-reactions「收到的讚」列表項目（含按讚者頭像）
function normalizeReactionReceived(item, index) {
    const post = item?.post || {};
    const topic = post.topic || {};
    const actor = item?.user || {};
    const reaction = item?.reaction || {};
    const reactionId = item?.id;
    const avatarTemplate =
        actor.avatar_template || actor.avatarTemplate || '';
    return {
        id: String(
            reactionId ||
            item?.post_id ||
            post.id ||
            `reaction-received-${index}`,
        ),
        kind: 'likeReceived',
        title: post.topic_title || topic.title || topic.fancy_title || '',
        excerpt: stripHtml(post.excerpt || ''),
        createdAt: item?.created_at || reaction.created_at || '',
        topicId: Number(post.topic_id || topic.id) || null,
        postNumber: Number(post.post_number) || null,
        actingUsername: actor.username || '',
        avatarUrl: avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate, 72)
            : '',
        reactionValue:
            typeof reaction.reaction_value === 'string'
                ? reaction.reaction_value.trim()
                : '',
    };
}

function mergeLikeActivityItems(primaryItems, secondaryItems) {
    const seen = new Set();
    const merged = [];
    [...(primaryItems || []), ...(secondaryItems || [])].forEach(item => {
        const dedupeKey =
            item.topicId != null && item.postNumber != null
                ? `${item.topicId}:${item.postNumber}`
                : `id:${item.id}`;
        if (seen.has(dedupeKey)) {
            return;
        }
        seen.add(dedupeKey);
        merged.push(item);
    });
    return merged.sort((left, right) => {
        const leftTime = Date.parse(left.createdAt) || 0;
        const rightTime = Date.parse(right.createdAt) || 0;
        return rightTime - leftTime;
    });
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
    const type = Number(notification.notification_type) || 0;
    return {
        id: String(notification.id || `notification-${index}`),
        title: stripHtml(
            data.topic_title ||
            notification.fancy_title ||
            data.badge_name ||
            data.title ||
            data.display_username ||
            data.username ||
            '',
        ),
        excerpt: stripHtml(data.excerpt || data.message),
        createdAt: notification.created_at || '',
        isRead: Boolean(notification.read),
        type,
        typeName: HARBOR_NOTIFICATION_TYPES[type] || 'unknown',
        highPriority: Boolean(notification.high_priority),
        topicId: Number(notification.topic_id) || null,
        postNumber: Number(notification.post_number) || null,
        badgeId: Number(data.badge_id) || null,
        slug: notification.slug || '',
        actingUsername:
            data.display_username ||
            data.username ||
            notification.acting_user_name ||
            '',
        data,
    };
}

// 私信列表：取對方會員（優先最新發言者，排除自己）
function resolvePrivateMessageCounterpart(topic, users, currentUsername) {
    const posters = Array.isArray(topic?.posters) ? topic.posters : [];
    let latestOther = null;
    let firstOther = null;
    posters.forEach(poster => {
        const user = users.usersById.get(toNumberOrNull(poster?.user_id));
        if (!user?.username || user.username === currentUsername) {
            return;
        }
        if (!firstOther) {
            firstOther = user;
        }
        if (
            String(poster?.extras || '')
                .split(/\s+/)
                .includes('latest')
        ) {
            latestOther = user;
        }
    });
    if (latestOther || firstOther) {
        return latestOther || firstOther;
    }
    const lastPosterUsername = topic?.last_poster_username || '';
    if (lastPosterUsername && lastPosterUsername !== currentUsername) {
        return (
            users.usersByUsername.get(lastPosterUsername) || {
                id: null,
                username: lastPosterUsername,
                name: '',
                avatarUrl: null,
            }
        );
    }
    return null;
}

function normalizeMessage(topic, index, { users, currentUsername } = {}) {
    const emptyUsers = { usersById: new Map(), usersByUsername: new Map() };
    const counterpart = resolvePrivateMessageCounterpart(
        topic,
        users || emptyUsers,
        currentUsername || '',
    );
    return {
        id: String(topic.id || `message-${index}`),
        title: topic.title || '',
        excerpt: stripHtml(topic.excerpt),
        createdAt: topic.last_posted_at || topic.created_at || '',
        unreadCount: Number(topic.unread_posts || topic.new_posts || 0),
        topicId: Number(topic.id) || null,
        slug: topic.slug || '',
        actingUsername: counterpart?.username || '',
        avatarUrl: counterpart?.avatarUrl || null,
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
                description: stripHtml(badge.description),
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
    badgeData,
    availability,
    previousUser,
) {
    const profile = profileData?.user || {};
    const summary = summaryData?.user_summary || {};
    const username = currentUser.username || profile.username;
    const matchingPreviousUser =
        previousUser?.username === username ? previousUser : null;
    const avatarTemplate =
        currentUser.avatar_template || profile.avatar_template || '';
    const createdAt = profile.created_at ? new Date(profile.created_at) : null;
    const joinedAt =
        createdAt && !Number.isNaN(createdAt.getTime())
            ? `${createdAt.getFullYear()}-${String(
                createdAt.getMonth() + 1,
            ).padStart(2, '0')}`
            : matchingPreviousUser?.joinedAt || '';

    let role =
        profile.title ||
        profile.primary_group_name ||
        matchingPreviousUser?.role ||
        '';
    if (currentUser.admin || profile.admin) {
        role = '管理員';
    } else if (currentUser.moderator || profile.moderator) {
        role = '版主';
    } else if (!role) {
        role = 'Harbor 會員';
    }

    const badges = availability.badges
        ? normalizeBadges(badgeData)
        : matchingPreviousUser?.badges || [];
    const previousMetric = (collection, key) =>
        matchingPreviousUser?.[collection]?.find(item => item.key === key)
            ?.value;
    const summaryMetric = (collection, key, value, transform = item => item) =>
        availability.summary
            ? String(transform(value ?? 0))
            : previousMetric(collection, key) ?? '—';
    const badgeCount =
        availability.profile && profile.badge_count != null
            ? String(profile.badge_count)
            : availability.badges
            ? String(badges.length)
            : previousMetric('contributions', 'badges') ?? '—';
    const unavailableProfileSections = Object.entries(availability)
        .filter(([, available]) => !available)
        .map(([section]) => section);
    const currentUnreadNotifications = toNumberOrNull(
        currentUser.unread_notifications,
    );
    const currentUnreadMessages = toNumberOrNull(
        currentUser.unread_private_messages,
    );
    const previousProfile = matchingPreviousUser?.profile || {};
    const profileGroups = Array.isArray(profile.groups)
        ? profile.groups
        : null;
    const isUMer = profileGroups
        ? profileGroups.some(group => group?.name === 'UMer')
        : Boolean(matchingPreviousUser?.isUMer);

    return {
        displayName:
            currentUser.name ||
            profile.name ||
            matchingPreviousUser?.displayName ||
            username,
        username,
        role,
        trustLevel: Number(
            profile.trust_level ??
            currentUser.trust_level ??
            matchingPreviousUser?.trustLevel ??
            0,
        ),
        joinedAt,
        unreadNotifications: currentUnreadNotifications != null
            ? currentUnreadNotifications
            : Number(matchingPreviousUser?.unreadNotifications || 0),
        unreadMessages: currentUnreadMessages != null
            ? currentUnreadMessages
            : Number(matchingPreviousUser?.unreadMessages || 0),
        avatarUrl: avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate, 144)
            : matchingPreviousUser?.avatarUrl || null,
        isUMer,
        profile: {
            bio:
                typeof profile.bio_raw === 'string'
                    ? profile.bio_raw
                    : previousProfile.bio || '',
            location:
                typeof profile.location === 'string'
                    ? profile.location
                    : previousProfile.location || '',
            website:
                typeof profile.website === 'string'
                    ? profile.website
                    : previousProfile.website || '',
            workStatus:
                typeof profile.user_fields?.['1'] === 'string'
                    ? profile.user_fields['1']
                    : previousProfile.workStatus || '',
            canEdit:
                typeof profile.can_edit === 'boolean'
                    ? profile.can_edit
                    : Boolean(previousProfile.canEdit),
            canChangeBio:
                typeof profile.can_change_bio === 'boolean'
                    ? profile.can_change_bio
                    : Boolean(previousProfile.canChangeBio),
            canChangeLocation:
                typeof profile.can_change_location === 'boolean'
                    ? profile.can_change_location
                    : Boolean(previousProfile.canChangeLocation),
            canChangeWebsite:
                typeof profile.can_change_website === 'boolean'
                    ? profile.can_change_website
                    : Boolean(previousProfile.canChangeWebsite),
        },
        contributions: [
            {
                key: 'topicsCreated',
                value: summaryMetric(
                    'contributions',
                    'topicsCreated',
                    summary.topic_count,
                ),
                label: '建立話題',
            },
            {
                key: 'postsCreated',
                value: summaryMetric(
                    'contributions',
                    'postsCreated',
                    summary.post_count,
                ),
                label: '發布貼文',
            },
            {
                key: 'likesReceived',
                value: summaryMetric(
                    'contributions',
                    'likesReceived',
                    summary.likes_received,
                ),
                label: '收到的讚',
            },
            {
                key: 'badges',
                value: badgeCount,
                label: '徽章',
            },
        ],
        stats: [
            {
                key: 'daysVisited',
                value: summaryMetric(
                    'stats',
                    'daysVisited',
                    summary.days_visited,
                ),
                label: '活躍天數',
            },
            {
                key: 'readTime',
                value: summaryMetric(
                    'stats',
                    'readTime',
                    summary.time_read,
                    value =>
                        Math.max(0, Math.round(Number(value || 0) / 60)),
                ),
                label: '閱讀時間（分鐘）',
            },
            {
                key: 'topicsRead',
                value: summaryMetric(
                    'stats',
                    'topicsRead',
                    summary.topics_entered,
                ),
                label: '已讀話題',
            },
        ],
        badges,
        partialProfile: unavailableProfileSections.length > 0,
        usedPreviousProfileData: Boolean(
            matchingPreviousUser && unavailableProfileSections.length > 0,
        ),
        unavailableProfileSections,
    };
}

async function buildNormalizedTopicListResult(data, page) {
    const topicList = data?.topic_list;
    const rawTopics = topicList?.topics;
    if (!topicList || !Array.isArray(rawTopics)) {
        throw new Error('Invalid Harbor topic list response');
    }

    let categories = normalizeCategories(data);
    if (rawTopics.length > 0 && categories.length === 0) {
        try {
            categories = await fetchHarborDiscoveryCategories();
        } catch {
            categories = [];
        }
    }
    const categoriesById = new Map(
        categories.map(category => [category.id, category]),
    );
    const users = getTopicUsers(data);
    const items = rawTopics
        .filter(Boolean)
        .map(topic =>
            normalizeTopicSummary(topic, {
                categoriesById,
                users,
            }),
        )
        .filter(topic => topic.id != null);
    const pageInfo = getTopicPageInfo(topicList, page, rawTopics.length);

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
    return buildNormalizedTopicListResult(response.data, normalizedPage);
}

// 使用者建立的話題列表（發佈頁）
export async function fetchHarborUserCreatedTopics(
    username,
    { page = 0, signal } = {},
) {
    if (typeof username !== 'string' || !username.trim()) {
        throw new TypeError('Harbor username is required');
    }
    const normalizedPage = Math.max(0, Math.floor(Number(page) || 0));
    const encodedUsername = encodeURIComponent(username.trim());
    const response = await harborApi.get(
        `/topics/created-by/${encodedUsername}.json`,
        {
            params: { page: normalizedPage },
            signal,
        },
    );
    return buildNormalizedTopicListResult(response.data, normalizedPage);
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
            categories = await fetchHarborDiscoveryCategories();
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
        simultaneousUploads:
            toNumberOrNull(settings?.simultaneous_uploads) ?? 15,
        maxImageSizeKb:
            toNumberOrNull(settings?.max_image_size_kb),
    };
}

function getCachedComposerMetadata(
    cacheKey,
    load,
    ttl,
    forceRefresh,
) {
    const entry = composerMetadataCache[cacheKey];
    if (
        !forceRefresh &&
        entry.value &&
        entry.expiresAt > Date.now()
    ) {
        return Promise.resolve(entry.value);
    }
    if (entry.request) {
        return entry.request;
    }

    const requestGeneration = entry.generation;
    const request = load()
        .then(value => {
            if (requestGeneration === entry.generation) {
                entry.value = value;
                entry.expiresAt = Date.now() + ttl;
            }
            return value;
        })
        .finally(() => {
            if (entry.request === request) {
                entry.request = null;
            }
        });
    entry.request = request;
    return request;
}

export async function fetchHarborComposerMetadata({
    forceRefresh = false,
} = {}) {
    const [
        categories,
        tags,
        settings,
    ] = await Promise.all([
        getCachedComposerMetadata(
            'categories',
            () => fetchHarborCategories(),
            COMPOSER_METADATA_TTL,
            forceRefresh,
        ),
        getCachedComposerMetadata(
            'tags',
            () => fetchHarborTags(),
            COMPOSER_METADATA_TTL,
            forceRefresh,
        ),
        getCachedComposerMetadata(
            'settings',
            () => fetchHarborComposerSettings(),
            COMPOSER_SETTINGS_TTL,
            forceRefresh,
        ),
    ]);
    return {categories, tags, settings};
}

export function fetchCachedHarborComposerSettings({
    forceRefresh = false,
} = {}) {
    return getCachedComposerMetadata(
        'settings',
        () => fetchHarborComposerSettings(),
        COMPOSER_SETTINGS_TTL,
        forceRefresh,
    );
}

export async function fetchHarborSiteCapabilities({ signal } = {}) {
    const response = await harborApi.get('/site.json', { signal });
    return normalizeSiteCapabilities(response.data);
}

export async function fetchHarborProfileMetadata({ signal } = {}) {
    const response = await harborApi.get('/site.json', { signal });
    const userFields = Array.isArray(response.data?.user_fields)
        ? response.data.user_fields
        : [];
    const workStatusField = userFields.find(
        field => field?.name === '工作狀態' || Number(field?.id) === 1,
    );

    return {
        workStatusField: workStatusField
            ? {
                id: Number(workStatusField.id),
                editable: workStatusField.editable !== false,
                required: Boolean(workStatusField.required),
                options: Array.isArray(workStatusField.options)
                    ? workStatusField.options.filter(
                        option =>
                            typeof option === 'string' && option.trim(),
                    )
                    : [],
            }
            : null,
    };
}

export async function updateHarborProfile(
    username,
    {
        bio,
        location,
        website,
        workStatus,
        workStatusFieldId,
    },
    { signal } = {},
) {
    if (typeof username !== 'string' || !username.trim()) {
        throw new TypeError('Invalid Harbor username');
    }

    const payload = {};
    if (bio != null) {
        payload.bio_raw = String(bio).trim();
    }
    if (location != null) {
        payload.location = String(location).trim();
    }
    if (website != null) {
        payload.website = String(website).trim();
    }
    if (workStatus != null) {
        const fieldId = Number(workStatusFieldId);
        if (!Number.isInteger(fieldId) || fieldId <= 0) {
            throw new TypeError('Invalid Harbor work status field');
        }
        payload.user_fields = {
            [fieldId]: String(workStatus).trim(),
        };
    }

    const encodedUsername = encodeURIComponent(username.trim());
    const response = await harborApi.put(
        `/u/${encodedUsername}.json`,
        payload,
        { signal },
    );
    return response.data;
}

function flagTypeRequiresMessage(type) {
    if (type?.is_custom_flag) {
        return true;
    }
    const nameKey =
        typeof type?.name_key === 'string' ? type.name_key.toLowerCase() : '';
    return (
        nameKey.includes('notify') ||
        nameKey === 'illegal' ||
        nameKey === 'something_else'
    );
}

function normalizeHarborFlagType(type) {
    const id = Number(type?.id);
    if (!Number.isInteger(id) || id <= 0 || !type?.is_flag) {
        return null;
    }
    const nameKey =
        typeof type.name_key === 'string' ? type.name_key.trim() : '';
    const name =
        typeof type.name === 'string' && type.name.trim()
            ? type.name.trim()
            : nameKey || String(id);
    const description =
        typeof type.description === 'string' ? type.description.trim() : '';
    const shortDescription =
        typeof type.short_description === 'string'
            ? type.short_description.trim()
            : '';
    return {
        id,
        name,
        description: description || shortDescription,
        nameKey,
        requiresMessage: flagTypeRequiresMessage(type),
        isCustomFlag: Boolean(type.is_custom_flag),
    };
}

export function normalizeHarborFlagTypes(data) {
    const rawTypes = Array.isArray(data?.post_action_types)
        ? data.post_action_types
        : Array.isArray(data)
            ? data
            : [];
    return rawTypes.map(normalizeHarborFlagType).filter(Boolean);
}

export async function fetchHarborFlagTypes({ signal } = {}) {
    const response = await harborApi.get('/site.json', { signal });
    return normalizeHarborFlagTypes(response.data);
}

export function fetchCachedHarborFlagTypes({ forceRefresh = false } = {}) {
    return getCachedComposerMetadata(
        'flagTypes',
        () => fetchHarborFlagTypes(),
        COMPOSER_METADATA_TTL,
        forceRefresh,
    );
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

    // Harbor 啟用 discourse-reactions：表情回應在 reactions API；
    // heart 主反應只寫 PostAction，仍可能出現在 user_actions filter=1。
    if (kind === 'likes') {
        const beforeReactionUserId = Math.max(0, Number(offset) || 0);
        const reactionParams = { username };
        if (beforeReactionUserId > 0) {
            reactionParams.before_reaction_user_id = beforeReactionUserId;
        }

        const reactionResponse = await harborApi.get(
            '/discourse-reactions/posts/reactions.json',
            {
                params: reactionParams,
                signal,
            },
        );
        const reactionRows = Array.isArray(reactionResponse.data)
            ? reactionResponse.data
            : reactionResponse.data?.user_reactions ||
              reactionResponse.data?.reactions ||
              [];
        const reactionItems = reactionRows.map(normalizeReactionGiven);
        const hasMoreReactions =
            reactionItems.length >= REACTION_GIVEN_PAGE_SIZE;
        const nextReactionOffset = hasMoreReactions
            ? Number(reactionItems[reactionItems.length - 1]?.id) || null
            : null;

        // 首屏合併 heart 影子讚，避免只打舊 user_actions 時整頁空白
        if (beforeReactionUserId === 0) {
            let likeActionItems = [];
            try {
                const likeResponse = await harborApi.get(
                    '/user_actions.json',
                    {
                        params: {
                            offset: 0,
                            username,
                            filter: USER_ACTION_FILTERS.likes,
                        },
                        signal,
                    },
                );
                likeActionItems = (likeResponse.data?.user_actions || []).map(
                    normalizeAction,
                );
            } catch {
                // reactions 已成功時，影子讚失敗不阻斷列表
            }
            return {
                items: mergeLikeActivityItems(reactionItems, likeActionItems),
                hasMore: hasMoreReactions,
                nextOffset: nextReactionOffset,
            };
        }

        return {
            items: reactionItems,
            hasMore: hasMoreReactions,
            nextOffset: nextReactionOffset,
        };
    }

    // 收到的讚：discourse-reactions reactions-received
    if (kind === 'likesReceived') {
        const beforeReactionUserId = Math.max(0, Number(offset) || 0);
        const reactionParams = { username };
        if (beforeReactionUserId > 0) {
            reactionParams.before_reaction_user_id = beforeReactionUserId;
        }

        const reactionResponse = await harborApi.get(
            '/discourse-reactions/posts/reactions-received.json',
            {
                params: reactionParams,
                signal,
            },
        );
        const reactionRows = Array.isArray(reactionResponse.data)
            ? reactionResponse.data
            : reactionResponse.data?.user_reactions ||
              reactionResponse.data?.reactions ||
              [];
        const reactionItems = reactionRows.map(normalizeReactionReceived);
        const hasMoreReactions =
            reactionItems.length >= REACTION_GIVEN_PAGE_SIZE;
        const nextReactionOffset = hasMoreReactions
            ? Number(reactionItems[reactionItems.length - 1]?.id) || null
            : null;

        return {
            items: reactionItems,
            hasMore: hasMoreReactions,
            nextOffset: nextReactionOffset,
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

export async function fetchHarborNotificationPage({
    filter,
    offset = 0,
    limit = NOTIFICATION_PAGE_SIZE,
    signal,
} = {}) {
    const normalizedOffset = Math.max(0, Math.floor(Number(offset) || 0));
    const normalizedLimit = Math.min(
        60,
        Math.max(1, Math.floor(Number(limit) || NOTIFICATION_PAGE_SIZE)),
    );
    const params = {
        offset: normalizedOffset,
        limit: normalizedLimit,
    };
    if (filter === 'read' || filter === 'unread') {
        params.filter = filter;
    }
    const response = await harborApi.get('/notifications.json', {
        params,
        signal,
    });
    const items = (response.data?.notifications || []).map(
        normalizeNotification,
    );
    const totalCount = Number(response.data?.total_rows_notifications);
    const normalizedTotalCount = Number.isFinite(totalCount)
        ? totalCount
        : normalizedOffset + items.length;

    return {
        items,
        totalCount: normalizedTotalCount,
        hasMore: normalizedOffset + items.length < normalizedTotalCount,
        nextOffset: normalizedOffset + items.length,
    };
}

export async function fetchHarborUnreadNotificationCount({ signal } = {}) {
    const page = await fetchHarborNotificationPage({
        filter: 'unread',
        limit: 1,
        signal,
    });
    return page.totalCount;
}

export function calculateHarborInboxUnreadCount(
    unreadNotificationCount,
    messages = [],
) {
    return (
        Math.max(0, Number(unreadNotificationCount) || 0) +
        messages.filter(message => message.unreadCount > 0).length
    );
}

export async function fetchHarborInboxUnreadCount(
    username,
    { signal } = {},
) {
    const [unreadNotificationCount, messages] = await Promise.all([
        fetchHarborUnreadNotificationCount({ signal }),
        fetchHarborMessages(username, { signal }),
    ]);
    return calculateHarborInboxUnreadCount(
        unreadNotificationCount,
        messages,
    );
}

/**
 * 論壇 Tab 角標用：計算指定時間後有新貼文的話題數。
 * 首次建立基準時只讀取第一頁；既有基準最多掃描 100 個更新話題。
 */
export async function fetchHarborForumBadgeSnapshot({
    since,
    signal,
} = {}) {
    const sinceTimestamp = Date.parse(since);
    const hasValidSince = Number.isFinite(sinceTimestamp);
    const updatedTopicIds = new Set();
    let latestTimestamp = null;
    let page = 0;
    let scannedPages = 0;
    let hasMore = false;
    let pageHasUpdates = false;

    do {
        const response = await harborApi.get('/latest.json', {
            params: {page},
            signal,
        });
        const topicList = response.data?.topic_list;
        const topics = topicList?.topics;
        if (!topicList || !Array.isArray(topics)) {
            throw new Error('Invalid Harbor forum badge response');
        }

        pageHasUpdates = false;
        topics.forEach(topic => {
            const topicId = toNumberOrNull(topic?.id);
            const postedAt =
                topic?.last_posted_at || topic?.created_at || '';
            const postedTimestamp = Date.parse(postedAt);
            if (!Number.isFinite(postedTimestamp)) {
                return;
            }
            latestTimestamp = Math.max(
                latestTimestamp ?? postedTimestamp,
                postedTimestamp,
            );
            if (
                hasValidSince &&
                postedTimestamp > sinceTimestamp &&
                topicId != null
            ) {
                pageHasUpdates = true;
                updatedTopicIds.add(topicId);
            }
        });

        const pageInfo = getTopicPageInfo(
            topicList,
            page,
            topics.length,
        );
        hasMore = pageInfo.hasMore;
        page = pageInfo.nextPage;
        scannedPages += 1;
    } while (
        hasValidSince &&
        hasMore &&
        pageHasUpdates &&
        updatedTopicIds.size < 100 &&
        scannedPages < 10
    );

    const reachedScanLimit =
        hasValidSince &&
        hasMore &&
        pageHasUpdates &&
        scannedPages >= 10;

    return {
        latestAt:
            latestTimestamp == null
                ? ''
                : new Date(latestTimestamp).toISOString(),
        topicCount: reachedScanLimit
            ? 100
            : Math.min(100, updatedTopicIds.size),
    };
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
    const users = getTopicUsers(response.data);
    return (response.data?.topic_list?.topics || []).map((topic, index) =>
        normalizeMessage(topic, index, {
            users,
            currentUsername: username,
        }),
    );
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
    let topic = topicResponse.data;
    const stream = topic?.post_stream?.stream;
    const initialPosts = topic?.post_stream?.posts;

    if (!topic?.id || !Array.isArray(stream) || !Array.isArray(initialPosts)) {
        throw new Error('Invalid Harbor topic response');
    }

    if (topic.is_nested_view) {
        const nestedResponse = await fetchHarborNestedTopicRoots(topicId, {
            signal,
            trackVisit: true,
        });
        const nestedTopic = nestedResponse.topic;
        const opPost = nestedResponse.op_post;
        const roots = nestedResponse.roots;
        if (!nestedTopic?.id || !opPost?.id || !Array.isArray(roots)) {
            throw new Error('Invalid Harbor nested topic response');
        }
        topic = {
            ...topic,
            ...nestedTopic,
            highest_post_number:
                topic.highest_post_number ??
                nestedTopic.highest_post_number,
            last_read_post_number:
                topic.last_read_post_number ??
                nestedTopic.last_read_post_number,
            new_posts: topic.new_posts ?? nestedTopic.new_posts,
            unread_posts: topic.unread_posts ?? nestedTopic.unread_posts,
            is_nested_view: true,
            nested_has_more_roots: Boolean(
                nestedResponse.has_more_roots,
            ),
            nested_page: Number(nestedResponse.page || 0),
            nested_sort:
                nestedResponse.effective_sort ||
                nestedResponse.sort ||
                'old',
            post_stream: {
                ...topic.post_stream,
                stream: [opPost, ...roots].map(post => post.id),
                posts: [opPost, ...roots],
            },
            ...(nestedResponse.suggested_topics
                ? { suggested_topics: nestedResponse.suggested_topics }
                : {}),
            ...(nestedResponse.related_topics
                ? { related_topics: nestedResponse.related_topics }
                : {}),
        };
    }

    const category = await resolveTopicCategory(topic);
    return {
        ...topic,
        ...(category ? { category } : {}),
    };
}

export async function fetchHarborNestedTopicRoots(
    topicId,
    { page = 0, signal, sort = 'old', trackVisit = false } = {},
) {
    const encodedTopicId = encodeURIComponent(topicId);
    const response = await harborApi.get(
        `/n/-/${encodedTopicId}.json`,
        {
            params: {
                page,
                sort,
                ...(trackVisit ? { track_visit: true } : {}),
            },
            signal,
        },
    );
    if (!Array.isArray(response.data?.roots)) {
        throw new Error('Invalid Harbor nested roots response');
    }
    return response.data;
}

export async function fetchHarborNestedPostChildren(
    topicId,
    postNumber,
    { depth = 1, page = 0, signal, sort = 'old' } = {},
) {
    const encodedTopicId = encodeURIComponent(topicId);
    const normalizedPostNumber = Number(postNumber);
    if (
        !Number.isInteger(normalizedPostNumber) ||
        normalizedPostNumber <= 0
    ) {
        throw new Error('Invalid Harbor nested parent post');
    }
    const response = await harborApi.get(
        `/n/-/${encodedTopicId}/children/${normalizedPostNumber}.json`,
        {
            params: { depth, page, sort },
            signal,
        },
    );
    if (!Array.isArray(response.data?.children)) {
        throw new Error('Invalid Harbor nested children response');
    }
    return response.data;
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

function normalizeHarborDraftKey(value) {
    const draftKey = normalizeHarborComposerText(value, 'draft key').trim();
    if (draftKey.length > 40) {
        throw new TypeError('Invalid Harbor draft key');
    }
    return draftKey;
}

function normalizeHarborDraftSequence(value) {
    const sequence = Number(value);
    if (!Number.isInteger(sequence) || sequence < 0) {
        throw new TypeError('Invalid Harbor draft sequence');
    }
    return sequence;
}

export async function fetchHarborDrafts({
    limit = 50,
    offset = 0,
    signal,
} = {}) {
    const normalizedLimit = Math.min(
        50,
        Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 50),
    );
    const normalizedOffset = Math.max(
        0,
        Number.isInteger(Number(offset)) ? Number(offset) : 0,
    );
    const response = await harborApi.get('/drafts.json', {
        params: {
            limit: normalizedLimit,
            offset: normalizedOffset,
        },
        signal,
    });
    return {
        items: Array.isArray(response.data?.drafts)
            ? response.data.drafts
            : [],
        categories: Array.isArray(response.data?.categories)
            ? response.data.categories
            : [],
    };
}

export async function fetchHarborDraft(draftKey, {signal} = {}) {
    const key = normalizeHarborDraftKey(draftKey);
    const response = await harborApi.get(
        `/drafts/${encodeURIComponent(key)}.json`,
        {signal},
    );
    return {
        data: response.data?.draft ?? null,
        sequence: normalizeHarborDraftSequence(
            response.data?.draft_sequence ?? 0,
        ),
    };
}

export async function saveHarborDraft(
    draftKey,
    {
        data,
        sequence = 0,
        owner,
        forceSave = false,
        signal,
    } = {},
) {
    const key = normalizeHarborDraftKey(draftKey);
    const normalizedSequence = normalizeHarborDraftSequence(sequence);
    const serializedData =
        typeof data === 'string' ? data : JSON.stringify(data);
    if (typeof serializedData !== 'string' || !serializedData.trim()) {
        throw new TypeError('Invalid Harbor draft data');
    }
    const payload = {
        draft_key: key,
        sequence: normalizedSequence,
        data: serializedData,
    };
    if (typeof owner === 'string' && owner.trim()) {
        payload.owner = owner.trim();
    }
    if (forceSave) {
        payload.force_save = true;
    }

    const response = await harborApi.post('/drafts.json', payload, {signal});
    return {
        sequence: normalizeHarborDraftSequence(
            response.data?.draft_sequence ?? normalizedSequence,
        ),
        conflictUser: response.data?.conflict_user || null,
    };
}

export async function deleteHarborDraft(
    draftKey,
    sequence,
    {signal} = {},
) {
    const key = normalizeHarborDraftKey(draftKey);
    await harborApi.delete(
        `/drafts/${encodeURIComponent(key)}.json`,
        {
            data: {
                draft_key: key,
                sequence: normalizeHarborDraftSequence(sequence),
            },
            signal,
        },
    );
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

export async function uploadHarborComposerImage(
    image,
    { signal, onUploadProgress } = {},
) {
    if (
        !image ||
        typeof image.uri !== 'string' ||
        !image.uri.trim()
    ) {
        throw new TypeError('Invalid Harbor upload image');
    }

    const data = new FormData();
    data.append('upload_type', 'composer');
    data.append('synchronous', 'true');
    data.append('file', {
        uri: image.uri,
        name: image.fileName || 'image.jpg',
        type: image.mimeType || 'image/jpeg',
    });

    const response = await harborApi.post('/uploads.json', data, {
        headers: {'Content-Type': 'multipart/form-data'},
        onUploadProgress,
        signal,
    });
    const upload = response.data?.upload || response.data;
    const shortUrl = upload?.short_url || upload?.shortUrl;
    const remoteUrl = upload?.url || upload?.original_url;

    if (typeof shortUrl !== 'string' || !shortUrl.trim()) {
        throw new Error('Invalid Harbor upload response');
    }

    return {
        id: toNumberOrNull(upload.id),
        shortUrl: shortUrl.trim(),
        ...(typeof remoteUrl === 'string' && remoteUrl.trim()
            ? {
                remoteUrl: new URL(
                    remoteUrl.trim(),
                    ARK_HARBOR,
                ).toString(),
            }
            : {}),
    };
}

export async function fetchHarborPostForEdit(postId, { signal } = {}) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const response = await harborApi.get(`/posts/${id}.json`, { signal });
    const post = response.data;

    if (typeof post?.raw !== 'string') {
        throw new Error('Invalid Harbor editable post response: missing raw');
    }

    const imageUrls = typeof post.cooked === 'string'
        ? (post.cooked.match(/<img\b[^>]*>/gi) || [])
            .filter(tag => {
                const className = getHarborHtmlAttribute(tag, 'class');
                return !className.split(/\s+/).includes('emoji');
            })
            .map(tag => ARK_HARBOR_ABSOLUTE_URL(
                getHarborHtmlAttribute(tag, 'src'),
            ))
            .filter(Boolean)
        : [];

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
        canDelete: Boolean(post.can_delete),
        canEdit: Boolean(post.can_edit),
        ...(typeof post.cooked === 'string'
            ? {cooked: post.cooked, imageUrls}
            : {}),
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

export async function deleteHarborPost(postId, { signal } = {}) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const response = await harborApi.delete(`/posts/${id}.json`, { signal });
    return response.data;
}

export async function deleteHarborTopic(topicId, { signal } = {}) {
    const id = normalizeHarborMutationId(topicId, 'topic id');
    const response = await harborApi.delete(`/t/${id}`, { signal });
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

export async function flagHarborPost(
    postId,
    { postActionTypeId, message } = {},
) {
    const id = normalizeHarborMutationId(postId, 'post id');
    const typeId = normalizeHarborMutationId(
        postActionTypeId,
        'post action type id',
    );
    const payload = {
        id,
        post_action_type_id: typeId,
        flag_topic: false,
    };
    if (typeof message === 'string' && message.trim()) {
        payload.message = message.trim();
    }
    const response = await harborApi.post('/post_actions.json', payload);
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

export async function fetchCurrentHarborSession(credentials) {
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
    return currentUser;
}

export async function fetchCurrentHarborUser(credentials, previousUser = null) {
    const requestConfig = { harborCredentials: credentials };
    const currentUser = await fetchCurrentHarborSession(credentials);
    const username = encodeURIComponent(currentUser.username);
    const [
        profileResult,
        summaryResult,
        badgeResult,
    ] = await Promise.allSettled([
        harborApi.get(`/u/${username}.json`, requestConfig),
        harborApi.get(`/u/${username}/summary.json`, requestConfig),
        harborApi.get(`/user-badges/${username}.json`, requestConfig),
    ]);
    const availability = {
        profile: profileResult.status === 'fulfilled',
        summary: summaryResult.status === 'fulfilled',
        badges: badgeResult.status === 'fulfilled',
    };

    return normalizeProfile(
        currentUser,
        availability.profile ? profileResult.value.data : null,
        availability.summary ? summaryResult.value.data : null,
        availability.badges ? badgeResult.value.data : null,
        availability,
        previousUser,
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
