import {
    GlassView,
    isGlassEffectAPIAvailable,
    isLiquidGlassAvailable,
} from 'expo-glass-effect';

const isLiquidGlassSupported =
    isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export { GlassView, isLiquidGlassSupported };
