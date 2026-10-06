// Web 替身：@react-native-menu/menu 只有 iOS/Android 原生實現
// 這裡用 Pressable + 絕對定位列表模擬下拉菜單，回調格式與原庫一致：
// onPressAction({ nativeEvent: { event: action.id } })
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';

const flattenActions = actions =>
    (actions || []).flatMap(action =>
        Array.isArray(action.subactions) && action.subactions.length
            ? action.subactions
            : [action],
    );

export const MenuView = ({
    actions,
    onPressAction,
    onOpenMenu,
    onCloseMenu,
    style,
    children,
    isAnchoredToRight,
}) => {
    const [visible, setVisible] = useState(false);
    const [anchor, setAnchor] = useState({ x: 0, y: 0 });

    const open = useCallback(event => {
        const { pageX = 0, pageY = 0 } = event?.nativeEvent || {};
        setAnchor({ x: pageX, y: pageY });
        setVisible(true);
        onOpenMenu?.();
    }, [onOpenMenu]);

    const close = useCallback(() => {
        setVisible(false);
        onCloseMenu?.();
    }, [onCloseMenu]);

    const handleSelect = useCallback(action => {
        close();
        onPressAction?.({ nativeEvent: { event: action.id } });
    }, [close, onPressAction]);

    const items = flattenActions(actions).filter(
        action => action && action.attributes?.hidden !== true,
    );

    return (
        <>
            <Pressable onPress={open} style={style}>
                {children}
            </Pressable>
            <Modal transparent visible={visible} onRequestClose={close} animationType="fade">
                <Pressable style={styles.backdrop} onPress={close}>
                    <View
                        style={[
                            styles.menu,
                            {
                                top: anchor.y,
                                ...(isAnchoredToRight
                                    ? { right: Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 0) - anchor.x) }
                                    : { left: anchor.x }),
                            },
                        ]}>
                        {items.map(action => {
                            const disabled = action.attributes?.disabled === true;
                            const destructive = action.attributes?.destructive === true;
                            return (
                                <Pressable
                                    key={action.id}
                                    disabled={disabled}
                                    onPress={() => handleSelect(action)}
                                    style={({ hovered, pressed }) => [
                                        styles.item,
                                        (hovered || pressed) && styles.itemActive,
                                    ]}>
                                    <Text
                                        style={[
                                            styles.itemText,
                                            destructive && styles.itemDestructive,
                                            disabled && styles.itemDisabled,
                                        ]}>
                                        {action.title}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
    },
    menu: {
        position: 'absolute',
        minWidth: 180,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#fff',
        // RN 0.86 起 shadow* 已廢棄，web 端直接用 CSS 語法的 boxShadow
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
    },
    item: {
        paddingHorizontal: 16,
        paddingVertical: 9,
    },
    itemActive: {
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    itemText: {
        fontSize: 14,
        color: '#222',
    },
    itemDestructive: {
        color: '#d0342c',
    },
    itemDisabled: {
        color: '#999',
    },
});

export default MenuView;
