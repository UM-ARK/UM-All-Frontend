jest.mock('@react-native-firebase/analytics', () => ({
    getAnalytics: jest.fn(),
    logEvent: jest.fn(),
}));

import {getAnalytics, logEvent} from '@react-native-firebase/analytics';

import {logToFirebase} from '../firebaseAnalytics';

describe('Firebase Analytics 封裝', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getAnalytics.mockReturnValue({});
        logEvent.mockReturnValue(undefined);
    });

    it('傳送事件名稱與分析參數', async () => {
        const analytics = {};
        getAnalytics.mockReturnValue(analytics);

        await logToFirebase('team_schedule_create', {
            has_deadline: 1,
        });

        expect(logEvent).toHaveBeenCalledWith(
            analytics,
            'team_schedule_create',
            {has_deadline: 1},
        );
    });

    it('清理 checkCourse 的教授名稱首尾空白', async () => {
        const analytics = {};
        getAnalytics.mockReturnValue(analytics);

        await logToFirebase('checkCourse', {
            courseCode: 'TEST1000',
            profName: '  TEST PROFESSOR  ',
        });

        expect(logEvent).toHaveBeenCalledWith(
            analytics,
            'checkCourse',
            {
                courseCode: 'TEST1000',
                profName: 'TEST PROFESSOR',
            },
        );
    });

    it.each(['   ', '', null])(
        'checkCourse 的教授名稱無效時不傳送 profName: %p',
        async profName => {
            const analytics = {};
            getAnalytics.mockReturnValue(analytics);

            await logToFirebase('checkCourse', {
                courseCode: 'TEST1000',
                profName,
            });

            expect(logEvent).toHaveBeenCalledWith(
                analytics,
                'checkCourse',
                {courseCode: 'TEST1000'},
            );
        },
    );

    it('Firebase 失敗時不影響主要操作', async () => {
        logEvent.mockImplementation(() => {
            throw new Error('analytics unavailable');
        });

        await expect(
            logToFirebase('team_schedule_create', {}),
        ).resolves.toBeUndefined();
    });
});
