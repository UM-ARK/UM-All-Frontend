import React, {
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { Image } from 'expo-image';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import { useTheme } from '../../../../components/ThemeContext';
import { ARK_HARBOR_EMOJI_URL } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';

const HARBOR_REACTION_TWEMOJI = Object.freeze({
    heart: require('../../../../static/Twemoji/heart.png'),
    '+1': require('../../../../static/Twemoji/plus-one.png'),
    laughing: require('../../../../static/Twemoji/laughing.png'),
    open_mouth: require('../../../../static/Twemoji/open-mouth.png'),
    clap: require('../../../../static/Twemoji/clap.png'),
    confetti_ball: require('../../../../static/Twemoji/confetti-ball.png'),
    hugs: require('../../../../static/Twemoji/hugs.png'),
});

const HARBOR_REACTION_UNICODE = Object.freeze({
    heart: '❤️',
    '+1': '👍',
    '-1': '👎',
    laughing: '😆',
    open_mouth: '😮',
    clap: '👏',
    confetti_ball: '🎊',
    hugs: '🤗',
    smile: '😄',
    tada: '🎉',
    pray: '🙏',
    eyes: '👀',
    rocket: '🚀',
    heart_eyes: '😍',
    slightly_smiling_face: '🙂',
});

const HARBOR_REACTION_LABEL = Object.freeze({
    heart: '愛心',
    '+1': '讚同',
    '-1': '不讚同',
    laughing: '好笑',
    open_mouth: '驚訝',
    clap: '拍手',
    confetti_ball: '慶祝',
    hugs: '擁抱',
    smile: '微笑',
    tada: '太棒了',
    pray: '祈禱',
    eyes: '留意',
    rocket: '火箭',
    heart_eyes: '喜愛',
    slightly_smiling_face: '淡淡微笑',
});

const DEFAULT_REACTION = 'heart';
const PICKER_HORIZONTAL_MARGIN = scale(12);
const PICKER_ITEM_SIZE = scale(34);
const PICKER_ITEM_GAP = scale(4);
const PICKER_PADDING = scale(8);
const PICKER_HEIGHT = PICKER_ITEM_SIZE + PICKER_PADDING * 2;

const normalizeHarborReactionName = name => {
    if (!name || typeof name !== 'string') {
        return '';
    }
    return name.replace(/^:|:$/g, '').trim();
};

const getHarborReactionLabel = name => {
    const reactionName = normalizeHarborReactionName(name);
    return (
        HARBOR_REACTION_LABEL[reactionName] ||
        reactionName.replace(/_/g, ' ')
    );
};

const HarborReactionIcon = ({ name, size = scale(24), color }) => {
    const reactionName = normalizeHarborReactionName(name);
    const localSource = HARBOR_REACTION_TWEMOJI[reactionName];
    const remoteUrl = ARK_HARBOR_EMOJI_URL(reactionName);
    // 先使用 App 內 Twemoji，失敗時才依序改用 Harbor 遠端與 Unicode。
    const sources = useMemo(
        () => [
            localSource,
            remoteUrl ? { uri: remoteUrl } : null,
        ].filter(Boolean),
        [localSource, remoteUrl],
    );
    const [failedSource, setFailedSource] = useState({
        reactionName: '',
        index: 0,
    });
    const sourceIndex = failedSource.reactionName === reactionName
        ? failedSource.index
        : 0;
    const source = sources[sourceIndex];

    if (source) {
        return (
            <Image
                source={source}
                style={{ width: size, height: size }}
                contentFit="contain"
                accessibilityLabel={`:${reactionName}:`}
                onError={() => {
                    setFailedSource({
                        reactionName,
                        index: sourceIndex + 1,
                    });
                }}
            />
        );
    }

    const unicode = HARBOR_REACTION_UNICODE[reactionName];
    if (unicode) {
        return (
            <Text
                allowFontScaling={false}
                style={[
                    reactionStyles.reactionGlyph,
                    {
                        color: color || undefined,
                        fontSize: size,
                        lineHeight: size * 1.15,
                    },
                ]}>
                {unicode}
            </Text>
        );
    }

    if (!reactionName) {
        return null;
    }

    return (
        <Text
            numberOfLines={1}
            style={[
                reactionStyles.reactionFallbackText,
                { color: color || undefined, fontSize: size * 0.45 },
            ]}>
            :{reactionName}:
        </Text>
    );
};

const HarborReactionControl = ({
    allowPicker = true,
    children,
    currentReaction,
    disabled,
    hitSlop,
    onPressDisabled,
    onSelectReaction,
    pending,
    reactions,
    stopPropagation = false,
    style,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const {
        height: windowHeight,
        width: windowWidth,
    } = useWindowDimensions();
    const anchorRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const [pickerAnchor, setPickerAnchor] = useState(null);
    const validReactions = useMemo(
        () => (Array.isArray(reactions) ? reactions : [])
            .map(normalizeHarborReactionName)
            .filter(Boolean),
        [reactions],
    );
    const primaryReaction = validReactions.includes(DEFAULT_REACTION)
        ? DEFAULT_REACTION
        : validReactions[0] || DEFAULT_REACTION;
    const pickerWidth = Math.min(
        windowWidth - PICKER_HORIZONTAL_MARGIN * 2,
        validReactions.length * PICKER_ITEM_SIZE +
            Math.max(0, validReactions.length - 1) * PICKER_ITEM_GAP +
            PICKER_PADDING * 2,
    );
    const closePicker = () => setPickerAnchor(null);
    const selectReaction = reaction => {
        closePicker();
        trigger();
        onSelectReaction?.(reaction);
    };
    const stopPressPropagation = event => {
        if (stopPropagation) {
            event?.stopPropagation?.();
        }
    };
    const handlePress = event => {
        stopPressPropagation(event);
        if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
        }
        if (pending) {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                console.warn('[HarborPostAction] reaction.pending_ignore');
            }
            return;
        }
        trigger();
        if (disabled) {
            onPressDisabled?.();
            return;
        }
        onSelectReaction?.(
            normalizeHarborReactionName(currentReaction) || primaryReaction,
        );
    };
    const handleLongPress = event => {
        stopPressPropagation(event);
        longPressTriggeredRef.current = true;
        trigger();
        if (disabled) {
            onPressDisabled?.();
            return;
        }
        if (pending || validReactions.length === 0) {
            return;
        }
        anchorRef.current?.measureInWindow((x, y, width, height) => {
            setPickerAnchor({ x, y, width, height });
        });
    };
    const pickerLeft = pickerAnchor
        ? Math.min(
            Math.max(
                PICKER_HORIZONTAL_MARGIN,
                pickerAnchor.x + pickerAnchor.width / 2 - pickerWidth / 2,
            ),
            windowWidth - pickerWidth - PICKER_HORIZONTAL_MARGIN,
        )
        : 0;
    const pickerTop = pickerAnchor
        ? Math.max(
            PICKER_HORIZONTAL_MARGIN,
            Math.min(
                pickerAnchor.y - PICKER_HEIGHT - scale(8) >=
                    PICKER_HORIZONTAL_MARGIN
                    ? pickerAnchor.y - PICKER_HEIGHT - scale(8)
                    : pickerAnchor.y + pickerAnchor.height + scale(8),
                windowHeight - PICKER_HEIGHT - PICKER_HORIZONTAL_MARGIN,
            ),
        )
        : 0;
    const currentReactionName = normalizeHarborReactionName(currentReaction);
    const accessibilityLabel = currentReactionName
        ? t('取消{{reaction}}回應', {
            reaction: t(getHarborReactionLabel(currentReactionName)),
        })
        : t('讚好');

    return (
        <>
            <Pressable
                ref={anchorRef}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={
                    allowPicker ? t('長按選擇其他回應') : undefined
                }
                delayLongPress={allowPicker ? 400 : undefined}
                disabled={pending}
                hitSlop={hitSlop}
                onPress={handlePress}
                onPressIn={event => {
                    stopPressPropagation(event);
                    longPressTriggeredRef.current = false;
                }}
                onLongPress={allowPicker ? handleLongPress : undefined}
                style={style}>
                {children}
            </Pressable>
            {pickerAnchor ? (
                <Modal
                    visible
                    transparent
                    animationType="fade"
                    presentationStyle="overFullScreen"
                    statusBarTranslucent
                    onRequestClose={closePicker}>
                    <View
                        style={reactionStyles.modalRoot}
                        pointerEvents="box-none">
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('關閉回應選擇器')}
                            onPress={() => {
                                trigger();
                                closePicker();
                            }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View
                            style={[
                                reactionStyles.picker,
                                {
                                    backgroundColor: theme.white,
                                    borderColor: theme.disabled,
                                    left: pickerLeft,
                                    shadowColor: theme.black.main,
                                    top: pickerTop,
                                    width: pickerWidth,
                                },
                            ]}>
                            <ScrollView
                                horizontal
                                contentContainerStyle={
                                    reactionStyles.pickerContent
                                }
                                showsHorizontalScrollIndicator={false}>
                                {validReactions.map(reaction => {
                                    const selected =
                                        currentReactionName === reaction;
                                    return (
                                        <Pressable
                                            key={reaction}
                                            accessibilityRole="button"
                                            accessibilityLabel={t(
                                                getHarborReactionLabel(
                                                    reaction,
                                                ),
                                            )}
                                            accessibilityState={{ selected }}
                                            onPress={() =>
                                                selectReaction(reaction)
                                            }
                                            style={({ pressed }) => [
                                                reactionStyles.pickerItem,
                                                selected
                                                    ? {
                                                        backgroundColor:
                                                            theme.bg_color,
                                                    }
                                                    : null,
                                                pressed
                                                    ? reactionStyles.pickerItemPressed
                                                    : null,
                                            ]}>
                                            <HarborReactionIcon
                                                name={reaction}
                                                size={scale(26)}
                                            />
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            ) : null}
        </>
    );
};

const reactionStyles = StyleSheet.create({
    modalRoot: {
        flex: 1,
    },
    picker: {
        position: 'absolute',
        height: PICKER_HEIGHT,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: PICKER_HEIGHT / 2,
        shadowOffset: {
            width: 0,
            height: scale(4),
        },
        shadowOpacity: 0.16,
        shadowRadius: scale(10),
        elevation: 8,
    },
    pickerContent: {
        alignItems: 'center',
        columnGap: PICKER_ITEM_GAP,
        paddingHorizontal: PICKER_PADDING,
    },
    pickerItem: {
        width: PICKER_ITEM_SIZE,
        height: PICKER_ITEM_SIZE,
        borderRadius: PICKER_ITEM_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerItemPressed: {
        opacity: 0.65,
    },
    reactionGlyph: {
        textAlign: 'center',
    },
    reactionFallbackText: {
        maxWidth: scale(54),
        textAlign: 'center',
    },
});

export {
    getHarborReactionLabel,
    HarborReactionIcon,
};
export default HarborReactionControl;
