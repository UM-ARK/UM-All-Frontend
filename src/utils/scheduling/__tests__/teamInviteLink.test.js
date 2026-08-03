import {
    TEAM_INVITE_SHARE_HINT_ZH,
    buildTeamInviteShareMessage,
    createTeamInviteClipboardParser,
    openTeamInviteDetail,
    parseTeamInviteLink,
} from '../teamInviteLink';

describe('parseTeamInviteLink', () => {
    it('解析 HTTPS 邀請連結', () => {
        expect(
            parseTeamInviteLink(
                'https://umall.one/app/team/evt-1?invite=tok-abc',
            ),
        ).toEqual({
            eventId: 'evt-1',
            invite: 'tok-abc',
            fingerprint: 'evt-1:tok-abc',
        });
    });

    it('解析 scheme 邀請連結', () => {
        expect(
            parseTeamInviteLink(
                'one.umall://app/team/evt-2?invite=secret',
            ),
        ).toEqual({
            eventId: 'evt-2',
            invite: 'secret',
            fingerprint: 'evt-2:secret',
        });
    });

    it('從分享訊息中抽出連結', () => {
        const message = buildTeamInviteShareMessage({
            title: '小組會議',
            url: 'https://umall.one/app/team/evt-3?invite=xyz',
        });
        expect(message).toContain(TEAM_INVITE_SHARE_HINT_ZH);
        expect(parseTeamInviteLink(message)).toEqual({
            eventId: 'evt-3',
            invite: 'xyz',
            fingerprint: 'evt-3:xyz',
        });
    });

    it('缺少 invite 時回傳 null', () => {
        expect(
            parseTeamInviteLink('https://umall.one/app/team/evt-4'),
        ).toBeNull();
    });

    it('無關文字回傳 null', () => {
        expect(parseTeamInviteLink('hello world')).toBeNull();
        expect(parseTeamInviteLink('')).toBeNull();
        expect(parseTeamInviteLink(null)).toBeNull();
    });

    it('解碼 eventId', () => {
        expect(
            parseTeamInviteLink(
                'https://umall.one/app/team/evt%2F1?invite=a',
            ),
        ).toEqual({
            eventId: 'evt/1',
            invite: 'a',
            fingerprint: 'evt/1:a',
        });
    });
});

describe('createTeamInviteClipboardParser', () => {
    it('輸出 scanner 可用的 fingerprint／payload', () => {
        const parser = createTeamInviteClipboardParser();
        expect(parser.id).toBe('team-invite');
        expect(
            parser.parse(
                '請打開 https://umall.one/app/team/e1?invite=t1 加入',
            ),
        ).toEqual({
            fingerprint: 'e1:t1',
            payload: {eventId: 'e1', invite: 't1'},
        });
    });
});

describe('buildTeamInviteShareMessage', () => {
    it('依序組裝提示、標題、連結', () => {
        expect(
            buildTeamInviteShareMessage({
                hint: 'HINT',
                title: 'TITLE',
                url: 'https://umall.one/app/team/x?invite=y',
            }),
        ).toBe(
            'HINT\nTITLE\nhttps://umall.one/app/team/x?invite=y',
        );
    });
});

describe('openTeamInviteDetail', () => {
    it('優先使用 push 避免複用詳情頁實例', () => {
        const push = jest.fn();
        const navigate = jest.fn();
        openTeamInviteDetail({push, navigate}, {
            eventId: 'e1',
            invite: 't1',
        });
        expect(push).toHaveBeenCalledWith('TeamScheduleDetail', {
            eventId: 'e1',
            invite: 't1',
        });
        expect(navigate).not.toHaveBeenCalled();
    });

    it('無 push 時降級 navigate', () => {
        const navigate = jest.fn();
        openTeamInviteDetail({navigate}, {eventId: 'e2', invite: 't2'});
        expect(navigate).toHaveBeenCalledWith('TeamScheduleDetail', {
            eventId: 'e2',
            invite: 't2',
        });
    });
});
