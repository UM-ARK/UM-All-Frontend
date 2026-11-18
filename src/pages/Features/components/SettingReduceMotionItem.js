import React from 'react';
import { Switch } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../components/ThemeContext';
import { useReducedMotionPreference } from '../../../contexts/ReducedMotionContext';
import { trigger } from '../../../utils/trigger';
import { SettingItem } from './SettingPrimitives';

export default function SettingReduceMotionItem() {
    const { t } = useTranslation('setting');
    const { theme } = useTheme();
    const { preference, setReduceMotionPreference, saveFailed } = useReducedMotionPreference();
    const title = t('減少動態效果');
    const description = t('簡化粒子、縮放和轉場效果。關閉時跟隨系統設定。');

    return (
        <SettingItem
            grouped
            icon="sparkles-outline"
            iconColor={theme.themeColor}
            title={title}
            subtitle={saveFailed ? t('無法儲存設定，請再試一次。') : description}
            showArrow={false}
            rightElement={
                <Switch
                    accessibilityLabel={title}
                    accessibilityHint={description}
                    disabled={preference === null}
                    ios_backgroundColor={theme.disabled}
                    trackColor={{ false: theme.disabled, true: theme.themeColor }}
                    value={preference === true}
                    onValueChange={enabled => {
                        setReduceMotionPreference(enabled);
                        trigger(enabled ? 'toggleOn' : 'toggleOff');
                    }}
                />
            }
        />
    );
}
