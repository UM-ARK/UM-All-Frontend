import {
    hasHarborInteractiveContent,
    parseHarborPostEvent,
} from '../harborPostEvent';

describe('parseHarborPostEvent', () => {
    it('優先使用 API 的 post.event', () => {
        const post = {
            cooked:
                '<p>文字</p><div class="discourse-post-event" data-name="CookedName" data-start="2025-01-01 10:00"></div>',
            event: {
                name: '招聘Test',
                starts_at: '2025-07-26T18:33:00.000+08:00',
                ends_at: '2025-07-28T00:00:00.000+08:00',
                timezone: 'Asia/Hong_Kong',
                location: 'UM',
                creator: { username: 'qq_yyy' },
                is_expired: true,
                is_ongoing: false,
                is_closed: false,
                stats: { going: 0 },
            },
        };

        expect(parseHarborPostEvent(post)).toEqual({
            name: '招聘Test',
            startsAt: '2025-07-26T18:33:00.000+08:00',
            endsAt: '2025-07-28T00:00:00.000+08:00',
            timezone: 'Asia/Hong_Kong',
            location: 'UM',
            creatorUsername: 'qq_yyy',
            isExpired: true,
            isOngoing: false,
            isClosed: false,
            goingCount: 0,
        });
    });

    it('沒有 API event 時從 cooked data 屬性解析', () => {
        const post = {
            cooked:
                '<p>可以使用Event功能開啟時間表</p>' +
                '<div class="discourse-post-event" data-start="2025-07-26 18:33" ' +
                'data-status="public" data-name="招聘Test" data-location="UM" ' +
                'data-timezone="Asia/Hong_Kong" data-end="2025-07-28 00:00" ' +
                'data-allowed-groups="trust_level_0"></div>',
        };

        expect(parseHarborPostEvent(post)).toEqual({
            name: '招聘Test',
            startsAt: '2025-07-26 18:33',
            endsAt: '2025-07-28 00:00',
            timezone: 'Asia/Hong_Kong',
            location: 'UM',
            creatorUsername: '',
            isExpired: false,
            isOngoing: false,
            isClosed: false,
            goingCount: 0,
        });
    });

    it('純文字或僅圖片帖回傳 null', () => {
        expect(
            parseHarborPostEvent({
                cooked: '<p>一般文字內容</p>',
            }),
        ).toBeNull();
        expect(
            parseHarborPostEvent({
                cooked:
                    '<p><img class="lightbox-image" src="/uploads/photo.jpeg"></p>',
            }),
        ).toBeNull();
        expect(parseHarborPostEvent(null)).toBeNull();
    });
});

describe('hasHarborInteractiveContent', () => {
    it('偵測 discourse-post-event、poll、影音', () => {
        expect(
            hasHarborInteractiveContent(
                '<div class="discourse-post-event" data-name="招聘Test"></div>',
            ),
        ).toBe(true);
        expect(hasHarborInteractiveContent('<div class="poll">投票</div>')).toBe(
            true,
        );
        expect(
            hasHarborInteractiveContent('<video src="/a.mp4"></video>'),
        ).toBe(true);
        expect(
            hasHarborInteractiveContent('<audio src="/a.mp3"></audio>'),
        ).toBe(true);
    });

    it('純文字與圖片不觸發', () => {
        expect(hasHarborInteractiveContent('<p>一般文字內容</p>')).toBe(false);
        expect(
            hasHarborInteractiveContent(
                '<p><img class="lightbox-image" src="/uploads/photo.jpeg"></p>',
            ),
        ).toBe(false);
    });
});
