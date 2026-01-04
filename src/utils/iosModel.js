// 最後更新：2026-01-04
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const IPHONE_MODEL_MAP = {
    // === iPhone 17 Series (2025) ===
    'iPhone18,1': 'iPhone 17 Pro',
    'iPhone18,2': 'iPhone 17 Pro Max',
    'iPhone18,3': 'iPhone 17',
    'iPhone18,4': 'iPhone 17 Air',

    // === iPhone 16 Series (2024) ===
    // 全系使用 A18 芯片，故代號均為 17,x
    'iPhone17,1': 'iPhone 16 Pro',
    'iPhone17,2': 'iPhone 16 Pro Max',
    'iPhone17,3': 'iPhone 16',
    'iPhone17,4': 'iPhone 16 Plus',
    'iPhone17,5': 'iPhone 16e',
};

export const getPreciseDeviceName = () => {
    const modelId = Device.modelId;

    if (Platform.OS === 'ios' && modelId) {
        // 1. 嘗試精確匹配
        if (IPHONE_MODEL_MAP[modelId]) {
            return IPHONE_MODEL_MAP[modelId];
        }

        // 2. 針對未來機型的回退處理 (Fallback)
        // 如果出現 iPhone17,9 或 iPhone18,5 等未知型號
        if (modelId.startsWith('iPhone17,'))
            return `iPhone 16 Series (${modelId})`;
        if (modelId.startsWith('iPhone18,'))
            return `iPhone 17 Series (${modelId})`;
        if (modelId.startsWith('iPhone19,'))
            return `iPhone 18 Series (${modelId})`;

        // 3. 模擬器處理
        if (modelId === 'x86_64' || modelId === 'arm64') return 'iOS Simulator';
    }

    return Device.modelName || modelId || 'Unknown Device';
};
