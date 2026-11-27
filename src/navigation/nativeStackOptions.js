import { isLiquidGlassSupported } from '../utils/glassEffect';

/**
 * 全站共用的 Native Stack 預設選項：
 * 集中管理 iOS 26+ 液態玻璃透明導覽列、scrollEdgeEffects 頂部漸進柔化與深淺色狀態列。
 */
export const getNativeStackScreenOptions = ({
    theme,
    reducedMotion,
    headerTitle,
}) => ({
    freezeOnBlur: true,
    animation: reducedMotion ? 'fade' : undefined,
    headerTransparent: isLiquidGlassSupported,
    headerBlurEffect: isLiquidGlassSupported ? null : 'systemThinMaterial',
    scrollEdgeEffects: isLiquidGlassSupported ? { top: 'soft' } : undefined,
    headerStyle: {
        backgroundColor: isLiquidGlassSupported
            ? 'transparent'
            : theme.bg_color,
        elevation: 0,
    },
    contentStyle: { backgroundColor: theme.bg_color },
    ...(headerTitle !== undefined ? { headerTitle } : {}),
    headerTitleAlign: 'center',
    headerBackButtonDisplayMode: 'minimal',
    headerBackButtonMenuEnabled: false,
    gestureEnabled: true,
    headerTintColor: theme.black.main,
    // 與 ThemeContext 一致（自訂淺/深色時勿跟隨系統預設 auto）
    statusBarStyle: theme.isLight ? 'dark' : 'light',
});
