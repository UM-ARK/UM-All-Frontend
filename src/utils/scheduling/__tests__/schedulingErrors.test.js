import {
    createSchedulingError,
    normalizeSchedulingError,
} from '../schedulingErrors';

describe('schedulingErrors', () => {
    it('正規化後端 {error:{code,message}} 並標示 retryable', () => {
        const normalized = normalizeSchedulingError({
            response: {
                status: 503,
                data: {
                    error: {
                        code: 'harbor_unavailable',
                        message: 'Harbor 暫時不可用',
                    },
                },
                headers: {
                    Authorization: 'Bearer secret-jwt',
                },
                config: {
                    headers: {
                        'User-Api-Key': 'harbor-secret',
                        Authorization: 'Bearer secret-jwt',
                    },
                    url: '/team-events/abc?invite=super-secret-token',
                },
            },
            config: {
                headers: {
                    'User-Api-Key': 'harbor-secret',
                },
                url: '/team-events/abc?invite=super-secret-token',
            },
            message: 'Request failed with status code 503',
        });

        expect(normalized).toMatchObject({
            code: 'harbor_unavailable',
            message: 'Harbor 暫時不可用',
            status: 503,
            retryable: true,
        });
        expect(normalized.config).toBeUndefined();
        expect(normalized.response).toBeUndefined();
        expect(normalized.request).toBeUndefined();
        expect(JSON.stringify(normalized)).not.toContain('harbor-secret');
        expect(JSON.stringify(normalized)).not.toContain('secret-jwt');
        expect(JSON.stringify(normalized)).not.toContain('super-secret-token');
        expect(JSON.stringify(normalized)).not.toContain('invite=');
        expect(JSON.stringify(normalized)).not.toContain('User-Api-Key');
        expect(JSON.stringify(normalized)).not.toContain('Authorization');
    });

    it('網路錯誤標記為可重試且不附加 axios config', () => {
        const axiosLike = Object.assign(new Error('Network Error'), {
            code: 'ERR_NETWORK',
            config: {
                headers: {
                    Authorization: 'Bearer leak',
                },
                params: {
                    invite: 'invite-token',
                },
            },
        });

        const normalized = normalizeSchedulingError(axiosLike);
        expect(normalized.code).toBe('ERR_NETWORK');
        expect(normalized.retryable).toBe(true);
        expect(normalized.config).toBeUndefined();
        expect(JSON.stringify(normalized)).not.toContain('Bearer leak');
        expect(JSON.stringify(normalized)).not.toContain('invite-token');
    });

    it('429 標記為可重試', () => {
        const normalized = normalizeSchedulingError({
            response: {
                status: 429,
                data: {error: {code: 'rate_limited', message: '請稍後再試'}},
            },
        });

        expect(normalized).toMatchObject({
            code: 'rate_limited',
            status: 429,
            retryable: true,
        });
    });

    it('已正規化錯誤直接回傳同一物件', () => {
        const original = createSchedulingError({
            code: 'event_not_found',
            message: '找不到活動',
            status: 404,
            retryable: false,
        });
        expect(normalizeSchedulingError(original)).toBe(original);
    });
});
