import {replaceHarborEmojiImages} from '../harborHtml';

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
