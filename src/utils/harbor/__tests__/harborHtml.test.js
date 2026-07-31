import {
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
