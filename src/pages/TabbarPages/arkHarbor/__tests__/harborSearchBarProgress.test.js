import { nextHarborSearchBarProgress } from '../harborSearchBarProgress';

const BAR = 40;

describe('Harbor 搜尋列展開進度', () => {
    it('從頂部往下瀏覽時跟內容一起收起', () => {
        let progress = 0;
        progress = nextHarborSearchBarProgress(progress, 10, 10, BAR);
        expect(progress).toBeCloseTo(10 / BAR);
        progress = nextHarborSearchBarProgress(progress, BAR, BAR - 10, BAR);
        expect(progress).toBeCloseTo(1);
    });

    it('離開頂部後往回滑會在原地展開', () => {
        let progress = 1;
        progress = nextHarborSearchBarProgress(progress, 390, -10, BAR);
        expect(progress).toBeCloseTo(1 - 10 / (BAR * 2));
        expect(progress).toBeLessThan(1);
        progress = nextHarborSearchBarProgress(progress, 310, -80, BAR);
        expect(progress).toBe(0);
    });

    it('貼近頂部時不會收得比滾動距離更深', () => {
        const progress = nextHarborSearchBarProgress(0, 10, 10, BAR);
        expect(progress).toBeLessThanOrEqual(10 / BAR);
    });

    it('拉過頂部時保持展開', () => {
        expect(nextHarborSearchBarProgress(1, -12, -12, BAR)).toBe(0);
    });

    it('忽略列表補正造成的大跳', () => {
        expect(nextHarborSearchBarProgress(1, 20, -800, BAR)).toBe(1);
    });
});
