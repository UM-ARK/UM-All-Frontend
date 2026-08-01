import {
    buildHarborComposerRaw,
    getHarborComposerResult,
    splitHarborComposerRaw,
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

    it('在回覆引用末尾加入已上傳圖片', () => {
        expect(
            buildHarborComposerRaw('> 引用內容\n\n回覆文字', [
                {shortUrl: 'upload://reply.jpeg'},
            ]),
        ).toBe(
            '> 引用內容\n\n回覆文字\n\n' +
            '![圖片](upload://reply.jpeg)',
        );
    });

    it('保留既有圖片 Markdown 並依隊列順序放到文末', () => {
        expect(
            buildHarborComposerRaw('正文', [
                {
                    shortUrl: 'upload://second.jpeg',
                    markdown: '![第二張|690x388](upload://second.jpeg)',
                },
                {
                    shortUrl: 'upload://first.jpeg',
                    markdown: '![第一張](upload://first.jpeg)',
                },
            ]),
        ).toBe(
            '正文\n\n' +
            '![第二張|690x388](upload://second.jpeg)\n\n' +
            '![第一張](upload://first.jpeg)',
        );
    });
});

describe('splitHarborComposerRaw', () => {
    it('把獨立成行的 Harbor 圖片拆成可排序隊列', () => {
        expect(
            splitHarborComposerRaw(
                '第一段\n\n' +
                '![圖片](upload://first.jpeg)\n\n' +
                '第二段\n' +
                '![花朵|690x388](upload://second.jpeg)',
                {
                    previewUrls: [
                        'https://harbor.example.com/first.jpeg',
                        'https://harbor.example.com/second.jpeg',
                    ],
                },
            ),
        ).toMatchObject({
            text: '第一段\n\n第二段',
            images: [
                {
                    shortUrl: 'upload://first.jpeg',
                    remoteUrl: 'https://harbor.example.com/first.jpeg',
                    status: 'uploaded',
                },
                {
                    shortUrl: 'upload://second.jpeg',
                    remoteUrl: 'https://harbor.example.com/second.jpeg',
                    status: 'uploaded',
                },
            ],
        });
    });

    it('不移動行內圖片、外部圖片或普通 Markdown', () => {
        const raw =
            '文字 ![行內](upload://inline.jpeg)\n' +
            '![外部](https://example.com/image.jpeg)';

        expect(splitHarborComposerRaw(raw)).toEqual({
            text: raw,
            images: [],
        });
    });

    it('從既有圖片保留預覽和本機狀態', () => {
        const existingImage = {
            id: 'existing',
            localUri: 'file:///image.jpeg',
            remoteUrl: 'https://harbor.example.com/image.jpeg',
            shortUrl: 'upload://image.jpeg',
        };

        expect(
            splitHarborComposerRaw(
                '![圖片](upload://image.jpeg)',
                {existingImages: [existingImage]},
            ).images[0],
        ).toMatchObject({
            id: 'existing',
            localUri: 'file:///image.jpeg',
            shortUrl: 'upload://image.jpeg',
            status: 'uploaded',
        });
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
