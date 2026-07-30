jest.mock('@callstack/liquid-glass', () => ({
    isLiquidGlassSupported: false,
}));
jest.mock('react-native-simple-toast', () => ({
    show: jest.fn(),
}));
jest.mock('react-native-size-matters', () => ({
    verticalScale: value => value,
}));
jest.mock('../../../../../utils/harbor/harborApi', () => ({
    fetchHarborTopic: jest.fn(),
    saveHarborTopicTimings: jest.fn(),
}));
jest.mock('../harborTopicModels', () => ({
    isCanceledRequest: jest.fn(),
    mergeTopicWindow: jest.fn(),
}));

import {getReadingPostNumber} from '../useHarborTopicReading';

describe('Harbor 話題閱讀樓層', () => {
    const visiblePosts = [
        {
            index: 1,
            item: {post_number: 2},
        },
        {
            index: 2,
            item: {post_number: 3},
        },
    ];
    const getLayout = index => {
        return {
            y: index === 1 ? 500 : 900,
            height: 400,
        };
    };

    it('一般滾動以閱讀線所在樓層上報', () => {
        expect(
            getReadingPostNumber({
                atTopicEnd: false,
                firstItemOffset: 0,
                getLayout,
                readingLineOffset: 700,
                visiblePosts,
            }),
        ).toBe(2);
    });

    it('到達底部且最後兩樓同屏時上報最後一樓', () => {
        expect(
            getReadingPostNumber({
                atTopicEnd: true,
                firstItemOffset: 0,
                getLayout,
                readingLineOffset: 700,
                visiblePosts,
            }),
        ).toBe(3);
    });
});
