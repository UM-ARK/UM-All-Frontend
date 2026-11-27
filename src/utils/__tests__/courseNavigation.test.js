import { Platform } from 'react-native';

import {
    COURSE_HOME_ROUTE,
    COURSE_SEARCH_SEGMENT,
    COURSE_TAB_ROUTE,
    COURSE_TIMETABLE_SEGMENT,
    navigateToCourseTab,
} from '../courseNavigation';

describe('navigateToCourseTab', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
        Platform.OS = originalOS;
    });

    it('iOS 經由 CourseHome 嵌套跳轉至指定選課段落並透傳參數', () => {
        Platform.OS = 'ios';
        const navigate = jest.fn();

        navigateToCourseTab(
            { navigate },
            { segment: 'timetable', courseCode: 'CISC1000', add: { id: 1 } },
        );

        expect(navigate).toHaveBeenCalledWith('Tabbar', {
            screen: COURSE_TAB_ROUTE,
            params: {
                screen: COURSE_HOME_ROUTE,
                params: {
                    screen: COURSE_TIMETABLE_SEGMENT,
                    params: {
                        check: 'CISC1000',
                        add: { id: 1 },
                    },
                },
            },
        });
    });

    it('Android 與 Web 維持直接跳轉至選課段落', () => {
        Platform.OS = 'android';
        const navigate = jest.fn();

        navigateToCourseTab({ navigate }, { segment: 'search' });

        expect(navigate).toHaveBeenCalledWith('Tabbar', {
            screen: COURSE_TAB_ROUTE,
            params: {
                screen: COURSE_SEARCH_SEGMENT,
                params: {},
            },
        });
    });
});
