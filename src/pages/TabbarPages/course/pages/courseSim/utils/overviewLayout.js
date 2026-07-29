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
 * 計算課卡尚可向上／下擴展的像素空間。
 * 僅受「水平重疊」的其他課卡阻擋，並排衝突卡互不限制垂直擴展。
 *
 * @param {Object} frame 目標課卡
 * @param {Array<Object>} others 同天其他課卡
 * @param {number} vGap 垂直間距
 * @param {number} canvasTop 畫布頂部
 * @param {number} canvasBottom 畫布底部
 * @returns {{up: number, down: number}}
 */
export function getExpandRoom(frame, others, vGap, canvasTop, canvasBottom) {
    let up = frame.top - canvasTop;
    let down = canvasBottom - (frame.top + frame.height);

    others.forEach(other => {
        if (!horizontalOverlap(frame, other)) {
            return;
        }
        const otherBottom = other.top + other.height;
        const frameBottom = frame.top + frame.height;

        if (otherBottom <= frame.top + 0.01) {
            up = Math.min(up, frame.top - otherBottom - vGap);
        } else if (other.top >= frameBottom - 0.01) {
            down = Math.min(down, other.top - frameBottom - vGap);
        }
    });

    return {
        up: Math.max(0, up),
        down: Math.max(0, down),
    };
}

/**
 * 將低於可讀高度的課卡，向同欄空檔擴展（可上移 top、加高 height）。
 * 優先滿足 deficit 較大者；上下空檔各取一半，不足再向另一側補。
 *
 * @param {Map<string, Object>} frames
 * @param {Object} options
 * @param {number} options.minHeight 可讀最小高度
 * @param {number} options.maxHeight 單卡上限
 * @param {number} options.vGap 課卡間距
 * @param {number} [options.canvasTop=0]
 * @param {number} options.canvasBottom
 * @returns {Map<string, Object>}
 */
export function expandFramesIntoGaps(
    frames,
    { minHeight, maxHeight, vGap, canvasTop = 0, canvasBottom },
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
        const room = getExpandRoom(
            frame,
            others,
            vGap,
            canvasTop,
            bottomBound,
        );

        let takeUp = Math.min(room.up, Math.ceil(deficit / 2));
        let takeDown = Math.min(room.down, deficit - takeUp);
        const stillNeed = deficit - takeUp - takeDown;
        if (stillNeed > 0) {
            const extraUp = Math.min(room.up - takeUp, stillNeed);
            takeUp += extraUp;
            takeDown += Math.min(
                room.down - takeDown,
                stillNeed - extraUp,
            );
        }

        if (takeUp <= 0 && takeDown <= 0) {
            return;
        }

        frames.set(key, {
            ...frame,
            top: frame.top - takeUp,
            height: frame.height + takeUp + takeDown,
        });
    });

    return frames;
}

/**
 * 計算概覽模式課卡的絕對定位 frame。
 *
 * 1. 先依時間比例定位
 * 2. 再把過矮的課卡擴展進同欄空檔，讓課室／時間可讀，且不侵入相鄰課卡
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
        canvasTop: 0,
        canvasBottom: resolvedBottom,
    });
}
