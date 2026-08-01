import {
    ARK_HARBOR_UPLOAD_URL,
} from '../pathMap';

jest.mock('expo/virtual/env', () => ({env: {}}));

describe('Harbor upload URL', () => {
    it('將 R2 origin 改寫成公開 asset host', () => {
        expect(
            ARK_HARBOR_UPLOAD_URL(
                '//harbor.example.r2.cloudflarestorage.com/original/1X/avatar.jpeg',
            ),
        ).toBe(
            'https://assert.umall.one/original/1X/avatar.jpeg',
        );
    });

    it('保留一般 Harbor upload 路徑', () => {
        expect(
            ARK_HARBOR_UPLOAD_URL('/uploads/default/avatar.png'),
        ).toBe('https://harbor.umall.one/uploads/default/avatar.png');
    });
});
