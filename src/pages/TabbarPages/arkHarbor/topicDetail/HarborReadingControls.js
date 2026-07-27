import React, {
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Pressable,
    Text,
    View,
} from 'react-native';

import Slider from '@react-native-community/slider';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import styles from './styles';

const HarborReadingControls = memo(
    ({
        currentPostNumber,
        highestPostNumber,
        onFirst,
        onJump,
        onLatest,
        onUnread,
        onSeek,
        onLayoutHeight,
        unreadPostNumber,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const { black, themeColor, themeColorUltraLight, tonal, white } = theme;
        const maxPostNumber = Math.max(Number(highestPostNumber) || 1, 1);
        const syncedPostNumber = Math.min(
            Math.max(Number(currentPostNumber) || 1, 1),
            maxPostNumber,
        );
        const [isSliding, setIsSliding] = useState(false);
        const [slidingValue, setSlidingValue] = useState(syncedPostNumber);
        // 鬆手後暫鎖目標樓層，避免列表尚未同步時滑桿被拉回舊值
        const [pendingSeek, setPendingSeek] = useState(null);
        // 記錄最後跳轉樓層，避免重複觸發
        const lastSeekedRef = useRef(syncedPostNumber);
        const isUserDriving = isSliding || pendingSeek != null;
        const displayPostNumber = isUserDriving
            ? Math.round(isSliding ? slidingValue : pendingSeek)
            : syncedPostNumber;
        const sliderValue = isUserDriving
            ? isSliding
                ? slidingValue
                : Number(pendingSeek)
            : syncedPostNumber;
        const progress =
            maxPostNumber > 0
                ? Math.min(displayPostNumber / maxPostNumber, 1)
                : 0;
        const controls = [
            { icon: 'page-first', label: t('第一篇'), onPress: onFirst },
            { icon: 'format-list-numbered', label: t('跳至樓層'), onPress: onJump },
            { icon: 'page-last', label: t('最新一篇'), onPress: onLatest },
        ];

        useEffect(() => {
            if (isSliding) {
                return;
            }
            if (pendingSeek != null) {
                if (syncedPostNumber === pendingSeek) {
                    setPendingSeek(null);
                    setSlidingValue(syncedPostNumber);
                    lastSeekedRef.current = syncedPostNumber;
                }
                return;
            }
            setSlidingValue(syncedPostNumber);
            lastSeekedRef.current = syncedPostNumber;
        }, [isSliding, pendingSeek, syncedPostNumber]);

        const seekToFloor = useCallback(
            (value, { scrubbing } = {}) => {
                const targetPostNumber = Math.round(value);
                if (
                    scrubbing &&
                    targetPostNumber === lastSeekedRef.current
                ) {
                    return;
                }
                lastSeekedRef.current = targetPostNumber;
                onSeek?.(targetPostNumber, { scrubbing: Boolean(scrubbing) });
            },
            [onSeek],
        );

        return (
            <View
                onLayout={event => {
                    const nextHeight = event.nativeEvent.layout.height;
                    if (nextHeight > 0) {
                        onLayoutHeight?.(nextHeight);
                    }
                }}
                style={[
                    styles.readingControls,
                    theme.viewShadow,
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                ]}>
                <View style={styles.progressHeader}>
                    <Text style={[styles.progressText, { color: black.second }]}>
                        {t('閱讀進度')} · {displayPostNumber}/{maxPostNumber}
                    </Text>
                    <Text style={[styles.progressPercent, { color: themeColor }]}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
                <Slider
                    style={styles.progressSlider}
                    minimumValue={1}
                    maximumValue={maxPostNumber}
                    step={1}
                    value={sliderValue}
                    disabled={maxPostNumber <= 1}
                    // iOS：點擊軌道即可跳轉；Android 原生已支援點擊
                    tapToSeek={true}
                    minimumTrackTintColor={themeColor}
                    maximumTrackTintColor={tonal.primary15}
                    thumbTintColor={themeColor}
                    onSlidingStart={value => {
                        setPendingSeek(null);
                        setIsSliding(true);
                        lastSeekedRef.current = Math.round(value);
                    }}
                    onValueChange={value => {
                        setSlidingValue(value);
                    }}
                    onSlidingComplete={value => {
                        const targetPostNumber = Math.round(value);
                        setSlidingValue(targetPostNumber);
                        setPendingSeek(targetPostNumber);
                        setIsSliding(false);
                        trigger();
                        seekToFloor(targetPostNumber, { scrubbing: false });
                    }}
                />
                {unreadPostNumber > 0 ? (
                    <Pressable
                        onPress={() => {
                            trigger();
                            onUnread();
                        }}
                        style={({ pressed }) => [
                            styles.controlButton,
                            styles.unreadButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="email-mark-as-unread"
                            size={scale(15)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.controlButtonText,
                                { color: themeColor },
                            ]}>
                            {t('跳到未讀')}
                        </Text>
                    </Pressable>
                ) : null}
                <View style={styles.controlRow}>
                    {controls.map(control => (
                        <Pressable
                            key={control.label}
                            onPress={() => {
                                trigger();
                                control.onPress();
                            }}
                            style={({ pressed }) => [
                                styles.controlButton,
                                {
                                    backgroundColor: pressed
                                        ? tonal.primary30
                                        : tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name={control.icon}
                                size={scale(15)}
                                color={themeColor}
                            />
                            <Text
                                style={[
                                    styles.controlButtonText,
                                    { color: themeColor },
                                ]}>
                                {control.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        );
    },
);


export default HarborReadingControls;
