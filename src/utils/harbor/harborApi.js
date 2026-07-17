import axios from 'axios';

import {ARK_HARBOR, ARK_HARBOR_AVATAR_TEMPLATE} from '../pathMap';

const REQUEST_TIMEOUT = 15000;

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

function formatReadTime(seconds) {
    const totalMinutes = Math.max(0, Math.round(Number(seconds || 0) / 60));
    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }
    return `${Math.round(totalMinutes / 60)} h`;
}

function normalizeProfile(currentUser, profileData, summaryData) {
    const profile = profileData?.user || {};
    const summary = summaryData?.user_summary || {};
    const username = currentUser.username || profile.username;
    const avatarTemplate =
        currentUser.avatar_template || profile.avatar_template || '';
    const createdAt = profile.created_at ? new Date(profile.created_at) : null;
    const joinedAt =
        createdAt && !Number.isNaN(createdAt.getTime())
            ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
            : '';

    let role = profile.title || '';
    if (currentUser.admin || profile.admin) {
        role = '管理員';
    } else if (currentUser.moderator || profile.moderator) {
        role = '版主';
    } else if (!role) {
        role = 'Harbor 會員';
    }

    return {
        displayName: currentUser.name || profile.name || username,
        username,
        role,
        joinedAt,
        unreadMessages:
            currentUser.unread_private_messages ||
            currentUser.unread_high_priority_notifications ||
            0,
        avatarUrl: avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate, 144)
            : null,
        stats: [
            {
                key: 'daysVisited',
                value: String(summary.days_visited || 0),
                label: '到訪天數',
            },
            {
                key: 'readTime',
                value: formatReadTime(summary.time_read),
                label: '閱讀時間',
            },
            {
                key: 'topicsRead',
                value: String(summary.topics_entered || 0),
                label: '已讀話題',
            },
            {
                key: 'postsRead',
                value: String(summary.posts_read_count || 0),
                label: '讀過的帖子',
            },
        ],
        activity: [],
    };
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
    const [profileResult, summaryResult] = await Promise.allSettled([
        harborApi.get(`/u/${username}.json`, requestConfig),
        harborApi.get(`/u/${username}/summary.json`, requestConfig),
    ]);

    return normalizeProfile(
        currentUser,
        profileResult.status === 'fulfilled' ? profileResult.value.data : null,
        summaryResult.status === 'fulfilled' ? summaryResult.value.data : null,
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
