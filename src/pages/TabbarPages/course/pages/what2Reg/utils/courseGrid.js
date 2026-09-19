import { getCourseDisplayTitle } from './courseTitle';

/**
 * 課程卡片網格的打包邏輯（純函數，方便測試）。
 *
 * 以「車道」為單位：一條車道 = 一個手機寬度的 6 欄網格，卡片按課名長度佔 2／3／6 欄
 * （即 1/3、1/2、全寬）。寬屏時可用寬度每達 LANE_MIN_WIDTH 就多開一條車道，欄數隨之倍增，
 * 卡片仍維持手機上的三種寬度，不會被拉成橫跨整個桌面的長條。
 */
export const LANE_COLUMN_COUNT = 6;
/** 開一條新車道所需的最小寬度，約等於一台大手機 */
export const LANE_MIN_WIDTH = 440;
/** 超寬屏封頂，避免卡片碎成細條 */
export const MAX_LANE_COUNT = 4;

const SHORT_COURSE_TITLE_MAX_LENGTH = 20;
const MEDIUM_COURSE_TITLE_MAX_LENGTH = 36;

export const getLaneCount = availableWidth => Math.min(
    MAX_LANE_COUNT,
    Math.max(1, Math.floor(availableWidth / LANE_MIN_WIDTH)),
);

/**
 * 計算課名的視覺長度；漢字按兩個拉丁字元計算。
 * 此數值只用來選擇三種離散欄寬，實際換行仍交由原生文字排版。
 */
const getVisualTextLength = text => Array.from(String(text || '')).reduce((length, character) => {
    return length + (/\p{Script=Han}/u.test(character) ? 2 : 1);
}, 0);

export const getCourseCardSpan = item => {
    const courseCode = item['Course Code'] || item.New_code;
    const titleCandidates = [
        item['Course Title'],
        item['Course Title Chi'],
        item.courseTitleEng,
        item.courseTitleChi,
    ].map(title => getCourseDisplayTitle(courseCode, title)).filter(Boolean);
    const titleLength = Math.max(
        ...titleCandidates.map(getVisualTextLength),
        0,
    );

    if (titleLength <= SHORT_COURSE_TITLE_MAX_LENGTH) {
        return 2;
    }
    if (titleLength <= MEDIUM_COURSE_TITLE_MAX_LENGTH) {
        return 3;
    }
    return LANE_COLUMN_COUNT;
};

/**
 * 由欄數換算像素寬：一行最多 columnCount / 2 張最窄卡片（各佔 2 欄），
 * 卡片之間的間距不算進欄寬；span 欄的卡片覆蓋 span / 2 個最窄格與其間的間距。
 * 單車道時等價於原本的三段式公式：(W − 2g) / 3、(W − g) / 2、W。
 */
export const getCourseCardWidth = (span, availableWidth, gap, columnCount = LANE_COLUMN_COUNT) => {
    const cellsPerRow = columnCount / 2;
    const cellWidth = (availableWidth - gap * (cellsPerRow - 1)) / cellsPerRow;
    const cells = span / 2;
    return Math.floor(cells * cellWidth + (cells - 1) * gap);
};

/**
 * 把一行剩餘的欄位「只增不減」地補給卡片：每次補 1 欄給當前最窄的一張，
 * 單張卡片最多撐到一條車道寬（LANE_COLUMN_COUNT），補滿即止。
 * 單車道下與原本的規則完全一致：單張升為全寬，兩張升為各 1/2，三張維持各 1/3。
 */
const fillCourseCardRow = (row, columnCount) => {
    const spans = row.map(entry => entry.span);
    let leftover = columnCount - spans.reduce((sum, span) => sum + span, 0);

    while (leftover > 0) {
        let target = -1;
        spans.forEach((span, index) => {
            if (span < LANE_COLUMN_COUNT && (target === -1 || span < spans[target])) {
                target = index;
            }
        });
        if (target === -1) {
            break;
        }
        spans[target] += 1;
        leftover -= 1;
    }

    return row.map((entry, index) => ({ ...entry, span: spans[index] }));
};

export const groupCourseCardsByRow = (list, columnCount = LANE_COLUMN_COUNT) => {
    const rows = [];
    let currentRow = [];
    let occupiedColumns = 0;

    list.forEach((item, index) => {
        const span = getCourseCardSpan(item);
        if (occupiedColumns > 0 && occupiedColumns + span > columnCount) {
            rows.push(currentRow);
            currentRow = [];
            occupiedColumns = 0;
        }

        currentRow.push({
            item,
            span,
            key: `${item['Course Code'] || item.New_code || 'course'}-${index}`,
        });
        occupiedColumns += span;

        if (occupiedColumns === columnCount) {
            rows.push(currentRow);
            currentRow = [];
            occupiedColumns = 0;
        }
    });

    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    return rows.map(row => fillCourseCardRow(row, columnCount));
};
