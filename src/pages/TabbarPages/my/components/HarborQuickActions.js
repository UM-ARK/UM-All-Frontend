import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {FlatGrid} from 'react-native-super-grid';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {trigger} from '../../../../utils/trigger';
import FeatureIcon from '../../info/home/search/components/FeatureIcon';

const QUICK_ACTIONS = [
    {
        key: 'messages',
        label: '消息',
        icon_type: 'ionicons',
        icon_name: 'mail-outline',
    },
    {
        key: 'bookmarks',
        label: '收藏',
        icon_type: 'ionicons',
        icon_name: 'bookmark-outline',
    },
    {
        key: 'likes',
        label: '贊過',
        icon_type: 'ionicons',
        icon_name: 'heart-outline',
    },
    {
        key: 'drafts',
        label: '草稿',
        icon_type: 'ionicons',
        icon_name: 'document-text-outline',
    },
];

const HarborQuickActions = ({unreadCount = 0, onSelect}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.white},
            ]}>
            <FlatGrid
                style={styles.grid}
                itemContainerStyle={styles.itemContainer}
                maxItemsPerRow={4}
                itemDimension={scale(50)}
                spacing={scale(8)}
                data={QUICK_ACTIONS}
                scrollEnabled={false}
                keyExtractor={item => item.key}
                renderItem={({item}) => (
                    <TouchableScale
                        accessibilityRole="button"
                        accessibilityLabel={t(item.label)}
                        style={styles.action}
                        onPress={() => {
                            trigger();
                            onSelect(item.key);
                        }}>
                        <View style={styles.iconWrap}>
                            <FeatureIcon item={item} size={scale(22)} />
                            {item.key === 'messages' && unreadCount > 0 ? (
                                <View
                                    style={[
                                        styles.badge,
                                        {backgroundColor: theme.unread},
                                    ]}>
                                    <Text
                                        style={[
                                            styles.badgeText,
                                            {color: theme.trueWhite},
                                        ]}>
                                        {unreadCount > 99
                                            ? '99+'
                                            : unreadCount}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.label,
                                {color: theme.black.second},
                            ]}>
                            {t(item.label)}
                        </Text>
                    </TouchableScale>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: scale(10),
        paddingTop: verticalScale(10),
        paddingBottom: verticalScale(6),
    },
    grid: {
        marginBottom: verticalScale(-8),
    },
    itemContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    action: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrap: {
        position: 'relative',
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        marginTop: verticalScale(6),
    },
    badge: {
        position: 'absolute',
        top: scale(-3),
        right: scale(-5),
        minWidth: scale(15),
        height: scale(15),
        borderRadius: scale(8),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(3),
    },
    badgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(8),
        fontWeight: '800',
    },
});

export default HarborQuickActions;
