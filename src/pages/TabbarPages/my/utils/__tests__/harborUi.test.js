import {formatRelativeTime} from '../harborUi';

describe('Harbor 相對時間格式', () => {
    const now = new Date('2026-07-21T10:00:00Z').getTime();

    it('不依賴 Intl.RelativeTimeFormat 產生繁體中文時間', () => {
        expect(formatRelativeTime('2026-07-21T09:58:00Z', 'tc', now)).toBe(
            '2 分鐘前',
        );
        expect(formatRelativeTime('2026-07-20T10:00:00Z', 'tc', now)).toBe(
            '1 日前',
        );
    });

    it('產生英文單複數與未來時間', () => {
        expect(formatRelativeTime('2026-07-21T09:00:00Z', 'en', now)).toBe(
            '1 hour ago',
        );
        expect(formatRelativeTime('2026-07-23T10:00:00Z', 'en', now)).toBe(
            'in 2 days',
        );
    });

    it('處理剛剛及無效日期', () => {
        expect(formatRelativeTime('2026-07-21T09:59:40Z', 'tc', now)).toBe(
            '剛剛',
        );
        expect(formatRelativeTime('invalid', 'tc', now)).toBe('');
    });
});
