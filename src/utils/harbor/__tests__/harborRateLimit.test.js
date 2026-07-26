import {
    getHarborRateLimitDelayMs,
    isHarborRateLimited,
} from '../harborRateLimit';

describe('Harbor rate limit helpers', () => {
    it('recognizes HTTP 429 errors', () => {
        expect(isHarborRateLimited({response: {status: 429}})).toBe(true);
        expect(isHarborRateLimited({response: {status: 503}})).toBe(false);
    });

    it('prefers the wait time returned in the response body', () => {
        const error = {
            response: {
                status: 429,
                data: {extras: {wait_seconds: 12.5}},
                headers: {'retry-after': '40'},
            },
        };

        expect(getHarborRateLimitDelayMs(error)).toBe(12500);
    });

    it('supports Retry-After seconds and HTTP dates', () => {
        expect(
            getHarborRateLimitDelayMs({
                response: {
                    status: 429,
                    headers: {'Retry-After': '18'},
                },
            }),
        ).toBe(18000);

        const now = Date.parse('2026-07-26T10:00:00.000Z');
        expect(
            getHarborRateLimitDelayMs(
                {
                    response: {
                        status: 429,
                        headers: {
                            'retry-after': 'Sun, 26 Jul 2026 10:00:45 GMT',
                        },
                    },
                },
                now,
            ),
        ).toBe(45000);
    });

    it('uses a safe fallback only for rate limited requests', () => {
        expect(getHarborRateLimitDelayMs({response: {status: 429}})).toBe(
            30000,
        );
        expect(getHarborRateLimitDelayMs({response: {status: 500}})).toBe(0);
    });
});
