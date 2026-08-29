import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { trigger } from '../trigger';

jest.mock('expo-haptics', () => ({
    AndroidHaptics: {
        Confirm: 'confirm',
        Context_Click: 'context-click',
        Drag_Start: 'drag-start',
        Gesture_End: 'gesture-end',
        Gesture_Start: 'gesture-start',
        Long_Press: 'long-press',
        Reject: 'reject',
        Segment_Frequent_Tick: 'segment-frequent-tick',
        Segment_Tick: 'segment-tick',
        Toggle_Off: 'toggle-off',
        Toggle_On: 'toggle-on',
        Virtual_Key: 'virtual-key',
    },
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Rigid: 'rigid',
        Soft: 'soft',
    },
    NotificationFeedbackType: {
        Error: 'error',
        Success: 'success',
        Warning: 'warning',
    },
    impactAsync: jest.fn(() => Promise.resolve()),
    notificationAsync: jest.fn(() => Promise.resolve()),
    performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
    selectionAsync: jest.fn(() => Promise.resolve()),
}));

const originalOS = Platform.OS;

afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
});

it('預設輕點沿用 Soft，未知名稱安全回退', async () => {
    Platform.OS = 'ios';

    await trigger();
    await trigger('unknown');

    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(1, 'soft');
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(2, 'soft');
});

it('iOS 使用 Selection、Impact 與 Notification 語意', async () => {
    Platform.OS = 'ios';

    await trigger('selection');
    await trigger('context');
    await trigger('success');
    await trigger('warning');
    await trigger('error');

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('rigid');
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(1, 'success');
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(2, 'warning');
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(3, 'error');
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
});

it('Android 優先使用系統語意震感', async () => {
    Platform.OS = 'android';

    await trigger();
    await trigger('selection');
    await trigger('tick');
    await trigger('toggleOn');
    await trigger('toggleOff');
    await trigger('longPress');
    await trigger('dragStart');
    await trigger('success');
    await trigger('error');

    expect(Haptics.performAndroidHapticsAsync.mock.calls.map(([type]) => type)).toEqual([
        'virtual-key',
        'segment-tick',
        'segment-frequent-tick',
        'toggle-on',
        'toggle-off',
        'long-press',
        'drag-start',
        'confirm',
        'reject',
    ]);
});

it('Android 不支援新震感時使用跨平台 fallback', async () => {
    Platform.OS = 'android';
    Haptics.performAndroidHapticsAsync.mockRejectedValueOnce(new Error('unsupported'));

    await trigger('success');

    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
});

it('原生震感不可用時不影響互動流程', async () => {
    Platform.OS = 'ios';
    Haptics.impactAsync.mockRejectedValueOnce(new Error('unavailable'));

    await expect(trigger()).resolves.toBeUndefined();
});
