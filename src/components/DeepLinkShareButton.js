import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale } from 'react-native-size-matters';

import { trigger } from '../utils/trigger';

const DeepLinkShareButton = ({ accessibilityLabel, onPress, themeColor }) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
            trigger();
            onPress();
        }}
        style={styles.button}>
        <MaterialCommunityIcons
            name="share-variant-outline"
            size={scale(20)}
            color={themeColor}
        />
    </Pressable>
);

export const getDeepLinkShareHeaderOptions = ({
    accessibilityLabel,
    onPress,
    themeColor,
}) => ({
    headerRight:
        Platform.OS === 'ios'
            ? undefined
            : () => (
                <DeepLinkShareButton
                    accessibilityLabel={accessibilityLabel}
                    onPress={onPress}
                    themeColor={themeColor}
                />
            ),
    unstable_headerRightItems:
        Platform.OS === 'ios'
            ? () => [
                {
                    type: 'button',
                    label: accessibilityLabel,
                    accessibilityLabel,
                    icon: {
                        type: 'sfSymbol',
                        name: 'square.and.arrow.up',
                    },
                    tintColor: themeColor,
                    onPress: () => {
                        trigger();
                        onPress();
                    },
                },
            ]
            : undefined,
});

const styles = StyleSheet.create({
    button: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default DeepLinkShareButton;
