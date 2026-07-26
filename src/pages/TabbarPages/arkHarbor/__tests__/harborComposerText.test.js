import {
    buildHarborComposerRaw,
    getHarborComposerResult,
} from '../harborComposerText';

describe('buildHarborComposerRaw', () => {
    it('把圖片統一接在純文字正文末尾', () => {
        expect(
            buildHarborComposerRaw('  分享活動。  ', [
                {shortUrl: 'upload://first.jpeg'},
                {shortUrl: 'upload://second.png'},
            ]),
        ).toBe(
            '分享活動。\n\n' +
            '![圖片](upload://first.jpeg)\n\n' +
            '![圖片](upload://second.png)',
        );
    });

    it('忽略尚未上傳成功的圖片', () => {
        expect(
            buildHarborComposerRaw('', [
                {shortUrl: 'upload://ready.jpeg'},
                {status: 'failed'},
            ]),
        ).toBe('![圖片](upload://ready.jpeg)');
    });
});

describe('getHarborComposerResult', () => {
    it('reads a created post from the nested Discourse response', () => {
        expect(
            getHarborComposerResult({
                action: 'create_post',
                post: {topic_id: 31, post_number: 4},
            }),
        ).toEqual({
            pending: false,
            topicId: 31,
            postNumber: 4,
        });
    });

    it('recognizes a queued post without inventing a destination', () => {
        expect(
            getHarborComposerResult({
                action: 'enqueued',
                pending_post: {id: 9},
            }),
        ).toEqual({
            pending: true,
            topicId: null,
            postNumber: null,
        });
    });
});
