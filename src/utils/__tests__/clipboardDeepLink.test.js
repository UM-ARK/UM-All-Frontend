import {createClipboardDeepLinkScanner} from '../clipboardDeepLink';

describe('createClipboardDeepLinkScanner', () => {
    it('依序解析並只觸發一次 onMatch', async () => {
        const onMatch = jest.fn();
        const scanner = createClipboardDeepLinkScanner({
            getClipboardText: async () =>
                'https://umall.one/app/team/e1?invite=t1',
            parsers: [
                {
                    id: 'noop',
                    parse: () => null,
                },
                {
                    id: 'team',
                    parse: text => {
                        if (!text.includes('team/')) {
                            return null;
                        }
                        return {
                            fingerprint: 'e1:t1',
                            payload: {eventId: 'e1'},
                        };
                    },
                },
            ],
            onMatch,
        });

        const first = await scanner.scan();
        expect(first).toEqual({
            parserId: 'team',
            fingerprint: 'e1:t1',
            payload: {eventId: 'e1'},
        });
        expect(onMatch).toHaveBeenCalledTimes(1);

        const second = await scanner.scan();
        expect(second).toBeNull();
        expect(onMatch).toHaveBeenCalledTimes(1);
    });

    it('shouldScan 為 false 時略過', async () => {
        const onMatch = jest.fn();
        const scanner = createClipboardDeepLinkScanner({
            getClipboardText: async () => 'abc',
            shouldScan: () => false,
            parsers: [
                {
                    id: 'any',
                    parse: () => ({fingerprint: 'x', payload: {}}),
                },
            ],
            onMatch,
        });
        await expect(scanner.scan()).resolves.toBeNull();
        expect(onMatch).not.toHaveBeenCalled();
    });

    it('parser 例外時繼續下一個', async () => {
        const onMatch = jest.fn();
        const scanner = createClipboardDeepLinkScanner({
            getClipboardText: async () => 'ok',
            parsers: [
                {
                    id: 'boom',
                    parse: () => {
                        throw new Error('boom');
                    },
                },
                {
                    id: 'ok',
                    parse: () => ({fingerprint: 'f', payload: 1}),
                },
            ],
            onMatch,
        });
        await scanner.scan();
        expect(onMatch).toHaveBeenCalledWith({
            parserId: 'ok',
            fingerprint: 'f',
            payload: 1,
        });
    });
});
