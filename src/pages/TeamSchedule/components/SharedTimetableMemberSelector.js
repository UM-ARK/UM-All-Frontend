import React, {memo} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';

function memberName(member, t) {
    return member?.username || t('成員');
}

const SharedTimetableMemberSelector = ({
    quickMembers,
    selectedId,
    onSelectAll,
    onSelectMember,
    onOpenSearch,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    return (
        <View style={styles.selectorRow}>
            <Pressable
                accessibilityRole="tab"
                accessibilityState={{selected: selectedId === 'all'}}
                onPress={() => {
                    trigger();
                    onSelectAll();
                }}
                style={({pressed}) => [
                    styles.fixedButton,
                    {
                        backgroundColor: selectedId === 'all'
                            ? theme.tonal.primary15
                            : pressed
                              ? theme.tonal.primary08
                              : undefined,
                        borderColor: selectedId === 'all'
                            ? theme.themeColor
                            : theme.themeColorUltraLight,
                    },
                ]}>
                <Ionicons
                    color={theme.themeColor}
                    name="people-outline"
                    size={scale(19)}
                />
                <Text style={[styles.fixedLabel, {color: theme.themeColor}]}>
                    {t('全部')}
                </Text>
            </Pressable>
            <ScrollView
                contentContainerStyle={styles.recentList}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentScroller}>
                {quickMembers.map(member => {
                    const key = String(member.harborUserId);
                    const name = memberName(member, t);
                    const selected = String(selectedId) === key;
                    const avatarUri = member.avatarTemplate
                        ? ARK_HARBOR_AVATAR_TEMPLATE(member.avatarTemplate)
                        : null;
                    return (
                        <Pressable
                            key={key}
                            accessibilityLabel={name}
                            accessibilityRole="tab"
                            accessibilityState={{selected}}
                            onPress={() => {
                                trigger();
                                onSelectMember(member);
                            }}
                            style={({pressed}) => [
                                styles.memberButton,
                                {
                                    backgroundColor: selected
                                        ? theme.tonal.primary15
                                        : pressed
                                          ? theme.tonal.primary08
                                          : undefined,
                                    borderColor: selected
                                        ? theme.themeColor
                                        : theme.themeColorUltraLight,
                                },
                            ]}>
                            {avatarUri ? (
                                <Image
                                    source={{uri: avatarUri}}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.avatar,
                                        {backgroundColor: theme.tonal.primary15},
                                    ]}
                                />
                            )}
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.memberLabel,
                                    {
                                        color: selected
                                            ? theme.themeColor
                                            : theme.black.third,
                                    },
                                    selected && styles.selectedLabel,
                                ]}>
                                {name}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            <Pressable
                accessibilityLabel={t('搜尋成員')}
                accessibilityRole="button"
                onPress={() => {
                    trigger();
                    onOpenSearch();
                }}
                style={({pressed}) => [
                    styles.fixedButton,
                    {
                        backgroundColor: pressed
                            ? theme.tonal.primary15
                            : undefined,
                        borderColor: theme.themeColorUltraLight,
                    },
                ]}>
                <Ionicons
                    color={theme.themeColor}
                    name="search"
                    size={scale(20)}
                />
                <Text style={[styles.fixedLabel, {color: theme.themeColor}]}>
                    {t('搜尋')}
                </Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    selectorRow: {alignItems: 'stretch', flexDirection: 'row', gap: scale(8), height: verticalScale(68), paddingBottom: verticalScale(10)},
    fixedButton: {alignItems: 'center', borderRadius: scale(8), borderWidth: StyleSheet.hairlineWidth, height: verticalScale(58), justifyContent: 'center', width: scale(54)},
    fixedLabel: {...uiStyle.defaultText, fontSize: scale(10), fontWeight: '700', marginTop: verticalScale(3)},
    recentScroller: {flex: 1, height: verticalScale(58)},
    recentList: {gap: scale(8)},
    memberButton: {alignItems: 'center', borderRadius: scale(8), borderWidth: StyleSheet.hairlineWidth, height: verticalScale(58), paddingHorizontal: scale(3), paddingVertical: verticalScale(3), width: scale(54)},
    avatar: {borderRadius: scale(18), height: scale(36), width: scale(36)},
    memberLabel: {...uiStyle.defaultText, fontSize: scale(10), marginTop: verticalScale(3), maxWidth: scale(48), textAlign: 'center'},
    selectedLabel: {fontWeight: '700'},
});

export default memo(SharedTimetableMemberSelector);
