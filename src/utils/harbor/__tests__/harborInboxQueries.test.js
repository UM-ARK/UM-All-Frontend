import {
    fetchHarborInboxFirstPage,
    getHarborInboxQueryKey,
    patchHarborInboxMessageRead,
    patchHarborInboxNotificationRead,
    patchHarborInboxNotificationsReadAll,
    readHarborInboxFirstPage,
} from '../harborInboxQueries';
import {
    resetHarborQueryCache,
    writeHarborQueryCache,
} from '../harborQueryCache';

const writeInboxPage = (filter, overrides = {}) => {
    writeHarborQueryCache(
        getHarborInboxQueryKey('Ark-User', filter),
        {
            items: [
                {id: '7', inboxType: 'notification', isRead: false},
                {id: '9', inboxType: 'message', unreadCount: 2},
            ],
            hasMore: true,
            nextOffset: 30,
            unreadNotificationCount: 3,
            partialError: false,
            ...overrides,
        },
        {namespace: 'inbox'},
    );
};

describe('Harbor Inbox query cache', () => {
    beforeEach(() => {
        resetHarborQueryCache();
    });

    it('以帳戶及通知 filter 隔離首屏並共用 fresh request', async () => {
        const fetcher = jest.fn().mockResolvedValue({items: []});

        const first = fetchHarborInboxFirstPage(
            'Ark-User',
            undefined,
            fetcher,
        );
        await first.request;
        const second = fetchHarborInboxFirstPage(
            'ark-user',
            undefined,
            fetcher,
        );

        await expect(second.request).resolves.toEqual({items: []});
        expect(second.cachedResult).toEqual({items: []});
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(
            readHarborInboxFirstPage('another-user', undefined),
        ).toBeUndefined();
    });

    it('單筆已讀同步 patch 全部及未讀 filter 並保留 message', () => {
        writeInboxPage(undefined);
        writeInboxPage('unread');

        patchHarborInboxNotificationRead('ark-user', '7');

        expect(readHarborInboxFirstPage('ark-user').items[0]).toEqual(
            expect.objectContaining({id: '7', isRead: true}),
        );
        expect(
            readHarborInboxFirstPage('ark-user', 'unread').items,
        ).toEqual([{id: '9', inboxType: 'message', unreadCount: 2}]);
        expect(
            readHarborInboxFirstPage('ark-user').unreadNotificationCount,
        ).toBe(2);
    });

    it('全部已讀清除未讀 filter 通知且 message 已讀可獨立 patch', () => {
        writeInboxPage(undefined);
        writeInboxPage('unread');

        patchHarborInboxNotificationsReadAll('ark-user');
        patchHarborInboxMessageRead('ark-user', '9');

        const allPage = readHarborInboxFirstPage('ark-user');
        const unreadPage = readHarborInboxFirstPage('ark-user', 'unread');
        expect(allPage.items).toEqual([
            {id: '7', inboxType: 'notification', isRead: true},
            {id: '9', inboxType: 'message', unreadCount: 0},
        ]);
        expect(unreadPage.items).toEqual([]);
        expect(unreadPage).toEqual(
            expect.objectContaining({
                hasMore: false,
                nextOffset: null,
                unreadNotificationCount: 0,
            }),
        );
    });
});
