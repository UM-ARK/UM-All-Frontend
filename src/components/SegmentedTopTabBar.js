import React from 'react';
import { StyleSheet, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';

import SegmentedTabControl, { SEGMENTED_TAB_CONTROL_HEIGHT } from './SegmentedTabControl';
import { trigger } from '../utils/trigger';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../utils/windowSizeClass';

const TAB_BAR_PADDING_TOP = verticalScale(4);
const TAB_BAR_PADDING_BOTTOM = verticalScale(2);

export const SEGMENTED_TOP_TAB_BAR_HEIGHT =
    SEGMENTED_TAB_CONTROL_HEIGHT + TAB_BAR_PADDING_TOP + TAB_BAR_PADDING_BOTTOM;

export default function SegmentedTopTabBar({ state, descriptors, navigation, position, backgroundColor }) {
    const handleSelectIndex = index => {
        const route = state.routes[index];
        if (!route) {
            return;
        }
        const isFocused = state.index === index;
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
            trigger('selection');
            navigation.navigate(route.name, route.params);
        } else if (isFocused) {
            trigger();
        }
    };

    const options = state.routes.map(route => {
        const { title, tabBarBadge } = descriptors[route.key].options;
        return {
            key: route.key,
            label: title ?? route.name,
            badge: tabBarBadge?.(),
        };
    });

    return (
        <View
            pointerEvents="box-none"
            style={[styles.topTabBarContainer, { backgroundColor }]}>
            <SegmentedTabControl
                options={options}
                selectedIndex={state.index}
                position={position}
                onChange={handleSelectIndex}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    topTabBarContainer: {
        width: '100%',
        maxWidth: TOP_TAB_STRIP_MAX_WIDTH,
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingTop: TAB_BAR_PADDING_TOP,
        paddingBottom: TAB_BAR_PADDING_BOTTOM,
    },
});
