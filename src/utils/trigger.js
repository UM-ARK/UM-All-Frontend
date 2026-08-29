import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const impact = style => Haptics.impactAsync(style);
const notification = type => Haptics.notificationAsync(type);

async function androidFeedback(type, fallback) {
    try {
        await Haptics.performAndroidHapticsAsync(type);
    } catch {
        await fallback();
    }
}

const feedback = {
    tap: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Virtual_Key, () => impact(Haptics.ImpactFeedbackStyle.Soft))
        : impact(Haptics.ImpactFeedbackStyle.Soft),
    soft: () => impact(Haptics.ImpactFeedbackStyle.Soft),
    rigid: () => impact(Haptics.ImpactFeedbackStyle.Rigid),
    selection: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Segment_Tick, Haptics.selectionAsync)
        : Haptics.selectionAsync(),
    tick: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Segment_Frequent_Tick, Haptics.selectionAsync)
        : Haptics.selectionAsync(),
    context: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Context_Click, () => impact(Haptics.ImpactFeedbackStyle.Rigid))
        : impact(Haptics.ImpactFeedbackStyle.Rigid),
    longPress: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Long_Press, () => impact(Haptics.ImpactFeedbackStyle.Rigid))
        : impact(Haptics.ImpactFeedbackStyle.Rigid),
    dragStart: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Drag_Start, () => impact(Haptics.ImpactFeedbackStyle.Medium))
        : impact(Haptics.ImpactFeedbackStyle.Medium),
    gestureStart: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Gesture_Start, () => impact(Haptics.ImpactFeedbackStyle.Light))
        : impact(Haptics.ImpactFeedbackStyle.Light),
    gestureEnd: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Gesture_End, () => impact(Haptics.ImpactFeedbackStyle.Soft))
        : impact(Haptics.ImpactFeedbackStyle.Soft),
    toggleOn: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Toggle_On, Haptics.selectionAsync)
        : Haptics.selectionAsync(),
    toggleOff: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Toggle_Off, Haptics.selectionAsync)
        : Haptics.selectionAsync(),
    success: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Confirm, () => notification(Haptics.NotificationFeedbackType.Success))
        : notification(Haptics.NotificationFeedbackType.Success),
    warning: () => notification(Haptics.NotificationFeedbackType.Warning),
    error: () => Platform.OS === 'android'
        ? androidFeedback(Haptics.AndroidHaptics.Reject, () => notification(Haptics.NotificationFeedbackType.Error))
        : notification(Haptics.NotificationFeedbackType.Error),
};

export function trigger(method = 'tap') {
    const play = feedback[method] || feedback.tap;
    try {
        return Promise.resolve(play()).catch(() => {});
    } catch {
        return Promise.resolve();
    }
}
