import {
    groupConsecutiveHarborImages,
    replaceHarborEmojiImages,
    replaceHarborEmojiShortcodes,
    stripTrailingEmptyHarborHtml,
} from '../harborHtml';

describe('replaceHarborEmojiImages', () => {
    it('把 Harbor emoji 圖片轉為行內元素', () => {
        const html =
            '<p>錯峰吃飯！' +
            '<img src="/images/emoji/twitter/clap.png?v=15" ' +
            'title=":clap:" class="emoji" alt=":clap:" width="20" height="20">' +
            '<img src="/images/emoji/twitter/tada.png?v=15" ' +
            'title=":tada:" class="emoji" alt=":tada:" width="20" height="20">' +
            '</p>';

        expect(replaceHarborEmojiImages(html)).toBe(
            '<p>錯峰吃飯！' +
                '<harbor-emoji src="/images/emoji/twitter/clap.png?v=15" ' +
                'alt=":clap:">\u200b</harbor-emoji>' +
                '<harbor-emoji src="/images/emoji/twitter/tada.png?v=15" ' +
                'alt=":tada:">\u200b</harbor-emoji>' +
                '</p>',
        );
    });

    it('保留一般帖子圖片', () => {
        const html = '<img class="lightbox-image" src="/uploads/photo.jpeg">';

        expect(replaceHarborEmojiImages(html)).toBe(html);
    });

    it('在 emoji 圖片缺少網址時顯示替代文字', () => {
        const html = '<img class="emoji" title=":wave:">';

        expect(replaceHarborEmojiImages(html)).toBe(':wave:');
    });
});

describe('stripTrailingEmptyHarborHtml', () => {
    it('去掉尾部空段落與換行', () => {
        expect(
            stripTrailingEmptyHarborHtml('<p>测试回复</p><p></p><p><br></p>'),
        ).toBe('<p>测试回复</p>');
        expect(stripTrailingEmptyHarborHtml('<p>测试回复</p><br><br>')).toBe(
            '<p>测试回复</p>',
        );
    });

    it('保留有內容的段落', () => {
        expect(stripTrailingEmptyHarborHtml('<p>第一段</p><p>第二段</p>')).toBe(
            '<p>第一段</p><p>第二段</p>',
        );
    });
});

describe('groupConsecutiveHarborImages', () => {
    it('單張圖片維持原 HTML', () => {
        const html =
            '<p>說明</p><p><img class="lightbox-image" src="/uploads/a.jpeg" alt="A"></p>';

        expect(groupConsecutiveHarborImages(html)).toBe(html);
    });

    it('連續 lightbox 圖片合併為 3 列網格標記', () => {
        const html =
            '<div class="lightbox-wrapper">' +
            '<a class="lightbox" href="/uploads/a-ori.jpeg">' +
            '<img src="/uploads/a.jpeg" alt="A" class="lightbox-image">' +
            '<div class="meta"><span class="filename">a.jpeg</span></div>' +
            '</a></div>' +
            '<p></p>' +
            '<div class="lightbox-wrapper">' +
            '<a class="lightbox" href="/uploads/b-ori.jpeg">' +
            '<img src="/uploads/b.jpeg" alt="B" class="lightbox-image">' +
            '<div class="meta"><span class="filename">b.jpeg</span></div>' +
            '</a></div>' +
            '<div class="lightbox-wrapper">' +
            '<a class="lightbox" href="/uploads/c-ori.jpeg">' +
            '<img src="/uploads/c.jpeg" alt="C" class="lightbox-image">' +
            '<div class="meta"><span class="filename">c.jpeg</span></div>' +
            '</a></div>';

        expect(groupConsecutiveHarborImages(html)).toBe(
            '<harbor-image-grid>' +
                '<harbor-grid-img src="/uploads/a.jpeg" href="/uploads/a-ori.jpeg" alt="A"></harbor-grid-img>' +
                '<harbor-grid-img src="/uploads/b.jpeg" href="/uploads/b-ori.jpeg" alt="B"></harbor-grid-img>' +
                '<harbor-grid-img src="/uploads/c.jpeg" href="/uploads/c-ori.jpeg" alt="C"></harbor-grid-img>' +
                '</harbor-image-grid>',
        );
    });

    it('文字分隔的圖片不會被合併', () => {
        const html =
            '<p><img src="/uploads/a.jpeg" alt="A"></p>' +
            '<p>中間文字</p>' +
            '<p><img src="/uploads/b.jpeg" alt="B"></p>';

        expect(groupConsecutiveHarborImages(html)).toBe(html);
    });

    it('連續段落圖片會合併，emoji 不受影響', () => {
        const html =
            '<p>開頭' +
            '<img src="/images/emoji/twitter/clap.png" class="emoji" alt=":clap:">' +
            '</p>' +
            '<p><img src="/uploads/a.jpeg" alt="A"></p>' +
            '<p><img src="/uploads/b.jpeg" alt="B"></p>';

        expect(groupConsecutiveHarborImages(html)).toBe(
            '<p>開頭' +
                '<img src="/images/emoji/twitter/clap.png" class="emoji" alt=":clap:">' +
                '</p>' +
                '<harbor-image-grid>' +
                '<harbor-grid-img src="/uploads/a.jpeg" href="/uploads/a.jpeg" alt="A"></harbor-grid-img>' +
                '<harbor-grid-img src="/uploads/b.jpeg" href="/uploads/b.jpeg" alt="B"></harbor-grid-img>' +
                '</harbor-image-grid>',
        );
    });
    it('同一段落內多張圖片也會合併', () => {
        const html =
            '<p>' +
            '<img src="/uploads/a.jpeg" alt="A">' +
            '<img src="/uploads/b.jpeg" alt="B">' +
            '<img src="/uploads/c.jpeg" alt="C">' +
            '</p>';

        expect(groupConsecutiveHarborImages(html)).toBe(
            '<harbor-image-grid>' +
                '<harbor-grid-img src="/uploads/a.jpeg" href="/uploads/a.jpeg" alt="A"></harbor-grid-img>' +
                '<harbor-grid-img src="/uploads/b.jpeg" href="/uploads/b.jpeg" alt="B"></harbor-grid-img>' +
                '<harbor-grid-img src="/uploads/c.jpeg" href="/uploads/c.jpeg" alt="C"></harbor-grid-img>' +
                '</harbor-image-grid>',
        );
    });
});

describe('replaceHarborEmojiShortcodes', () => {
    it('把列表摘要中的 shortcode 轉成 Unicode', () => {
        expect(
            replaceHarborEmojiShortcodes(
                '这个月都没有了:sob:之后还会上吗(T ^ T)',
            ),
        ).toBe('这个月都没有了😭之后还会上吗(T ^ T)');
    });

    it('連續 shortcode 與 Discourse 別名皆可轉換', () => {
        expect(
            replaceHarborEmojiShortcodes('錯峰吃飯！:clap::tada: 加價:plus:5'),
        ).toBe('錯峰吃飯！👏🎉 加價➕5');
    });

    it('未知 shortcode 原樣保留', () => {
        expect(replaceHarborEmojiShortcodes('自訂:custom_site_emoji:表情')).toBe(
            '自訂:custom_site_emoji:表情',
        );
    });
});
