import {
    applyHarborComposerFormat,
    getHarborComposerResult,
} from '../harborComposerText';

describe('applyHarborComposerFormat', () => {
    it('wraps selected text and keeps it selected', () => {
        expect(
            applyHarborComposerFormat(
                'Harbor text',
                {start: 0, end: 6},
                'bold',
            ),
        ).toEqual({
            text: '**Harbor** text',
            selection: {start: 2, end: 8},
        });
    });

    it('inserts paired markers at a collapsed cursor', () => {
        expect(
            applyHarborComposerFormat(
                'Harbor',
                {start: 6, end: 6},
                'italic',
            ),
        ).toEqual({
            text: 'Harbor**',
            selection: {start: 7, end: 7},
        });
    });

    it('uses the selected text as a link label and selects the URL', () => {
        expect(
            applyHarborComposerFormat(
                'Harbor',
                {start: 0, end: 6},
                'link',
            ),
        ).toEqual({
            text: '[Harbor](https://)',
            selection: {start: 9, end: 17},
        });
    });

    it('quotes every selected line', () => {
        expect(
            applyHarborComposerFormat(
                'first\nsecond',
                {start: 0, end: 12},
                'quote',
            ),
        ).toEqual({
            text: '> first\n> second',
            selection: {start: 0, end: 16},
        });
    });

    it('quotes the whole logical line from a collapsed mid-line cursor', () => {
        expect(
            applyHarborComposerFormat(
                'before\nmiddle text\nafter',
                {start: 13, end: 13},
                'quote',
            ),
        ).toEqual({
            text: 'before\n> middle text\nafter',
            selection: {start: 15, end: 15},
        });
    });

    it('quotes complete logical lines for a partial selection', () => {
        expect(
            applyHarborComposerFormat(
                'before\nfirst line\nsecond line\nafter',
                {start: 10, end: 27},
                'quote',
            ),
        ).toEqual({
            text: 'before\n> first line\n> second line\nafter',
            selection: {start: 7, end: 33},
        });
    });

    it('clamps invalid selections before applying inline code', () => {
        expect(
            applyHarborComposerFormat(
                'Harbor',
                {start: -2, end: 99},
                'code',
            ),
        ).toEqual({
            text: '`Harbor`',
            selection: {start: 1, end: 7},
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
