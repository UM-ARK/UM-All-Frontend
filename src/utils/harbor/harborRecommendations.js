import {fetchHarborTopicList} from './harborApi';
import {
    fetchHarborQueryCache,
    readHarborQueryCache,
} from './harborQueryCache';

const RECOMMENDATION_CACHE_NAMESPACE = 'topic-list';
const RECOMMENDATION_CACHE_FRESH_MS = 10 * 60 * 1000;
const RECOMMENDATION_CACHE_STALE_MS = 30 * 60 * 1000;
const RECOMMENDATION_INSERT_AFTER = [3, 8];
const RECOMMENDATION_LIMIT = RECOMMENDATION_INSERT_AFTER.length;

const getRecommendationCacheKey = sessionGeneration => [
    'topic-list',
    'recommendations',
    'monthly',
    sessionGeneration,
];

export function isHarborRecommendationCandidate(topic) {
    return Boolean(
        Number(topic?.id) > 0 &&
        Number(topic?.lastReadPostNumber || 0) <= 0 &&
        !topic?.muted &&
        !topic?.archived &&
        !topic?.closed &&
        !topic?.pinned &&
        !topic?.pinnedGlobally,
    );
}

export function selectHarborRecommendations(candidates, latestItems) {
    const latestIds = new Set(
        (Array.isArray(latestItems) ? latestItems : []).map(item => item.id),
    );
    const selectedIds = new Set();

    return (Array.isArray(candidates) ? candidates : [])
        .filter(topic => {
            if (
                !isHarborRecommendationCandidate(topic) ||
                latestIds.has(topic.id) ||
                selectedIds.has(topic.id)
            ) {
                return false;
            }
            selectedIds.add(topic.id);
            return true;
        })
        .slice(0, RECOMMENDATION_LIMIT);
}

export function composeHarborRecommendedFeed(latestItems, recommendations) {
    const recommendationItems = (Array.isArray(recommendations)
        ? recommendations
        : []
    ).slice(0, RECOMMENDATION_LIMIT);
    if (recommendationItems.length === 0) {
        return latestItems;
    }

    const recommendationIds = new Set(
        recommendationItems.map(item => item.id),
    );
    const feedItems = [];
    let latestCount = 0;
    let recommendationIndex = 0;

    (Array.isArray(latestItems) ? latestItems : []).forEach(item => {
        // 已提前推薦的話題不在後續 latest 分頁重複顯示。
        if (recommendationIds.has(item.id)) {
            return;
        }
        feedItems.push(item);
        latestCount += 1;

        if (
            recommendationIndex < recommendationItems.length &&
            latestCount ===
            RECOMMENDATION_INSERT_AFTER[recommendationIndex]
        ) {
            feedItems.push({
                ...recommendationItems[recommendationIndex],
                isHarborRecommendation: true,
            });
            recommendationIndex += 1;
        }
    });

    return feedItems;
}

export function readCachedHarborRecommendationCandidates(sessionGeneration) {
    return readHarborQueryCache(
        getRecommendationCacheKey(sessionGeneration),
        {
            namespace: RECOMMENDATION_CACHE_NAMESPACE,
            maxAgeMs: RECOMMENDATION_CACHE_STALE_MS,
        },
    );
}

export async function fetchHarborRecommendationCandidates(sessionGeneration) {
    const cacheKey = getRecommendationCacheKey(sessionGeneration);
    const staleResult = readCachedHarborRecommendationCandidates(
        sessionGeneration,
    );

    try {
        return await fetchHarborQueryCache(
            cacheKey,
            ({signal}) =>
                fetchHarborTopicList({
                    view: 'top',
                    period: 'monthly',
                    page: 0,
                    signal,
                }),
            {
                namespace: RECOMMENDATION_CACHE_NAMESPACE,
                freshMs: RECOMMENDATION_CACHE_FRESH_MS,
                staleMs: RECOMMENDATION_CACHE_STALE_MS,
            },
        );
    } catch (error) {
        if (staleResult) {
            return staleResult;
        }
        throw error;
    }
}
