const REVEAL_DISTANCE_RATIO = 2;
const JUMP_RATIO = 8;

// progress：0 完全展開，1 完全收起。delta 向下為正。
// 往下瀏覽按搜尋列高度收起；往回滑用較長距離展開，所以不必回到頂部。
export const nextHarborSearchBarProgress = (
    progress,
    offset,
    delta,
    barHeight,
) => {
    if (offset <= 0) {
        return 0;
    }
    if (Math.abs(delta) > barHeight * JUMP_RATIO) {
        return progress;
    }
    const distance = delta < 0 ? barHeight * REVEAL_DISTANCE_RATIO : barHeight;
    const next = Math.min(1, Math.max(0, progress + delta / distance));
    // 貼近頂部時不收得比內容還深，避免搜尋列和第一則話題之間留空
    if (offset < barHeight) {
        return Math.min(next, offset / barHeight);
    }
    return next;
};
