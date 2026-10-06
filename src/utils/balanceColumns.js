/**
 * 把一串區塊依序分配到 columnCount 欄，每次放進當前累計權重最小的一欄，
 * 讓各欄結尾盡量齊平；權重相同時取最左欄，保持由左至右、由上至下的閱讀順序。
 *
 * 純函數，寬屏「多欄卡片流」共用（服務頁分類卡等）。
 *
 * @template T
 * @param {T[]} items 區塊
 * @param {number} columnCount 欄數（< 1 視為 1）
 * @param {(item: T) => number} getWeight 估算區塊高度的權重（如行數）
 * @returns {T[][]} 每欄的區塊，長度固定為 columnCount
 */
export const balanceColumns = (items, columnCount, getWeight) => {
    const count = Math.max(1, Math.floor(columnCount) || 1);
    const columns = Array.from({ length: count }, () => []);
    const weights = new Array(count).fill(0);

    (items || []).forEach(item => {
        let target = 0;
        for (let index = 1; index < count; index += 1) {
            if (weights[index] < weights[target]) {
                target = index;
            }
        }
        columns[target].push(item);
        weights[target] += Math.max(0, Number(getWeight(item)) || 0);
    });

    return columns;
};
