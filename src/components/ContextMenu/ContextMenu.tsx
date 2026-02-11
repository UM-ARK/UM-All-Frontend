/**
 * ContextMenu - 跨平台上下文菜單組件
 *
 * 使用 @expo/ui 的原生實現：
 * - iOS: 使用 @expo/ui/swift-ui 的 ContextMenu
 * - Android: 使用 @expo/ui/jetpack-compose 的 ContextMenu
 *
 * @module ContextMenu
 */

import React, { useCallback } from 'react';
import {
    StyleSheet,
    Platform,
} from 'react-native';

// ==================== 類型定義 ====================

export interface MenuItem {
    id: string;
    title: string;
    subtitle?: string;
    destructive?: boolean;
    disabled?: boolean;
    image?: string;
    imageColor?: string;
}

export interface SelectEvent {
    nativeEvent: {
        event: string;
    };
}

export interface ContextMenuProps {
    children: React.ReactElement;
    items: MenuItem[];
    onSelect?: (event: SelectEvent) => void;
    onOpen?: () => void;
    onClose?: () => void;
    title?: string;
    shouldOpenOnLongPress?: boolean;
    style?: any;
}

// ==================== 原生組件加載 ====================

let SwiftUI: any = null;
let JetpackCompose: any = null;

try {
    if (Platform.OS === 'ios') {
        SwiftUI = require('@expo/ui/swift-ui');
    } else {
        JetpackCompose = require('@expo/ui/jetpack-compose');
    }
} catch (e) {
    console.warn(`[ContextMenu] @expo/ui not available for ${Platform.OS}`);
}

// ==================== iOS 原生實現 ====================

const IOSContextMenu: React.FC<ContextMenuProps> = ({
    children,
    items,
    onSelect,
    onOpen,
    onClose,
    title,
    style,
}) => {
    const { ContextMenu, Host, Button } = SwiftUI;

    const handlePress = useCallback((itemId: string) => {
        onSelect?.({ nativeEvent: { event: itemId } });
        onClose?.();
    }, [onSelect, onClose]);

    // 構建 ContextMenu 內容
    const ContextMenuContent = (
        <ContextMenu>
            <ContextMenu.Items>
                {items.map((item) => (
                    <Button
                        key={item.id}
                        systemImage={item.image}
                        onPress={() => handlePress(item.id)}
                    >
                        {item.title}
                    </Button>
                ))}
            </ContextMenu.Items>
            <ContextMenu.Trigger>
                {children}
            </ContextMenu.Trigger>
        </ContextMenu>
    );

    return (
        <Host style={[styles.host, style]}>
            {ContextMenuContent}
        </Host>
    );
};

// ==================== Android 原生實現 ====================

const AndroidContextMenu: React.FC<ContextMenuProps> = ({
    children,
    items,
    onSelect,
    onClose,
    style,
}) => {
    const { ContextMenu, Button } = JetpackCompose;

    const handlePress = useCallback((itemId: string) => {
        onSelect?.({ nativeEvent: { event: itemId } });
        onClose?.();
    }, [onSelect, onClose]);

    return (
        <ContextMenu style={[styles.host, style]}>
            <ContextMenu.Items>
                {items.map((item) => (
                    <Button
                        key={item.id}
                        onPress={() => handlePress(item.id)}
                    >
                        {item.title}
                    </Button>
                ))}
            </ContextMenu.Items>
            <ContextMenu.Trigger>
                {children}
            </ContextMenu.Trigger>
        </ContextMenu>
    );
};


// ==================== 主組件 ====================

const ContextMenu: React.FC<ContextMenuProps> = (props) => {
    // 根據平台選擇對應的原生實現
    // iOS 使用 SwiftUI 實現，Android 使用 Jetpack Compose 實現
    if (Platform.OS === 'ios') {
        return <IOSContextMenu {...props} />;
    } else {
        return <AndroidContextMenu {...props} />;
    }
};

// ==================== 樣式 ====================

const styles = StyleSheet.create({
    host: {
        flex: 1,
    },
});

export default ContextMenu;
