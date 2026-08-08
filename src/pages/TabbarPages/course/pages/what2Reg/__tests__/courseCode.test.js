import { splitCourseCode } from '../utils/courseCode';

describe('課程代號顯示分段', () => {
    it('支援三個字母的系別碼', () => {
        expect(splitCourseCode('TLL3006C')).toEqual({
            prefix: 'TLL',
            suffix: '3006C',
        });
    });

    it('支援四個字母的系別碼', () => {
        expect(splitCourseCode('ACCT1000')).toEqual({
            prefix: 'ACCT',
            suffix: '1000',
        });
    });

    it('保留課程編號後綴', () => {
        expect(splitCourseCode('TLL123-A')).toEqual({
            prefix: 'TLL',
            suffix: '123-A',
        });
    });

    it('無法辨識時保留原始代號', () => {
        expect(splitCourseCode('1234')).toEqual({
            prefix: '',
            suffix: '1234',
        });
    });
});
