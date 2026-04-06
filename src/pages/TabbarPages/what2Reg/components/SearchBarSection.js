import React from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as DropdownMenu from 'zeego/dropdown-menu';
import TouchableScale from 'react-native-touchable-scale';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import { uiStyle } from '../../../../components/ThemeContext';

/**
 * 搜尋欄區塊
 */
const SearchBarSection = ({
    theme,
    inputText,
    inputOK,
    textInputRef,
    onChangeText,
    onClear,
    onPressAction,
    onPressSearchButton,
    trigger,
}) => {
    const { themeColor, black, white, disabled } = theme;

    return (
        <View style={{
            alignItems: 'center',
            flexDirection: 'row',
            width: '100%',
            marginTop: scale(5),
            paddingHorizontal: scale(10),
            backgroundColor: 'transparent',
        }}>
            <View style={{
                backgroundColor: white,
                borderWidth: scale(2),
                borderColor: themeColor,
                borderRadius: scale(10),
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: scale(5),
                paddingHorizontal: scale(5),
                paddingVertical: scale(3),
                flex: 1,
            }}>
                <Ionicons name={'search'} size={scale(15)} color={black.third} />
                <TextInput
                    style={{
                        ...uiStyle.defaultText,
                        paddingVertical: verticalScale(3),
                        paddingHorizontal: scale(5),
                        color: black.main,
                        fontSize: scale(12),
                        flex: 1,
                    }}
                    onChangeText={onChangeText}
                    value={inputText}
                    selectTextOnFocus
                    placeholder={t('試試ECE or Electrical or 電氣', { ns: 'catalog' })}
                    placeholderTextColor={black.third}
                    ref={textInputRef}
                    onFocus={() => trigger()}
                    returnKeyType={'search'}
                    selectionColor={themeColor}
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                />
                {inputText.length > 0 ? (
                    <Pressable
                        onPress={onClear}
                        style={{ padding: scale(3), marginLeft: 'auto' }}
                    >
                        <Ionicons
                            name={'close-circle'}
                            size={scale(15)}
                            color={themeColor}
                        />
                    </Pressable>
                ) : null}
            </View>

            <DropdownMenu.Root
                onOpenChange={(open) => {
                    if (open) {
                        trigger();
                    }
                }}
            >
                <DropdownMenu.Trigger>
                    <TouchableScale
                        style={{
                            backgroundColor: inputOK ? themeColor : disabled,
                            borderRadius: scale(6),
                            padding: scale(7),
                            paddingHorizontal: scale(8),
                            alignItems: 'center',
                        }}
                        activeOpacity={0.8}
                        disabled={!inputOK}
                        onPress={onPressSearchButton}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(12),
                            color: white,
                            fontWeight: 'bold',
                            lineHeight: verticalScale(14),
                        }}>
                            {t('搜索')}
                        </Text>
                    </TouchableScale>
                </DropdownMenu.Trigger>
                {/* Menu 選項列表 */}
                <DropdownMenu.Content>
                    <DropdownMenu.Item
                        key="ark-wiki"
                        onSelect={() => {
                            trigger();
                            if (inputOK) {
                                onPressAction('wiki');
                            }
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'book',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: themeColor,
                                    light: themeColor,
                                },
                            }}
                            androidIconName="ic_menu_book"
                        />
                        <DropdownMenu.ItemTitle style={{ color: themeColor }}>
                            {t('寫', { ns: 'catalog' })} Wiki
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        key="what2reg"
                        onSelect={() => {
                            trigger();
                            if (inputOK) {
                                onPressAction('what2reg');
                            }
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'star',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: black.third,
                                    light: black.third,
                                },
                            }}
                            androidIconName="ic_menu_star"
                        />
                        <DropdownMenu.ItemTitle style={{ color: black.third }}>
                            {t('查', { ns: 'catalog' })} {t('選咩課', { ns: 'catalog' })}
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        key="official"
                        onSelect={() => {
                            trigger();
                            if (inputOK) {
                                onPressAction('official');
                            }
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'graduationcap',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: black.third,
                                    light: black.third,
                                },
                            }}
                            androidIconName="ic_menu_myplaces"
                        />
                        <DropdownMenu.ItemTitle style={{ color: black.third }}>
                            {t('查', { ns: 'catalog' })} {t('官方', { ns: 'catalog' })}
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </View>
    );
};

export default SearchBarSection;
