import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import { verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../components/ThemeContext';
import HarborTopicList from './components/HarborTopicList';

const HarborTopicListPage = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const categoryId = Number(route.params?.categoryId);
    const categorySlug = route.params?.categorySlug;
    const categoryName = route.params?.categoryName;
    const tag = route.params?.tag;
    const isTagPage = Boolean(tag);
    const blockTopicPressUntilRef = useRef(0);

    const source = useMemo(
        () =>
            isTagPage
                ? { view: 'latest', tag }
                : {
                    view: 'latest',
                    categoryId,
                    categorySlug,
                },
        [categoryId, categorySlug, isTagPage, tag],
    );

    useEffect(() => {
        navigation.setOptions({
            headerTitle: isTagPage
                ? `#${typeof tag === 'string' ? tag : tag?.name || ''}`
                : categoryName || t('分類話題'),
        });
    }, [categoryName, isTagPage, navigation, t, tag]);

    useEffect(() => {
        const blockTopicPress = () => {
            blockTopicPressUntilRef.current = Number.POSITIVE_INFINITY;
        };
        const releaseTopicPress = () => {
            blockTopicPressUntilRef.current = Date.now() + 180;
        };
        const unsubscribeGestureStart = navigation.addListener(
            'gestureStart',
            blockTopicPress,
        );
        const unsubscribeGestureEnd = navigation.addListener(
            'gestureEnd',
            releaseTopicPress,
        );
        const unsubscribeGestureCancel = navigation.addListener(
            'gestureCancel',
            releaseTopicPress,
        );

        return () => {
            unsubscribeGestureStart();
            unsubscribeGestureEnd();
            unsubscribeGestureCancel();
        };
    }, [navigation]);

    const isTopicPressAllowed = useCallback(
        () => Date.now() >= blockTopicPressUntilRef.current,
        [],
    );

    const contentStyle = useMemo(
        () => ({
            paddingTop: isLiquidGlassSupported
                ? headerHeight + verticalScale(10)
                : verticalScale(10),
        }),
        [headerHeight],
    );

    return (
        <View style={[styles.page, { backgroundColor: theme.bg_color }]}>
            <HarborTopicList
                source={source}
                navigation={navigation}
                isTopicPressAllowed={isTopicPressAllowed}
                contentContainerStyle={contentStyle}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? { top: headerHeight } : undefined
                }
                refreshProgressViewOffset={
                    isLiquidGlassSupported ? headerHeight + verticalScale(8) : 0
                }
                emptyTitle={
                    isTagPage
                        ? t('這個標籤暫時沒有話題')
                        : t('這個分類暫時沒有話題')
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
});

export default HarborTopicListPage;
