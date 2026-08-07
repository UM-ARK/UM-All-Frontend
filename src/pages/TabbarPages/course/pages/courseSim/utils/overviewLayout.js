import { getSlotKey, parseTimeToMinutes } from '../../../hooks/useConflict';

/**
 * 為同一天課節分配衝突並排的 lane。
 *
 * 演算法：
 * 1. 依開始時間排序，貪婪放入最早可用 lane（結束時間 ≤ 新課開始）
 * 2. 以時間連續簇（cluster）計算該組最大 lane 數，作為並排寬度分母
 *
 * 相接（前一節結束＝後一節開始）不算重疊，可共用同一 lane。
 *
 * @param {Array<Object>} courses 同一天的課節列表
 * @returns {Map<string, {lane: number, laneCount: number, start: number, end: number}>}
 */
export function assignOverviewLanes(courses) {
    const result = new Map();
    if (!Array.isArray(courses) || courses.length === 0) {
        return result;
    }

    const items = [];
    courses.forEach(course => {
        const start = parseTimeToMinutes(course?.['Time From']);
        const end = parseTimeToMinutes(course?.['Time To']);
        if (start === null || end === null || end <= start) {
            return;
        }
        items.push({
            key: getSlotKey(course),
            start,
            end,
        });
    });

    // 開始早者優先；同開始則較長者優先，減少跨欄碎片
    items.sort((a, b) => a.start - b.start || b.end - a.end);

    const laneEnds = [];
    items.forEach(item => {
        let lane = laneEnds.findIndex(end => end <= item.start);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(item.end);
        } else {
            laneEnds[lane] = item.end;
        }
        item.lane = lane;
    });

    // 將時間上連續重疊的課節視為同一簇，共用 laneCount
    let cluster = [];
    let clusterEnd = -1;
    let clusterMaxLane = 0;

    const flushCluster = () => {
        if (cluster.length === 0) {
            return;
        }
        const laneCount = clusterMaxLane + 1;
        cluster.forEach(item => {
            result.set(item.key, {
                lane: item.lane,
                laneCount,
                start: item.start,
                end: item.end,
            });
        });
        cluster = [];
        clusterMaxLane = 0;
        clusterEnd = -1;
    };

    items.forEach(item => {
        if (cluster.length > 0 && item.start >= clusterEnd) {
            flushCluster();
        }
        cluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.end);
        clusterMaxLane = Math.max(clusterMaxLane, item.lane);
    });
    flushCluster();

    return result;
}

/** 兩矩形是否在水平方向重疊（用於判斷垂直擴展時的阻擋卡）。 */
function horizontalOverlap(a, b) {
    return a.left < b.left + b.width && a.left + a.width > b.left;
}

/**
 * 計算課卡尚可向下擴展的像素空間。
 * 僅受「水平重疊」的下方課卡阻擋，並排衝突卡互不限制垂直擴展。
 * 不計算上方空檔，以維持同開始時間課卡對齊時間軸頂部。
 *
 * @param {Object} frame 目標課卡
 * @param {Array<Object>} others 同天其他課卡
 * @param {number} vGap 垂直間距
 * @param {number} canvasBottom 畫布底部
 * @returns {number} 可向下擴展的像素
 */
export function getExpandRoomDown(frame, others, vGap, canvasBottom) {
    let down = canvasBottom - (frame.top + frame.height);

    others.forEach(other => {
        if (!horizontalOverlap(frame, other)) {
            return;
        }
        const frameBottom = frame.top + frame.height;
        if (other.top >= frameBottom - 0.01) {
            down = Math.min(down, other.top - frameBottom - vGap);
        }
    });

    return Math.max(0, down);
}

/**
 * 將低於可讀高度的課卡，僅向下吃同欄空檔加高（不改 top）。
 * 優先滿足 deficit 較大者，讓課室／時間可讀且不侵入下方課卡。
 *
 * @param {Map<string, Object>} frames
 * @param {Object} options
 * @param {number} options.minHeight 可讀最小高度
 * @param {number} options.maxHeight 單卡上限
 * @param {number} options.vGap 課卡間距
 * @param {number} options.canvasBottom
 * @returns {Map<string, Object>}
 */
export function expandFramesIntoGaps(
    frames,
    { minHeight, maxHeight, vGap, canvasBottom },
) {
    if (!(frames instanceof Map) || frames.size === 0 || !(minHeight > 0)) {
        return frames;
    }

    const bottomBound =
        typeof canvasBottom === 'number' && Number.isFinite(canvasBottom)
            ? canvasBottom
            : Math.max(
                  ...[...frames.values()].map(f => f.top + f.height),
                  0,
              );

    const targetHeight = Math.min(minHeight, maxHeight);
    // 最需要增高者優先，避免後面的卡搶光空檔
    const order = [...frames.entries()]
        .map(([key, frame]) => ({
            key,
            deficit: targetHeight - frame.height,
        }))
        .filter(item => item.deficit > 0.5)
        .sort((a, b) => b.deficit - a.deficit);

    order.forEach(({ key }) => {
        const frame = frames.get(key);
        if (!frame) {
            return;
        }
        const deficit = targetHeight - frame.height;
        if (deficit <= 0) {
            return;
        }

        const others = [...frames.entries()]
            .filter(([otherKey]) => otherKey !== key)
            .map(([, other]) => other);
        const takeDown = Math.min(
            getExpandRoomDown(frame, others, vGap, bottomBound),
            deficit,
        );

        if (takeDown <= 0) {
            return;
        }

        frames.set(key, {
            ...frame,
            height: frame.height + takeDown,
        });
    });

    return frames;
}

/**
 * 計算概覽模式課卡的絕對定位 frame。
 *
 * 1. 先依時間比例定位
 * 2. 再把過矮的課卡僅向下擴展進同欄空檔，讓課室／時間可讀，且不改 top、不侵入下方課卡
 *
 * @param {Object} options
 * @param {Array<Object>} options.courses 同一天課節
 * @param {number} options.overviewStart 概覽時間軸起點（分鐘）
 * @param {number} options.hourHeight 每小時像素高度
 * @param {number} options.dayWidth 當天欄寬
 * @param {number} [options.hPadding=0] 左右內邊距
 * @param {number} [options.hGap=0] 並排課卡水平間距
 * @param {number} [options.vGap=0] 課卡底部預留空隙（從高度扣除）
 * @param {number} [options.maxHeight=Infinity] 單卡最大高度
 * @param {number} [options.minHeight=0] 可讀最小高度；有空檔時可擴展至此
 * @param {number} [options.canvasBottom] 當天欄可繪製底部（預設依時間軸推算）
 * @returns {Map<string, {top: number, left: number, width: number, height: number, lane: number, laneCount: number}>}
 */
export function computeOverviewCourseFrames({
    courses,
    overviewStart,
    hourHeight,
    dayWidth,
    hPadding = 0,
    hGap = 0,
    vGap = 0,
    maxHeight = Infinity,
    minHeight = 0,
    canvasBottom,
}) {
    const frames = new Map();
    const laneMap = assignOverviewLanes(courses);
    const availableWidth = Math.max(dayWidth - hPadding * 2, 0);

    laneMap.forEach((meta, key) => {
        const { lane, laneCount, start, end } = meta;
        const colWidth =
            laneCount > 0
                ? (availableWidth - hGap * Math.max(laneCount - 1, 0)) /
                  laneCount
                : availableWidth;
        const rawHeight = ((end - start) / 60) * hourHeight;
        const height = Math.max(0, Math.min(maxHeight, rawHeight - vGap));

        frames.set(key, {
            top: ((start - overviewStart) / 60) * hourHeight,
            left: hPadding + lane * (colWidth + hGap),
            width: Math.max(colWidth, 0),
            height,
            lane,
            laneCount,
        });
    });

    const resolvedBottom =
        typeof canvasBottom === 'number' && Number.isFinite(canvasBottom)
            ? canvasBottom
            : Math.max(
                  ...[...frames.values()].map(f => f.top + f.height + vGap),
                  hourHeight,
              );

    return expandFramesIntoGaps(frames, {
        minHeight,
        maxHeight,
        vGap,
        canvasBottom: resolvedBottom,
    });
}

/**
 * 計算時間軸終點之後需預留的像素，讓貼底矮卡可向下擴到 minHeight。
 * 中段矮卡仍靠欄內空檔擴展，不計入此墊。
 *
 * @param {Object} options
 * @param {Array<Object>} options.courses 全部課節（跨天）
 * @param {number} options.overviewStart 時間軸起點（分鐘）
 * @param {number} options.overviewEnd 時間軸終點（分鐘）
 * @param {number} options.hourHeight 每小時像素
 * @param {number} [options.vGap=0]
 * @param {number} [options.maxHeight=Infinity]
 * @param {number} [options.minHeight=0]
 * @returns {number}
 */
export function computeOverviewBottomExpandPad({
    courses,
    overviewStart,
    overviewEnd,
    hourHeight,
    vGap = 0,
    maxHeight = Infinity,
    minHeight = 0,
}) {
    if (
        !Array.isArray(courses) ||
        !(minHeight > 0) ||
        !(hourHeight > 0) ||
        !(overviewEnd > overviewStart)
    ) {
        return 0;
    }

    const timelineEnd = ((overviewEnd - overviewStart) / 60) * hourHeight;
    let pad = 0;

    courses.forEach(course => {
        const start = parseTimeToMinutes(course?.['Time From']);
        const end = parseTimeToMinutes(course?.['Time To']);
        if (start === null || end === null || end <= start) {
            return;
        }

        const rawHeight = ((end - start) / 60) * hourHeight;
        const height = Math.max(0, Math.min(maxHeight, rawHeight - vGap));
        if (height >= minHeight - 0.5) {
            return;
        }

        const top = ((start - overviewStart) / 60) * hourHeight;
        const frameBottom = top + height;
        const roomInTimeline = timelineEnd - frameBottom;
        const deficit = minHeight - height;
        pad = Math.max(pad, Math.max(0, deficit - Math.max(0, roomInTimeline)));
    });

    return pad;
}

/**
 * 從可用高度預扣貼底擴展墊，回傳 hourHeight 與總畫布高（≤ overviewMaxHeight），
 * 讓最後一節矮卡可向下伸展且整表落在可視區內、無需翻頁。
 *
 * @param {Object} options
 * @param {Array<Object>} [options.courses=[]]
 * @param {number} options.overviewStart
 * @param {number} options.overviewEnd
 * @param {number} options.overviewDuration
 * @param {number} options.overviewMaxHeight 課表網格可用最大高度
 * @param {number} options.hourHeightCap 每小時高度上限
 * @param {number} [options.vGap=0]
 * @param {number} [options.maxCourseHeight=Infinity]
 * @param {number} [options.minCourseHeight=0]
 * @returns {{overviewHourHeight: number, overviewHeight: number, bottomExpandPad: number}}
 */
export function resolveOverviewCanvasSize({
    courses = [],
    overviewStart,
    overviewEnd,
    overviewDuration,
    overviewMaxHeight,
    hourHeightCap,
    vGap = 0,
    maxCourseHeight = Infinity,
    minCourseHeight = 0,
}) {
    const duration = Math.max(overviewDuration, 1);
    const maxHeight = Math.max(overviewMaxHeight, 1);
    const provisionalHourHeight = Math.min(
        hourHeightCap,
        (maxHeight / duration) * 60,
    );
    let bottomExpandPad = Math.min(
        computeOverviewBottomExpandPad({
            courses,
            overviewStart,
            overviewEnd,
            hourHeight: provisionalHourHeight,
            vGap,
            maxHeight: maxCourseHeight,
            minHeight: minCourseHeight,
        }),
        Math.max(0, maxHeight - 1),
    );

    const timelineBudget = Math.max(1, maxHeight - bottomExpandPad);
    const overviewHourHeight = Math.min(
        hourHeightCap,
        (timelineBudget / duration) * 60,
    );
    // 壓縮後矮卡 deficit 可能略增，再算一次並保證總高不超出可視區
    bottomExpandPad = Math.min(
        computeOverviewBottomExpandPad({
            courses,
            overviewStart,
            overviewEnd,
            hourHeight: overviewHourHeight,
            vGap,
            maxHeight: maxCourseHeight,
            minHeight: minCourseHeight,
        }),
        Math.max(0, maxHeight - 1),
    );
    const finalTimelineBudget = Math.max(1, maxHeight - bottomExpandPad);
    const finalHourHeight = Math.min(
        hourHeightCap,
        (finalTimelineBudget / duration) * 60,
    );
    const timelineHeight = (duration / 60) * finalHourHeight;
    const overviewHeight = Math.min(maxHeight, timelineHeight + bottomExpandPad);

    return {
        overviewHourHeight: finalHourHeight,
        overviewHeight,
        bottomExpandPad,
    };
}
