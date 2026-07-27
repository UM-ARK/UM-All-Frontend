jest.mock('../../../../../utils/harbor/harborApi', () => ({
    HARBOR_TOPIC_NOTIFICATION_LEVELS: {},
}));
jest.mock('../../../../../utils/pathMap', () => ({
    ARK_HARBOR_ABSOLUTE_URL: value => value,
}));

import {
    canUpdatePostReaction,
} from '../harborTopicModels';

describe('canUpdatePostReaction', () => {
    it('允許對可讚好的帖子新增回應', () => {
        expect(
            canUpdatePostReaction({
                actions_summary: [{ id: 2, can_act: true }],
            }),
        ).toBe(true);
    });

    it('拒絕對不可讚好或缺少權限資料的帖子新增回應', () => {
        expect(
            canUpdatePostReaction({
                actions_summary: [{ id: 2, can_act: false }],
            }),
        ).toBe(false);
        expect(canUpdatePostReaction({})).toBe(false);
    });

    it('依現有回應的 can_undo 決定能否切換或取消', () => {
        expect(
            canUpdatePostReaction({
                current_user_reaction: {
                    id: 'heart',
                    can_undo: true,
                },
            }),
        ).toBe(true);
        expect(
            canUpdatePostReaction({
                current_user_reaction: {
                    id: 'heart',
                    can_undo: false,
                },
            }),
        ).toBe(false);
    });
});
