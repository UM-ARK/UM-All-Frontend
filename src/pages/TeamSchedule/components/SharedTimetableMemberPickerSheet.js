import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';

import {FlashList} from '@shopify/flash-list';
import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import ActionSheet from 'react-native-actions-sheet';
import Ionicons from '@react-native-vector-icons/ionicons';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';
import {getSharedTimetableMemberOptions} from '../utils/sharedTimetableMembers';

const SharedTimetableMemberPickerSheet = ({
    visible,
    members,
    myHarborUserId,
    selectedId,
    onClose,
    onSelect,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const insets = useSafeAreaInsets();
    const {height: windowHeight} = useWindowDimensions();
    const sheetRef = useRef(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (visible) {
            sheetRef.current?.show();
        } else {
            sheetRef.current?.hide();
            setQuery('');
        }
    }, [visible]);

    const options = useMemo(
        () => getSharedTimetableMemberOptions(members, {
            myHarborUserId,
            query,
        }),
        [members, myHarborUserId, query],
    );

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            keyboardHandlerEnabled
            containerStyle={{
                backgroundColor: theme.bg_color,
                borderTopLeftRadius: scale(16),
                borderTopRightRadius: scale(16),
            }}
            onClose={() => onClose?.()}>
            <View
                style={[
                    styles.sheet,
                    {
                        height: windowHeight * 0.78,
                        paddingBottom: Math.max(
                            insets.bottom,
                            verticalScale(12),
                        ),
                    },
                ]}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, {color: theme.black.main}]}>
                            {t('搜尋成員')}
                        </Text>
                        <Text style={[styles.count, {color: theme.black.third}]}>
                            {t('共 {{count}} 人', {count: members.length})}
                        </Text>
                    </View>
                    <Pressable
                        accessibilityLabel={t('關閉')}
                        accessibilityRole="button"
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            sheetRef.current?.hide();
                        }}
                        style={({pressed}) => [
                            styles.closeButton,
                            pressed && {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <Ionicons
                            color={theme.black.second}
                            name="close"
                            size={scale(22)}
                        />
                    </Pressable>
                </View>
                <View
                    style={[
                        styles.searchBox,
                        {
                            backgroundColor: theme.tonal.primary08,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <Ionicons
                        color={theme.black.third}
                        name="search"
                        size={scale(18)}
                    />
                    <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setQuery}
                        placeholder={t('搜尋 username')}
                        placeholderTextColor={theme.black.third}
                        returnKeyType="search"
                        selectionColor={theme.themeColor}
                        style={[styles.searchInput, {color: theme.black.main}]}
                        value={query}
                    />
                    {query ? (
                        <Pressable
                            accessibilityLabel={t('清除搜尋內容')}
                            accessibilityRole="button"
                            hitSlop={scale(8)}
                            onPress={() => {
                                trigger();
                                setQuery('');
                            }}>
                            <Ionicons
                                color={theme.black.third}
                                name="close-circle"
                                size={scale(18)}
                            />
                        </Pressable>
                    ) : null}
                </View>
                <FlashList
                    contentContainerStyle={styles.memberListContent}
                    data={options}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={member => String(member.harborUserId)}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, {color: theme.black.third}]}>
                            {t('沒有符合的成員')}
                        </Text>
                    }
                    renderItem={({item}) => {
                        const key = String(item.harborUserId);
                        const name = item.username || t('成員');
                        const isMe =
                            myHarborUserId != null &&
                            key === String(myHarborUserId);
                        const selected = key === String(selectedId);
                        const avatarUri = item.avatarTemplate
                            ? ARK_HARBOR_AVATAR_TEMPLATE(item.avatarTemplate, 96)
                            : null;
                        return (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                onPress={() => {
                                    trigger();
                                    onSelect(item);
                                    sheetRef.current?.hide();
                                }}
                                style={({pressed}) => [
                                    styles.memberRow,
                                    {
                                        backgroundColor: selected
                                            ? theme.tonal.primary15
                                            : pressed
                                              ? theme.tonal.primary08
                                              : undefined,
                                        borderBottomColor: theme.themeColorUltraLight,
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
                                <View style={styles.memberContent}>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.memberName,
                                            {color: theme.black.main},
                                        ]}>
                                        {name}
                                        {isMe ? ` · ${t('我')}` : ''}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.sharingStatus,
                                            {
                                                color: item.sharedTimetable
                                                    ? theme.themeColor
                                                    : theme.black.third,
                                            },
                                        ]}>
                                        {item.sharedTimetable
                                            ? t('已共享課表')
                                            : t('未共享課表')}
                                    </Text>
                                </View>
                                {selected ? (
                                    <Ionicons
                                        color={theme.themeColor}
                                        name="checkmark-circle"
                                        size={scale(21)}
                                    />
                                ) : null}
                            </Pressable>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    style={styles.memberList}
                />
            </View>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    sheet: {paddingHorizontal: scale(16), paddingTop: verticalScale(14)},
    header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
    title: {...uiStyle.defaultText, fontSize: scale(18), fontWeight: '700'},
    count: {...uiStyle.defaultText, fontSize: scale(11), marginTop: verticalScale(2)},
    closeButton: {alignItems: 'center', borderRadius: scale(18), height: scale(36), justifyContent: 'center', width: scale(36)},
    searchBox: {alignItems: 'center', borderRadius: scale(10), borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: verticalScale(12), paddingHorizontal: scale(10)},
    searchInput: {...uiStyle.defaultText, flex: 1, fontSize: scale(13), height: verticalScale(40), marginHorizontal: scale(7), paddingVertical: 0},
    memberList: {flex: 1, marginTop: verticalScale(8)},
    memberListContent: {paddingBottom: verticalScale(8)},
    memberRow: {alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: verticalScale(62), paddingHorizontal: scale(6), paddingVertical: verticalScale(8)},
    avatar: {borderRadius: scale(22), height: scale(44), width: scale(44)},
    memberContent: {flex: 1, marginLeft: scale(11)},
    memberName: {...uiStyle.defaultText, fontSize: scale(14), fontWeight: '600'},
    sharingStatus: {...uiStyle.defaultText, fontSize: scale(11), marginTop: verticalScale(3)},
    emptyText: {...uiStyle.defaultText, fontSize: scale(13), paddingVertical: verticalScale(28), textAlign: 'center'},
});

export default memo(SharedTimetableMemberPickerSheet);
