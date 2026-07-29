import {
    assignOverviewLanes,
    computeOverviewCourseFrames,
} from '../utils/overviewLayout';
import { getSlotKey } from '../../../hooks/useConflict';

/**
 * 建立測試用課節
 *
 * @param {string} courseCode 課程代碼
 * @param {string} section Section
 * @param {string} day 星期
 * @param {string} timeFrom 開始時間
 * @param {string} timeTo 結束時間
 * @returns {Object} 課節物件
 */
const makeSlot = (courseCode, section, day, timeFrom, timeTo) => ({
    'Course Code': courseCode,
    Section: section,
    Day: day,
    'Time From': timeFrom,
    'Time To': timeTo,
});

describe('assignOverviewLanes', () => {
    it('無衝突課節共用單一 lane', () => {
        const courses = [
            makeSlot('SOCY1001', '001', 'MON', '13:00', '14:15'),
            makeSlot('PORT2013', '001', 'MON', '14:30', '15:45'),
        ];

        const lanes = assignOverviewLanes(courses);

        expect(lanes.get(getSlotKey(courses[0]))).toMatchObject({
            lane: 0,
            laneCount: 1,
        });
        expect(lanes.get(getSlotKey(courses[1]))).toMatchObject({
            lane: 0,
            laneCount: 1,
        });
    });

    it('相接課節不算重疊，可共用 lane', () => {
        const courses = [
            makeSlot('ACCT1000', '001', 'TUE', '09:00', '10:00'),
            makeSlot('CISC1000', '001', 'TUE', '10:00', '11:00'),
        ];

        const lanes = assignOverviewLanes(courses);

        expect(lanes.get(getSlotKey(courses[0])).lane).toBe(0);
        expect(lanes.get(getSlotKey(courses[1])).lane).toBe(0);
        expect(lanes.get(getSlotKey(courses[0])).laneCount).toBe(1);
    });

    it('時間衝突課節分配不同 lane', () => {
        const courses = [
            makeSlot('SOCY1001', '001', 'WED', '13:00', '14:15'),
            makeSlot('PORT2013', '001', 'WED', '14:30', '15:45'),
            makeSlot('LAWS2003', '001', 'WED', '14:00', '15:45'),
        ];

        const lanes = assignOverviewLanes(courses);
        const socy = lanes.get(getSlotKey(courses[0]));
        const port = lanes.get(getSlotKey(courses[1]));
        const laws = lanes.get(getSlotKey(courses[2]));

        // LAWS 與 SOCY、PORT 皆重疊，應佔另一欄
        expect(laws.lane).not.toBe(socy.lane);
        expect(laws.lane).not.toBe(port.lane);
        // 三節落在同一衝突簇
        expect(socy.laneCount).toBe(2);
        expect(port.laneCount).toBe(2);
        expect(laws.laneCount).toBe(2);
        // 無衝突的 SOCY / PORT 可同欄
        expect(socy.lane).toBe(port.lane);
    });

    it('跨越式重疊會擴大同一簇的 laneCount', () => {
        const courses = [
            makeSlot('LONG1000', '001', 'THU', '09:00', '12:00'),
            makeSlot('MID1000', '001', 'THU', '09:30', '10:00'),
            makeSlot('LATE1000', '001', 'THU', '10:30', '11:00'),
        ];

        const lanes = assignOverviewLanes(courses);

        expect(lanes.get(getSlotKey(courses[0])).laneCount).toBe(2);
        expect(lanes.get(getSlotKey(courses[1])).laneCount).toBe(2);
        expect(lanes.get(getSlotKey(courses[2])).laneCount).toBe(2);
        expect(lanes.get(getSlotKey(courses[1])).lane).toBe(
            lanes.get(getSlotKey(courses[2])).lane,
        );
    });

    it('空列表與非法時間回傳空 Map', () => {
        expect(assignOverviewLanes([]).size).toBe(0);
        expect(assignOverviewLanes(null).size).toBe(0);

        const invalid = [
            makeSlot('BAD1000', '001', 'FRI', '14:00', '13:00'),
            { Day: 'FRI', 'Course Code': 'X', Section: '1' },
        ];
        expect(assignOverviewLanes(invalid).size).toBe(0);
    });
});

describe('computeOverviewCourseFrames', () => {
    const baseOptions = {
        overviewStart: 13 * 60,
        hourHeight: 60,
        dayWidth: 100,
        hPadding: 2,
        hGap: 2,
        vGap: 3,
        maxHeight: 200,
        minHeight: 0,
    };

    it('非衝突相鄰課卡保留垂直空隙、不互相侵入', () => {
        const courses = [
            makeSlot('SOCY1001', '001', 'MON', '13:00', '14:15'),
            makeSlot('PORT2013', '001', 'MON', '14:30', '15:45'),
        ];

        const frames = computeOverviewCourseFrames({
            ...baseOptions,
            courses,
        });

        const socy = frames.get(getSlotKey(courses[0]));
        const port = frames.get(getSlotKey(courses[1]));

        // 75 分鐘 → 75px，再扣 vGap
        expect(socy.top).toBe(0);
        expect(socy.height).toBe(72);
        expect(port.top).toBe(90);
        // SOCY 底部不得碰到 PORT 頂部
        expect(socy.top + socy.height).toBeLessThan(port.top);
        // 兩者同寬佔滿欄（扣 padding）
        expect(socy.width).toBe(96);
        expect(port.width).toBe(96);
        expect(socy.left).toBe(2);
    });

    it('衝突課卡水平並排且保留間距', () => {
        const courses = [
            makeSlot('SOCY1001', '001', 'WED', '13:00', '14:15'),
            makeSlot('LAWS2003', '001', 'WED', '14:00', '15:45'),
        ];

        const frames = computeOverviewCourseFrames({
            ...baseOptions,
            courses,
        });

        const socy = frames.get(getSlotKey(courses[0]));
        const laws = frames.get(getSlotKey(courses[1]));

        expect(socy.laneCount).toBe(2);
        expect(laws.laneCount).toBe(2);
        expect(socy.width).toBe(47);
        expect(laws.width).toBe(47);
        expect(socy.left).not.toBe(laws.left);
        // 水平不重疊
        const left = socy.left < laws.left ? socy : laws;
        const right = socy.left < laws.left ? laws : socy;
        expect(left.left + left.width).toBeLessThanOrEqual(right.left);
    });

    it('相鄰過近時擴展可吃空檔但不侵入下一節', () => {
        const courses = [
            makeSlot('SOCY1001', '001', 'MON', '13:00', '14:15'),
            makeSlot('PORT2013', '001', 'MON', '14:30', '15:45'),
        ];

        const frames = computeOverviewCourseFrames({
            ...baseOptions,
            hourHeight: 30,
            minHeight: 52,
            canvasBottom: 200,
            courses,
        });

        const socy = frames.get(getSlotKey(courses[0]));
        const port = frames.get(getSlotKey(courses[1]));

        // 時間比例約 34.5，可向 15 分鐘空檔略擴，但仍須與 PORT 留 vGap
        expect(socy.height).toBeGreaterThan(34.5);
        expect(socy.top + socy.height + 3).toBeLessThanOrEqual(port.top + 0.01);
    });

    it('同欄上下有空檔時矮卡擴展至可讀高度', () => {
        // PORT 15:45 結束後到畫布底部皆空，LAWS 17:00-17:50 應能長高
        const courses = [
            makeSlot('PORT2013', '001', 'MON', '14:30', '15:45'),
            makeSlot('LAWS2007', '001', 'MON', '17:00', '17:50'),
        ];

        const frames = computeOverviewCourseFrames({
            overviewStart: 13 * 60,
            hourHeight: 40,
            dayWidth: 100,
            vGap: 3,
            maxHeight: 120,
            minHeight: 56,
            canvasBottom: 8 * 40, // 13:00–21:00
            courses,
        });

        const laws = frames.get(getSlotKey(courses[1]));
        const port = frames.get(getSlotKey(courses[0]));

        // 50 分鐘 × 40/60 ≈ 33.3，扣 vGap 後遠低於 56，應擴到接近 minHeight
        expect(laws.height).toBeGreaterThanOrEqual(55);
        expect(laws.height).toBeLessThanOrEqual(56);
        // 不可侵入上方 PORT
        expect(port.top + port.height + 3).toBeLessThanOrEqual(laws.top + 0.01);
        // 不可超出畫布
        expect(laws.top + laws.height).toBeLessThanOrEqual(8 * 40);
    });

    it('maxHeight 會限制過長課卡', () => {
        const courses = [makeSlot('LONG1000', '001', 'FRI', '09:00', '12:00')];

        const frames = computeOverviewCourseFrames({
            overviewStart: 9 * 60,
            hourHeight: 60,
            dayWidth: 100,
            vGap: 0,
            maxHeight: 100,
            courses,
        });

        expect(frames.get(getSlotKey(courses[0])).height).toBe(100);
    });
});
