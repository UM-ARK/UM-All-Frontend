import { APP_LINKING, parseArkAppLink } from '../appLinks';
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

    it('解析已註冊的 Universal Link 為 APP 路由', () => {
        expect(parseArkAppLink(
            'https://umall.one/app/course/COMP%201000',
        )).toEqual(expect.objectContaining({
            type: 'course',
            routeName: 'LocalCourse',
            params: {courseCode: 'COMP 1000'},
        }));
        expect(parseArkAppLink(
            'https://umall.one/app/club/12',
        )).toEqual(expect.objectContaining({
            type: 'club',
            routeName: 'ClubDetail',
            params: {clubNum: '12'},
        }));
        expect(parseArkAppLink(
            'https://umall.one/app/event/event%2Fid',
        )).toEqual(expect.objectContaining({
            type: 'event',
            routeName: 'EventDetail',
            params: {eventId: 'event/id'},
        }));
        expect(parseArkAppLink(
            'https://umall.one/app/harbor/topic/123/5',
        )).toEqual(expect.objectContaining({
            type: 'harborTopic',
            routeName: 'HarborTopicDetail',
            params: {topicId: 123, postNumber: 5},
        }));
        expect(parseArkAppLink(
            'one.umall://app/team/event%2F1?invite=token',
        )).toEqual(expect.objectContaining({
            type: 'team',
            routeName: 'TeamScheduleDetail',
            params: {eventId: 'event/1', invite: 'token'},
        }));
    });

    it('拒絕未註冊或非 ARK 的連結', () => {
        expect(parseArkAppLink('https://example.com/app/course/COMP1000'))
            .toBeNull();
        expect(parseArkAppLink('https://umall.one/app/unknown/1')).toBeNull();
        expect(parseArkAppLink('普通訊息')).toBeNull();
    });
});
