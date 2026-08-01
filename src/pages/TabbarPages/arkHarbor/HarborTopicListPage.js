import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../components/ThemeContext';
import { openHarborComposer } from '../../../utils/harbor/harborNavigation';
import { trigger } from '../../../utils/trigger';
import HarborTopicList from './components/HarborTopicList';

const HarborComposeButton = ({
    accessibilityLabel,
    onPress,
    themeColor,
}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
            trigger();
            onPress();
        }}
        style={styles.headerComposeButton}>
        <MaterialCommunityIcons
            name="plus"
            size={scale(22)}
            color={themeColor}
        />
    </Pressable>
);

const createHarborComposeButton = props => () => (
    <HarborComposeButton {...props} />
);

const HarborTopicListPage = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const categoryId = Number(route.params?.categoryId);
    const categorySlug = route.params?.categorySlug;
    const categoryName = route.params?.categoryName;
    const tag = route.params?.tag;
    const isTagPage = Boolean(tag);
    // 僅分類話題頁顯示發帖入口，並預選當前分類
    const canCompose =
        !isTagPage && Number.isFinite(categoryId) && categoryId > 0;
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

    const handleComposePress = useCallback(() => {
        openHarborComposer(navigation, {
            mode: 'newTopic',
            categoryId,
        });
    }, [categoryId, navigation]);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: isTagPage
                ? `#${typeof tag === 'string' ? tag : tag?.name || ''}`
                : categoryName || t('分類話題'),
            // iOS：原生 UIBarButtonItem，液態玻璃下才是標準圓形
            headerRight: canCompose
                ? Platform.OS === 'ios'
                    ? undefined
                    : createHarborComposeButton({
                          accessibilityLabel: t('發佈話題'),
                          onPress: handleComposePress,
                          themeColor: theme.themeColor,
                      })
                : undefined,
            unstable_headerRightItems:
                canCompose && Platform.OS === 'ios'
                    ? () => [
                          {
                              type: 'button',
                              label: t('發佈話題'),
                              accessibilityLabel: t('發佈話題'),
                              icon: {
                                  type: 'sfSymbol',
                                  name: 'plus',
                              },
                              tintColor: theme.themeColor,
                              onPress: () => {
                                  trigger();
                                  handleComposePress();
                              },
                          },
                      ]
                    : undefined,
        });
    }, [
        canCompose,
        categoryName,
        handleComposePress,
        isTagPage,
        navigation,
        t,
        tag,
        theme.themeColor,
    ]);

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
    headerComposeButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HarborTopicListPage;
