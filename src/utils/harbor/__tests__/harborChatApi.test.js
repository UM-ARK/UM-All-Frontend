import {
    createHarborDirectMessageChannel,
    fetchHarborChatChannels,
    fetchHarborChatMessages,
    fetchHarborDirectMessagePreference,
    harborApi,
    markHarborChatChannelRead,
    sendHarborChatMessage,
    updateHarborDirectMessagePreference,
} from '../harborApi';

jest.mock('../../pathMap', () => ({
    ARK_HARBOR: 'https://harbor.example.com',
    ARK_HARBOR_ABSOLUTE_URL: url =>
        url.startsWith('http') ? url : `https://harbor.example.com${url}`,
    ARK_HARBOR_AVATAR_TEMPLATE: template => template,
    ARK_HARBOR_UPLOAD_URL: url => url,
}));

describe('Harbor Chat API', () => {
    let getSpy;
    let postSpy;
    let putSpy;

    beforeEach(() => {
        getSpy = jest.spyOn(harborApi, 'get');
        postSpy = jest.spyOn(harborApi, 'post');
        putSpy = jest.spyOn(harborApi, 'put');
    });

    afterEach(() => {
        getSpy.mockRestore();
        postSpy.mockRestore();
        putSpy.mockRestore();
    });

    it('只從我的 Channel 回應取得私聊頻道', async () => {
        getSpy.mockResolvedValue({
            data: {
                public_channels: [{id: 1, title: '公開'}],
                direct_message_channels: [
                    {
                        id: 2,
                        chatable_type: 'DirectMessage',
                        title: 'Reader',
                        chatable: {group: false, users: []},
                        last_message: {id: null},
                    },
                ],
            },
        });

        await expect(fetchHarborChatChannels()).resolves.toEqual({
            items: [expect.objectContaining({id: 2, title: 'Reader'})],
            unreadCount: 0,
        });
        expect(getSpy).toHaveBeenCalledWith('/chat/api/me/channels', {
            signal: undefined,
        });
    });

    it('建立或取得一對一私聊頻道', async () => {
        postSpy.mockResolvedValue({
            data: {
                channel: {
                    id: 12,
                    chatable_type: 'DirectMessage',
                    title: 'Reader',
                    chatable: {group: false, users: []},
                },
            },
        });

        await expect(
            createHarborDirectMessageChannel(' reader '),
        ).resolves.toEqual(expect.objectContaining({id: 12}));
        expect(postSpy).toHaveBeenCalledWith(
            '/chat/api/direct-message-channels',
            {target_usernames: ['reader'], upsert: true},
            {signal: undefined},
        );
    });

    it('讀取並更新是否允許私人訊息', async () => {
        getSpy.mockResolvedValue({
            data: {
                user: {
                    user_option: {allow_private_messages: true},
                },
            },
        });
        putSpy.mockResolvedValue({data: {success: true}});

        await expect(
            fetchHarborDirectMessagePreference(' ark user '),
        ).resolves.toBe(true);
        await updateHarborDirectMessagePreference(' ark user ', false);

        expect(getSpy).toHaveBeenCalledWith('/u/ark%20user.json', {
            signal: undefined,
        });
        expect(putSpy).toHaveBeenCalledWith(
            '/u/ark%20user.json',
            {allow_private_messages: false},
            {signal: undefined},
        );
    });

    it('拒絕無效的私人訊息偏好', async () => {
        getSpy.mockResolvedValue({data: {user: {user_option: {}}}});

        await expect(
            fetchHarborDirectMessagePreference('reader'),
        ).rejects.toThrow('Invalid Harbor direct message preference response');
        await expect(
            updateHarborDirectMessagePreference('reader', 'yes'),
        ).rejects.toThrow(TypeError);
    });

    it('取得較早訊息、發送並標記已讀', async () => {
        getSpy.mockResolvedValue({
            data: {messages: [], meta: {can_load_more_past: false}},
        });
        postSpy.mockResolvedValue({data: {message_id: 31}});
        putSpy.mockResolvedValue({data: {success: 'OK'}});

        await fetchHarborChatMessages(12, {
            direction: 'past',
            pageSize: 40,
            targetMessageId: 20,
        });
        await expect(sendHarborChatMessage(12, ' 你好 ')).resolves.toBe(31);
        await markHarborChatChannelRead(12, 31);

        expect(getSpy).toHaveBeenCalledWith(
            '/chat/api/channels/12/messages',
            {
                params: {
                    page_size: 40,
                    direction: 'past',
                    target_message_id: 20,
                },
                signal: undefined,
            },
        );
        expect(postSpy).toHaveBeenCalledWith('/chat/12', {
            chat_channel_id: 12,
            message: '你好',
        });
        expect(putSpy).toHaveBeenCalledWith('/chat/api/channels/12/read', {
            message_id: 31,
        });
    });

    it('拒絕空白私聊目標及空白訊息', async () => {
        await expect(createHarborDirectMessageChannel(' ')).rejects.toThrow(
            TypeError,
        );
        await expect(sendHarborChatMessage(12, ' ')).rejects.toThrow(TypeError);
        expect(postSpy).not.toHaveBeenCalled();
    });
});
