import { APP_LINKING } from '../appLinks';
import {
    ARK_CLUB_SHARE_URL,
    ARK_COURSE_SHARE_URL,
    ARK_EVENT_SHARE_URL,
    ARK_HARBOR_TOPIC_SHARE_URL,
} from '../pathMap';

jest.mock('expo/virtual/env', () => ({env: {}}));

describe('ARK ALL 深度連結', () => {
    it('設定四種內容路由並保留 Tabbar 返回頁', () => {
        expect(APP_LINKING.config).toEqual(
            expect.objectContaining({
                initialRouteName: 'Tabbar',
                screens: expect.objectContaining({
                    Tabbar: '',
                    LocalCourse: 'course/:courseCode',
                    ClubDetail: 'club/:clubNum',
                    EventDetail: 'event/:eventId',
                    HarborTopicDetail: expect.objectContaining({
                        path: 'harbor/topic/:topicId/:postNumber?',
                    }),
                }),
            }),
        );
    });

    it('建立可分享的 HTTPS 連結', () => {
        expect(ARK_COURSE_SHARE_URL('COMP 1000')).toBe(
            'https://umall.one/app/course/COMP%201000',
        );
        expect(ARK_CLUB_SHARE_URL(12)).toBe(
            'https://umall.one/app/club/12',
        );
        expect(ARK_EVENT_SHARE_URL('event/id')).toBe(
            'https://umall.one/app/event/event%2Fid',
        );
        expect(ARK_HARBOR_TOPIC_SHARE_URL(123, 5)).toBe(
            'https://umall.one/app/harbor/topic/123/5',
        );
    });
});
