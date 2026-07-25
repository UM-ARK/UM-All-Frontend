import { useMemo } from 'react';

/**
 * 解析 'HH:mm' 或 'HH:mm:ss' 為當日分鐘數。
 *
 * 課表精度只到分鐘，秒數僅接受但不參與計算（課程資料實際只有 HH:mm，
 * 舊程式碼卻以 'HH:mm:ss' 格式字串解析，這裡兩種都收以免相容性問題）。
 *
 * @param {string} time 時間字串
 * @returns {number|null} 當日分鐘數；非法輸入回傳 null
 */
export const parseTimeToMinutes = time => {
    if (typeof time !== 'string') {
        return null;
    }

    const matched = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(time.trim());
    if (!matched) {
        return null;
    }

    const hours = Number(matched[1]);
    if (hours > 23) {
        return null;
    }

    return hours * 60 + Number(matched[2]);
};

/**
 * 判斷兩個課節是否重疊。
 *
 * 相接（前一節結束等於後一節開始）不算重疊。
 *
 * @param {Object} slotA 課節 A
 * @param {Object} slotB 課節 B
 * @returns {boolean} 是否重疊
 */
export const isSlotOverlap = (slotA, slotB) => {
    if (!slotA || !slotB) {
        return false;
    }

    if (!slotA.Day || slotA.Day !== slotB.Day) {
        return false;
    }

    const fromA = parseTimeToMinutes(slotA['Time From']);
    const toA = parseTimeToMinutes(slotA['Time To']);
    const fromB = parseTimeToMinutes(slotB['Time From']);
    const toB = parseTimeToMinutes(slotB['Time To']);

    if (fromA === null || toA === null || fromB === null || toB === null) {
        return false;
    }

    return fromA < toB && fromB < toA;
};

/**
 * 找出一組課節中所有互相重疊的配對。
 *
 * 同一天內兩兩配對比較，而非僅比較排序後的相鄰課節，
 * 否則會漏掉跨越式重疊（例：09:00-12:00 與 11:30-12:30 中間夾了 10:00-11:00）。
 *
 * @param {Array<Object>} slots 課節列表
 * @returns {Array<{a: Object, b: Object}>} 重疊配對
 */
export const findConflictPairs = slots => {
    if (!Array.isArray(slots) || slots.length < 2) {
        return [];
    }

    const slotsByDay = new Map();
    slots.forEach(slot => {
        const day = slot?.Day;
        if (!day) {
            return;
        }
        if (!slotsByDay.has(day)) {
            slotsByDay.set(day, []);
        }
        slotsByDay.get(day).push(slot);
    });

    const pairs = [];
    slotsByDay.forEach(daySlots => {
        for (let i = 0; i < daySlots.length; i++) {
            for (let j = i + 1; j < daySlots.length; j++) {
                if (isSlotOverlap(daySlots[i], daySlots[j])) {
                    pairs.push({ a: daySlots[i], b: daySlots[j] });
                }
            }
        }
    });

    return pairs;
};

/**
 * 產生課節的穩定唯一鍵。
 *
 * @param {Object} slot 課節
 * @returns {string} `${Day}-${Course Code}-${Section}-${Time From}-${Time To}`
 */
export const getSlotKey = slot => {
    if (!slot) {
        return '';
    }

    return [
        slot.Day,
        slot['Course Code'],
        slot.Section,
        slot['Time From'],
        slot['Time To'],
    ].join('-');
};

/**
 * 計算候選課節與現有課表課節的碰撞。
 *
 * @param {Array<Object>} candidateSlots 候選 section 的所有課節
 * @param {Array<Object>} planSlots 目前課表的所有課節
 * @returns {Array<{day: string, courseCode: string, section: string, timeFrom: string, timeTo: string}>}
 *   撞到的既有課節（同一課節只回報一次）
 */
export const getSectionConflicts = (candidateSlots, planSlots) => {
    if (!Array.isArray(candidateSlots) || !Array.isArray(planSlots)) {
        return [];
    }

    const conflicts = [];
    const reportedKeys = new Set();

    candidateSlots.forEach(candidate => {
        planSlots.forEach(planSlot => {
            // 候選 section 可能已在課表中，同 Course Code + Section 不算撞自己
            if (
                candidate?.['Course Code'] === planSlot?.['Course Code'] &&
                candidate?.Section === planSlot?.Section
            ) {
                return;
            }

            if (!isSlotOverlap(candidate, planSlot)) {
                return;
            }

            const key = getSlotKey(planSlot);
            if (reportedKeys.has(key)) {
                return;
            }
            reportedKeys.add(key);

            conflicts.push({
                day: planSlot.Day,
                courseCode: planSlot['Course Code'],
                section: planSlot.Section,
                timeFrom: planSlot['Time From'],
                timeTo: planSlot['Time To'],
            });
        });
    });

    return conflicts;
};

/**
 * 由課表課節推導衝突資訊。
 *
 * @param {Array<Object>} planSlots 目前課表的所有課節
 * @returns {{conflictPairs: Array, conflictCount: number, hasConflict: boolean, conflictSlotKeys: Set<string>}}
 */
export const useConflict = planSlots =>
    useMemo(() => {
        const conflictPairs = findConflictPairs(planSlots);

        // UI 只需以 getSlotKey 查表判斷單一課節是否參與衝突
        const conflictSlotKeys = new Set();
        conflictPairs.forEach(({ a, b }) => {
            conflictSlotKeys.add(getSlotKey(a));
            conflictSlotKeys.add(getSlotKey(b));
        });

        return {
            conflictPairs,
            conflictCount: conflictPairs.length,
            hasConflict: conflictPairs.length > 0,
            conflictSlotKeys,
        };
    }, [planSlots]);

export default useConflict;
