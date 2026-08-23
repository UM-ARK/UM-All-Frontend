import {harborApi} from './harborApi';

const REVIEWABLES_PER_PAGE = 10;

function getOptionalString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getRequiredReviewableId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new TypeError('Harbor reviewable id is required');
    }
    return id;
}

function getRequiredReviewActionId(value) {
    const actionId = getOptionalString(value);
    if (!actionId) {
        throw new TypeError('Harbor review action id is required');
    }
    return actionId;
}

function getRequiredReviewVersion(value) {
    const version = Number(value);
    if (
        value == null ||
        (typeof value === 'string' && !value.trim()) ||
        !Number.isInteger(version) ||
        version < 0
    ) {
        throw new TypeError('Harbor review version is required');
    }
    return version;
}

function getReviewFields(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('Harbor review fields must be an object');
    }
    return value;
}

function getReviewRequestParams(value) {
    if (value == null) {
        return {};
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('Harbor review action params must be an object');
    }
    return value;
}

function normalizeReviewPage(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
}

function getActionId(action, fallbackId) {
    return (
        action?.action_name ??
        action?.action_id ??
        action?.actionId ??
        fallbackId ??
        action?.id ??
        null
    );
}

function normalizeReviewAction(action, fallbackId) {
    if (!action || typeof action !== 'object') {
        return null;
    }
    const actionId = getActionId(action, fallbackId);
    if (actionId == null) {
        return null;
    }
    return {
        ...action,
        id: action.id ?? actionId,
        actionId,
        label:
            getOptionalString(action.label) ||
            getOptionalString(action.name) ||
            getOptionalString(action.title),
        icon:
            getOptionalString(action.icon) || getOptionalString(action.icon_name),
        description:
            getOptionalString(action.description) ||
            getOptionalString(action.short_description),
        clientAction:
            getOptionalString(action.clientAction) ||
            getOptionalString(action.client_action),
        confirmMessage:
            getOptionalString(action.confirmMessage) ||
            getOptionalString(action.confirm_message),
        buttonClass:
            getOptionalString(action.buttonClass) ||
            getOptionalString(action.button_class),
        completedMessage:
            getOptionalString(action.completedMessage) ||
            getOptionalString(action.completed_message),
        confirmDestructive: Boolean(
            action.confirmDestructive || action.confirm_destructive,
        ),
        requireRejectReason: Boolean(
            action.requireRejectReason || action.require_reject_reason,
        ),
        serverAction:
            getOptionalString(action.serverAction) ||
            getOptionalString(action.server_action),
    };
}

function getNormalizedReviewActions(actions, actionsById) {
    if (!Array.isArray(actions)) {
        return [];
    }
    return actions
        .map(action => {
            if (typeof action === 'object') {
                return normalizeReviewAction(action);
            }
            return normalizeReviewAction(actionsById.get(String(action)), action);
        })
        .filter(Boolean);
}

function getReviewActionMap(actions) {
    const actionMap = new Map();
    (Array.isArray(actions) ? actions : []).forEach(action => {
        const normalized = normalizeReviewAction(action);
        if (!normalized) {
            return;
        }
        actionMap.set(String(normalized.id), normalized);
        actionMap.set(String(normalized.actionId), normalized);
    });
    return actionMap;
}

function normalizeReviewActionBundle(bundle, actionsById) {
    if (!bundle || typeof bundle !== 'object') {
        return null;
    }
    const id = bundle.id ?? bundle.action_id ?? bundle.actionId ?? null;
    const actionReferences =
        Array.isArray(bundle.actions) && bundle.actions.length > 0
            ? bundle.actions
            : bundle.action_ids;
    return {
        ...bundle,
        id,
        actionId: bundle.action_id ?? bundle.actionId ?? id,
        label:
            getOptionalString(bundle.label) ||
            getOptionalString(bundle.name) ||
            getOptionalString(bundle.title),
        icon:
            getOptionalString(bundle.icon) || getOptionalString(bundle.icon_name),
        description:
            getOptionalString(bundle.description) ||
            getOptionalString(bundle.short_description),
        clientAction:
            getOptionalString(bundle.clientAction) ||
            getOptionalString(bundle.client_action),
        confirmMessage:
            getOptionalString(bundle.confirmMessage) ||
            getOptionalString(bundle.confirm_message),
        actions: getNormalizedReviewActions(actionReferences, actionsById),
    };
}

function getReviewBundleMap(bundles) {
    return new Map(
        (Array.isArray(bundles) ? bundles : [])
            .filter(bundle => bundle && typeof bundle === 'object')
            .map(bundle => [String(bundle.id), bundle]),
    );
}

function getNormalizedReviewBundles(
    bundles,
    actionsById,
    bundlesById = new Map(),
) {
    if (!Array.isArray(bundles)) {
        return [];
    }
    return bundles
        .map(bundle => {
            const source = typeof bundle === 'object'
                ? bundle
                : bundlesById.get(String(bundle));
            return normalizeReviewActionBundle(source, actionsById);
        })
        .filter(Boolean);
}

export function normalizeHarborReviewable(reviewable, sideLoaded = {}) {
    if (!reviewable || typeof reviewable !== 'object') {
        return null;
    }
    const sideLoadedActions = Array.isArray(sideLoaded.actions)
        ? sideLoaded.actions
        : [];
    const actions =
        Array.isArray(reviewable.actions) && reviewable.actions.length > 0
            ? reviewable.actions
            : Array.isArray(reviewable.action_ids)
            ? reviewable.action_ids
            : [];
    const actionsById = getReviewActionMap([...sideLoadedActions, ...actions]);
    const sideLoadedBundles = Array.isArray(sideLoaded.bundled_actions)
        ? sideLoaded.bundled_actions
        : [];
    const bundlesById = getReviewBundleMap(sideLoadedBundles);
    const bundles =
        Array.isArray(reviewable.bundled_actions) &&
        reviewable.bundled_actions.length > 0
            ? reviewable.bundled_actions
            : Array.isArray(reviewable.bundled_action_ids)
            ? reviewable.bundled_action_ids
            : [];
    const users = Array.isArray(sideLoaded.users) ? sideLoaded.users : [];
    const topics = Array.isArray(sideLoaded.topics) ? sideLoaded.topics : [];
    const findUser = id => users.find(user => Number(user?.id) === Number(id));
    const resolvedCreatedBy =
        reviewable.created_by || findUser(reviewable.created_by_id) || null;
    const resolvedTargetCreatedBy =
        reviewable.target_created_by ||
        findUser(reviewable.target_created_by_id) ||
        null;
    const resolvedTopic =
        reviewable.topic ||
        topics.find(topic => Number(topic?.id) === Number(reviewable.topic_id)) ||
        null;

    return {
        ...reviewable,
        id: reviewable.id ?? null,
        version: Number.isInteger(Number(reviewable.version))
            ? Number(reviewable.version)
            : null,
        created_by: resolvedCreatedBy,
        target_created_by: resolvedTargetCreatedBy,
        topic: resolvedTopic,
        actions: getNormalizedReviewActions(actions, actionsById),
        bundledActions: getNormalizedReviewBundles(
            bundles,
            actionsById,
            bundlesById,
        ),
    };
}

export function normalizeHarborReviewMeta(meta) {
    const value = meta && typeof meta === 'object' ? meta : {};
    const totalRows = Number(value.total_rows_reviewables);
    const reviewableCount = Number(value.reviewable_count);
    const unseenReviewableCount = Number(value.unseen_reviewable_count);
    return {
        ...value,
        totalRows: Number.isFinite(totalRows) ? totalRows : 0,
        reviewableCount: Number.isFinite(reviewableCount)
            ? reviewableCount
            : 0,
        unseenReviewableCount: Number.isFinite(unseenReviewableCount)
            ? unseenReviewableCount
            : 0,
        hasMore: Boolean(value.load_more_reviewables),
    };
}

export function normalizeHarborReviewCount(data) {
    const count = Number(data?.count);
    return Number.isFinite(count) && count >= 0 ? count : 0;
}

export function getHarborReviewErrorStatus(error) {
    return Number(error?.response?.status) || null;
}

export function getHarborReviewErrorKind(error) {
    const status = getHarborReviewErrorStatus(error);
    if (status === 403) {
        return 'forbidden';
    }
    if (status === 404) {
        return 'not_found';
    }
    if (status === 409) {
        return 'conflict';
    }
    if (status === 422) {
        return 'validation';
    }
    return null;
}

export function isHarborReviewError(error, kind) {
    return getHarborReviewErrorKind(error) === kind;
}

export function isHarborReviewConflict(error) {
    return isHarborReviewError(error, 'conflict');
}

export function isHarborReviewForbidden(error) {
    return isHarborReviewError(error, 'forbidden');
}

export async function fetchHarborReviewCount({signal} = {}) {
    const response = await harborApi.get('/review/count.json', {signal});
    return normalizeHarborReviewCount(response.data);
}

export async function fetchHarborReviewables({
    page = 0,
    status = 'pending',
    type,
    categoryId,
    username,
    priority,
    claimedBy,
    signal,
} = {}) {
    const normalizedPage = normalizeReviewPage(page);
    const response = await harborApi.get('/review.json', {
        params: {
            offset: normalizedPage * REVIEWABLES_PER_PAGE,
            status,
            ...(type ? {type} : {}),
            ...(categoryId != null ? {category_id: categoryId} : {}),
            ...(username ? {username} : {}),
            ...(priority != null ? {priority} : {}),
            ...(claimedBy ? {claimed_by: claimedBy} : {}),
        },
        signal,
    });
    const data = response.data || {};
    const meta = normalizeHarborReviewMeta(data.meta);
    return {
        items: (Array.isArray(data.reviewables) ? data.reviewables : [])
            .map(reviewable => normalizeHarborReviewable(reviewable, data))
            .filter(Boolean),
        meta,
        page: normalizedPage,
        hasMore: meta.hasMore,
        users: Array.isArray(data.users) ? data.users : [],
        topics: Array.isArray(data.topics) ? data.topics : [],
        bundledActions: getNormalizedReviewBundles(
            data.bundled_actions,
            getReviewActionMap(data.actions),
            getReviewBundleMap(data.bundled_actions),
        ),
        actions: getNormalizedReviewActions(
            data.actions,
            getReviewActionMap(data.actions),
        ),
    };
}

export async function fetchHarborReviewable(id, {signal} = {}) {
    const reviewableId = getRequiredReviewableId(id);
    const response = await harborApi.get(`/review/${reviewableId}.json`, {signal});
    const data = response.data || {};
    return {
        item: normalizeHarborReviewable(data.reviewable, data),
        meta: normalizeHarborReviewMeta(data.meta),
        users: Array.isArray(data.users) ? data.users : [],
        topics: Array.isArray(data.topics) ? data.topics : [],
        bundledActions: getNormalizedReviewBundles(
            data.bundled_actions,
            getReviewActionMap(data.actions),
            getReviewBundleMap(data.bundled_actions),
        ),
        actions: getNormalizedReviewActions(
            data.actions,
            getReviewActionMap(data.actions),
        ),
    };
}

export async function performHarborReviewAction({
    reviewableId,
    actionId,
    version,
    params,
} = {}) {
    const id = getRequiredReviewableId(reviewableId);
    const action = getRequiredReviewActionId(actionId);
    const requestParams = getReviewRequestParams(params);
    const response = await harborApi.put(
        `/review/${id}/perform/${encodeURIComponent(action)}.json`,
        {
            ...requestParams,
            version: getRequiredReviewVersion(version),
        },
    );
    return response.data || {};
}

export async function updateHarborReviewable({
    reviewableId,
    version,
    fields,
} = {}) {
    const id = getRequiredReviewableId(reviewableId);
    const response = await harborApi.put(`/review/${id}.json`, {
        reviewable: getReviewFields(fields),
        version: getRequiredReviewVersion(version),
    });
    return response.data || {};
}
