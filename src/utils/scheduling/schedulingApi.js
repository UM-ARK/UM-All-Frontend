import axios from 'axios';

import {
    SCHEDULING_BASE_URI,
    clearSchedulingSession,
    ensureSchedulingAccessToken,
    refreshSchedulingAfterUnauthorized,
    signalSchedulingHarborAuthFailure,
} from './schedulingAuth';
import {normalizeSchedulingError} from './schedulingErrors';

export {
    SCHEDULING_BASE_URI,
    exchangeSchedulingToken,
} from './schedulingAuth';

const REQUEST_TIMEOUT = 15000;

export const schedulingHttp = axios.create({
    baseURL: SCHEDULING_BASE_URI,
    timeout: REQUEST_TIMEOUT,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

function teamEventPath(eventId) {
    return `/team-events/${encodeURIComponent(String(eventId))}`;
}

function shouldReexchangeOnUnauthorized(error) {
    return (
        error?.status === 401 &&
        (error.code === 'invalid_token' ||
            error.code === 'authentication_required')
    );
}

/**
 * 帶 Bearer JWT 的請求；遇 401 invalid_token 時 refresh 並最多重試一次。
 */
async function requestWithAuth(config, hasRetried = false) {
    const accessToken = await ensureSchedulingAccessToken();

    try {
        const response = await schedulingHttp.request({
            ...config,
            headers: {
                ...(config.headers || {}),
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error) {
        const normalized = normalizeSchedulingError(error);

        if (
            !hasRetried &&
            shouldReexchangeOnUnauthorized(normalized)
        ) {
            await refreshSchedulingAfterUnauthorized();
            return requestWithAuth(config, true);
        }

        if (
            normalized.status === 401 &&
            (normalized.code === 'harbor_auth_failed' ||
                normalized.code === 'harbor_account_mismatch')
        ) {
            clearSchedulingSession();
            signalSchedulingHarborAuthFailure(normalized);
        }

        throw normalized;
    }
}

export function listMyTeamEvents() {
    return requestWithAuth({
        method: 'get',
        url: '/me/team-events',
    });
}

export function createTeamEvent(payload) {
    return requestWithAuth({
        method: 'post',
        url: '/team-events',
        data: payload,
    });
}

export function getTeamEvent(eventId) {
    return requestWithAuth({
        method: 'get',
        url: teamEventPath(eventId),
    });
}

export function updateTeamEvent(eventId, patch) {
    return requestWithAuth({
        method: 'patch',
        url: teamEventPath(eventId),
        data: patch,
    });
}

export function deleteTeamEvent(eventId) {
    return requestWithAuth({
        method: 'delete',
        url: teamEventPath(eventId),
    });
}

export function getTeamEventSummary(eventId) {
    return requestWithAuth({
        method: 'get',
        url: `${teamEventPath(eventId)}/summary`,
    });
}

export function getMyAvailability(eventId) {
    return requestWithAuth({
        method: 'get',
        url: `${teamEventPath(eventId)}/me/availability`,
    });
}

export function putMyAvailability(eventId, payload) {
    return requestWithAuth({
        method: 'put',
        url: `${teamEventPath(eventId)}/me/availability`,
        data: payload,
    });
}

export function getMySharedTimetable(eventId) {
    return requestWithAuth({
        method: 'get',
        url: `${teamEventPath(eventId)}/me/shared-timetable`,
    });
}

export function putMySharedTimetable(eventId, payload) {
    return requestWithAuth({
        method: 'put',
        url: `${teamEventPath(eventId)}/me/shared-timetable`,
        data: payload,
    });
}

export function deleteMySharedTimetable(eventId) {
    return requestWithAuth({
        method: 'delete',
        url: `${teamEventPath(eventId)}/me/shared-timetable`,
    });
}

export function getTeamSharedTimetables(eventId) {
    return requestWithAuth({
        method: 'get',
        url: `${teamEventPath(eventId)}/shared-timetables`,
    });
}

export function joinTeamEvent(eventId, inviteToken) {
    const data = {};
    if (inviteToken != null && inviteToken !== '') {
        data.inviteToken = inviteToken;
    }
    return requestWithAuth({
        method: 'post',
        url: `${teamEventPath(eventId)}/join`,
        data,
    });
}

export function leaveTeamEvent(eventId) {
    return requestWithAuth({
        method: 'delete',
        url: `${teamEventPath(eventId)}/me/membership`,
    });
}

export function getInviteLink(eventId) {
    return requestWithAuth({
        method: 'get',
        url: `${teamEventPath(eventId)}/invite-link`,
    });
}

export function updateInviteLink(eventId, status) {
    return requestWithAuth({
        method: 'patch',
        url: `${teamEventPath(eventId)}/invite-link`,
        data: {status},
    });
}

export function rotateInviteLink(eventId) {
    return requestWithAuth({
        method: 'post',
        url: `${teamEventPath(eventId)}/invite-link/rotate`,
        data: {},
    });
}
