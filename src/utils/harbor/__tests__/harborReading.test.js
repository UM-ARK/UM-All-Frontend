jest.mock('../../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

import {
    getHarborReadingPosition,
    HARBOR_READING_STORAGE_KEY,
    saveHarborReadingPosition,
} from '../harborReading';
import {getLocalStorage, setLocalStorage} from '../../storageKits';

describe('Harbor 閱讀位置工具', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setLocalStorage.mockResolvedValue('ok');
    });

    it('讀取 topic 的有效最高已讀樓層', async () => {
        getLocalStorage.mockResolvedValue({
            12: 8,
            13: 3,
        });

        await expect(getHarborReadingPosition(12)).resolves.toBe(8);
        expect(getLocalStorage).toHaveBeenCalledWith(
            HARBOR_READING_STORAGE_KEY,
        );
    });

    it('缺少或破損的閱讀位置會安全返回 null', async () => {
        getLocalStorage
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(new Error('broken'))
            .mockRejectedValueOnce(new Error('unavailable'));

        await expect(getHarborReadingPosition(12)).resolves.toBeNull();
        await expect(getHarborReadingPosition(12)).resolves.toBeNull();
        await expect(getHarborReadingPosition(12)).resolves.toBeNull();
        await expect(getHarborReadingPosition(12)).resolves.toBeNull();
    });

    it('保存新最高樓層並保留其他 topic 的有效位置', async () => {
        getLocalStorage.mockResolvedValue({
            12: 8,
            13: 3,
            broken: 6,
            14: 0,
        });

        await expect(saveHarborReadingPosition(12, 10)).resolves.toBe(10);
        expect(setLocalStorage).toHaveBeenCalledWith(
            HARBOR_READING_STORAGE_KEY,
            {
                12: 10,
                13: 3,
            },
        );
    });

    it('不以相同或較小樓層覆蓋現有最高樓層', async () => {
        getLocalStorage
            .mockResolvedValueOnce({12: 10})
            .mockResolvedValueOnce({12: 10});

        await expect(saveHarborReadingPosition(12, 10)).resolves.toBe(10);
        await expect(saveHarborReadingPosition(12, 9)).resolves.toBe(10);
        expect(setLocalStorage).not.toHaveBeenCalled();
    });

    it('無效輸入不會讀寫 storage', async () => {
        await expect(saveHarborReadingPosition(0, 2)).resolves.toBeNull();
        await expect(saveHarborReadingPosition(12, 1.5)).resolves.toBeNull();
        await expect(getHarborReadingPosition('12')).resolves.toBeNull();

        expect(getLocalStorage).not.toHaveBeenCalled();
        expect(setLocalStorage).not.toHaveBeenCalled();
    });

    it('併發保存時仍維持單調遞增', async () => {
        let storedPositions = {};
        getLocalStorage.mockImplementation(async () => storedPositions);
        setLocalStorage.mockImplementation(async (_key, positions) => {
            storedPositions = positions;
            return 'ok';
        });

        await Promise.all([
            saveHarborReadingPosition(12, 20),
            saveHarborReadingPosition(12, 5),
            saveHarborReadingPosition(12, 15),
        ]);

        expect(storedPositions).toEqual({12: 20});
        expect(setLocalStorage).toHaveBeenCalledTimes(1);
    });

    it('storage 讀寫錯誤不會向外拋出', async () => {
        getLocalStorage
            .mockRejectedValueOnce(new Error('read failed'))
            .mockResolvedValueOnce({});
        setLocalStorage.mockRejectedValueOnce(new Error('write failed'));

        await expect(saveHarborReadingPosition(12, 3)).resolves.toBeNull();
        await expect(saveHarborReadingPosition(12, 3)).resolves.toBeNull();
    });
});
