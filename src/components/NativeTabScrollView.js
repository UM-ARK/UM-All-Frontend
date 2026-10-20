import React, { createContext, forwardRef, useContext } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Screen, ScreenContainer } from 'react-native-screens';
import { ScrollViewMarker } from 'react-native-screens/experimental';

import { isLiquidGlassSupported } from '../utils/glassEffect';

export const NativeTabScrollActiveContext = createContext(true);

const NativeTabScrollView = forwardRef(function NativeTabScrollView(props, ref) {
    const isFocused = useIsFocused();
    const isActive = useContext(NativeTabScrollActiveContext);
    const scrollView = <ScrollView {...props} ref={ref} />;

    if (Platform.OS !== 'ios' || !isLiquidGlassSupported) {
        return scrollView;
    }

    // 只讓目前分頁的列表掛在原生視圖樹；切回時重新登記，保留 React 狀態與捲動位置。
    return (
        <ScreenContainer enabled style={styles.container}>
            <Screen
                enabled
                activityState={isFocused && isActive ? 2 : 0}
                freezeOnBlur={false}
                style={StyleSheet.absoluteFill}>
                <ScrollViewMarker style={styles.container}>
                    {scrollView}
                </ScrollViewMarker>
            </Screen>
        </ScreenContainer>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
});

export default NativeTabScrollView;
