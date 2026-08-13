import {
    fetchHarborBadges,
    fetchHarborProfileMetadata,
    fetchHarborUserActions,
    fetchHarborUserCreatedTopics,
    fetchHarborUserProfile,
} from './harborApi';
import {
    fetchHarborQueryCache,
    invalidateHarborQueryCache,
    readHarborQueryCache,
    setHarborQueryNamespaceLimit,
} from './harborQueryCache';

const PROFILE_FRESH_MS = 2 * 60 * 1000;
const PROFILE_STALE_MS = 15 * 60 * 1000;
const METADATA_FRESH_MS = 30 * 60 * 1000;
const METADATA_STALE_MS = 2 * 60 * 60 * 1000;
const ACTIVITY_FRESH_MS = 60 * 1000;
const ACTIVITY_STALE_MS = 5 * 60 * 1000;
const BADGES_FRESH_MS = 5 * 60 * 1000;
const BADGES_STALE_MS = 30 * 60 * 1000;

setHarborQueryNamespaceLimit('profile', 20);
setHarborQueryNamespaceLimit('metadata', 20);
setHarborQueryNamespaceLimit('activity', 30);
setHarborQueryNamespaceLimit('badges', 20);

const normalizeUsername = username => String(username || '').trim().toLowerCase();

export const getHarborProfileQueryKey = username => [
    'profile',
    normalizeUsername(username),
];

export const getHarborActivityQueryKey = (username, kind, cursor = 0) => [
    'activity',
    normalizeUsername(username),
    kind,
    cursor,
];

export const getHarborBadgesQueryKey = username => [
    'badges',
    normalizeUsername(username),
];

export const readHarborProfileQuery = username =>
    readHarborQueryCache(getHarborProfileQueryKey(username), {
        maxAgeMs: PROFILE_STALE_MS,
    });

export const fetchHarborProfileQuery = (username, {force = false} = {}) =>
    fetchHarborQueryCache(
        getHarborProfileQueryKey(username),
        ({signal}) => fetchHarborUserProfile(username, {signal}),
        {force, freshMs: PROFILE_FRESH_MS, staleMs: PROFILE_STALE_MS},
    );

export const invalidateHarborProfileQuery = username =>
    invalidateHarborQueryCache(getHarborProfileQueryKey(username));

export const readHarborProfileMetadataQuery = () =>
    readHarborQueryCache(['metadata', 'profile'], {
        maxAgeMs: METADATA_STALE_MS,
    });

export const fetchHarborProfileMetadataQuery = ({force = false} = {}) =>
    fetchHarborQueryCache(
        ['metadata', 'profile'],
        ({signal}) => fetchHarborProfileMetadata({signal}),
        {force, freshMs: METADATA_FRESH_MS, staleMs: METADATA_STALE_MS},
    );

export const readHarborActivityQuery = (username, kind, cursor = 0) =>
    readHarborQueryCache(getHarborActivityQueryKey(username, kind, cursor), {
        maxAgeMs: ACTIVITY_STALE_MS,
    });

export const fetchHarborActivityQuery = (
    username,
    kind,
    cursor = 0,
    {force = false} = {},
) =>
    fetchHarborQueryCache(
        getHarborActivityQueryKey(username, kind, cursor),
        ({signal}) =>
            kind === 'topics'
                ? fetchHarborUserCreatedTopics(username, {page: cursor, signal})
                : fetchHarborUserActions(username, {kind, offset: cursor, signal}),
        {force, freshMs: ACTIVITY_FRESH_MS, staleMs: ACTIVITY_STALE_MS},
    );

export const readHarborBadgesQuery = username =>
    readHarborQueryCache(getHarborBadgesQueryKey(username), {
        maxAgeMs: BADGES_STALE_MS,
    });

export const fetchHarborBadgesQuery = (username, {force = false} = {}) =>
    fetchHarborQueryCache(
        getHarborBadgesQueryKey(username),
        ({signal}) => fetchHarborBadges(username, {signal}),
        {force, freshMs: BADGES_FRESH_MS, staleMs: BADGES_STALE_MS},
    );
