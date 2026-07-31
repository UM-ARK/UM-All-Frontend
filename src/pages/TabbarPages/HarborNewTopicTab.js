import React, {useCallback, useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useTheme} from '../../components/ThemeContext';
import {trigger} from '../../utils/trigger';
import {logToFirebase} from '../../utils/firebaseAnalytics';

export const HARBOR_NEW_TOPIC_TAB = 'HarborNewTopic';

let lastNonHarborPostTabRouteName = 'NewsTabbar';

/**
 * 記錄上一個「真分頁」（排除發帖捷徑），供 iOS 原生 Tab 無法 tabPress preventDefault 時導回。
 */
export function trackLastNonHarborPostTab(routeName) {
    if (routeName !== HARBOR_NEW_TOPIC_TAB) {
        lastNonHarborPostTabRouteName = routeName;
    }
}

/**
 * 底部 Tab「發帖」：開啟原生 Harbor Composer（與主頁「新想法」一致）。
 * - Android：Tabbar 對此 route 使用 tabPress + preventDefault，此畫面通常不會被聚焦。
 * - iOS 原生 Tab：無法阻擋切換，聚焦後立刻開 Composer 並跳回上一分頁（可能一幀空白）。
 */
export default function HarborNewTopicTab() {
    const navigation = useNavigation();
    const {theme} = useTheme();
    const fillStyle = useMemo(
        () => [styles.fill, {backgroundColor: theme.bg_color}],
        [theme.bg_color],
    );

    useFocusEffect(
        useCallback(() => {
            trigger();
            logToFirebase('funcUse', {funcName: 'harbor_new'});
            const target = lastNonHarborPostTabRouteName;
            requestAnimationFrame(() => {
                navigation.navigate(target);
                navigation.getParent()?.navigate('HarborComposer', {
                    mode: 'newTopic',
                });
            });
        }, [navigation]),
    );

    return <View style={fillStyle} />;
}

const styles = StyleSheet.create({
    fill: {
        flex: 1,
    },
});
