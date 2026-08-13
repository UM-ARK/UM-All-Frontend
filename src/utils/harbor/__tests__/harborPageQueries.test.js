jest.mock('../harborApi', () => ({
    fetchHarborBadges: jest.fn(),
    fetchHarborProfileMetadata: jest.fn(),
    fetchHarborUserActions: jest.fn(),
    fetchHarborUserCreatedTopics: jest.fn(),
    fetchHarborUserProfile: jest.fn(),
}));

import {
    getHarborActivityQueryKey,
    getHarborBadgesQueryKey,
    getHarborProfileQueryKey,
} from '../harborPageQueries';

describe('Harbor page query keys', () => {
    it('統一正規化用戶名並區分活動頁碼', () => {
        expect(getHarborProfileQueryKey(' Ark_User ')).toEqual([
            'profile',
            'ark_user',
        ]);
        expect(getHarborBadgesQueryKey(' Ark_User ')).toEqual([
            'badges',
            'ark_user',
        ]);
        expect(getHarborActivityQueryKey(' Ark_User ', 'likes', 30)).toEqual([
            'activity',
            'ark_user',
            'likes',
            30,
        ]);
    });
});
