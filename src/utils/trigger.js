import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export function trigger(method) {
    ReactNativeHapticFeedback.trigger(
        method ? method : 'soft',
        {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: true,
        }
    )
}