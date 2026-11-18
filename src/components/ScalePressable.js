import React from 'react';
import {Pressable, StyleSheet} from 'react-native';

import {useAppReducedMotion} from '../contexts/ReducedMotionContext';
import TouchableScale from './TouchableScale';

const ACTIVE_SCALE = 0.98;
const ACTIVE_OPACITY = 0.84;

export default function ScalePressable({style, ...props}) {
    const reducedMotion = useAppReducedMotion();

    if (reducedMotion) {
        const opacity = StyleSheet.flatten(style)?.opacity ?? 1;

        return (
            <Pressable
                {...props}
                style={({pressed}) => [
                    style,
                    pressed && {opacity: opacity * ACTIVE_OPACITY},
                ]}
            />
        );
    }

    return <TouchableScale {...props} style={style} activeScale={ACTIVE_SCALE} />;
}
