import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import {scale, verticalScale} from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import {useTranslation} from 'react-i18next';

import ARKImageView from '../../../../components/ARKImageView';
import Text from '../../../../components/AppText';
import TextInput from '../../../../components/AppTextInput';
import {useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {openLink} from '../../../../utils/browser';
import {stripHtml} from '../../../../utils/harbor/harborApi';
import {
    fetchHarborReviewable,
    fetchHarborReviewables,
    isHarborReviewConflict,
    isHarborReviewError,
    isHarborReviewForbidden,
    performHarborReviewAction,
} from '../../../../utils/harbor/harborReview';
import {trigger} from '../../../../utils/trigger';
import {HarborFullState, HarborInlineRetry} from '../components/HarborListStates';
import HarborPostContent from '../topicDetail/HarborPostContent';
import {extractPostImages} from '../topicDetail/harborTopicModels';

const PAGE_SIZE = 10;
const SAFE_CLIENT_ACTIONS = new Set([
    'perform',
    'approve',
    'reject',
    'agree',
    'disagree',
    'hide',
    'restore',
    'ignore',
]);
const COMPLEX_CLIENT_ACTIONS = new Set([
    'edit',
    'edit_post',
    'revise',
    'silence',
    'suspend',
    'ban',
    'revise_and_reject_post',
    'scrub',
]);

const unwrapReviewable = response => {
    if (!response || typeof response !== 'object') {
        return null;
    }
    return response.item || response.reviewable || response;
};

const getQueueItems = response => {
    if (Array.isArray(response)) {
        return response;
    }
    if (!response || typeof response !== 'object') {
        return [];
    }
    const items = response.reviewables || response.items || [];
    return Array.isArray(items) ? items : [];
};

const getNextPage = (response, page, itemCount) => {
    if (!response || typeof response !== 'object') {
        return itemCount >= PAGE_SIZE ? page + 1 : null;
    }
    const nextPage = response.nextPage ?? response.next_page ?? response.meta?.nextPage ?? response.meta?.next_page;
    if (Number.isFinite(Number(nextPage))) {
        return Number(nextPage);
    }
    if (response.hasMore === false || response.has_more === false) {
        return null;
    }
    return itemCount >= PAGE_SIZE ? page + 1 : null;
};

const getReviewableActions = reviewable => {
    const bundledActions =
        reviewable?.bundledActions || reviewable?.bundled_actions;
    const actions =
        (Array.isArray(bundledActions) && bundledActions.length > 0
            ? bundledActions
            : null) ||
        reviewable?.actions ||
        reviewable?.reviewable_actions ||
        [];
    if (!Array.isArray(actions)) {
        return [];
    }
    return actions.flatMap(action =>
        Array.isArray(action?.actions) ? action.actions : action,
    ).filter(action => action && action.id != null);
};

const getReviewableTitle = reviewable =>
    stripHtml(
        reviewable?.title ||
            reviewable?.topic?.title ||
            reviewable?.target?.title ||
            reviewable?.payload?.title ||
            '',
    );

const getReviewableBody = reviewable =>
    stripHtml(
        reviewable?.target?.cooked ||
            reviewable?.target?.raw ||
            reviewable?.cooked ||
            reviewable?.raw ||
            reviewable?.payload?.cooked ||
            reviewable?.payload?.raw ||
            reviewable?.excerpt ||
            '',
    );

const getReviewableCooked = reviewable => {
    const cooked =
        reviewable?.target?.cooked ||
        reviewable?.cooked ||
        reviewable?.payload?.cooked;
    return typeof cooked === 'string' ? cooked.trim() : '';
};

const getReviewableAuthor = reviewable => {
    const author =
        reviewable?.target_created_by ||
        reviewable?.created_by ||
        reviewable?.target?.created_by ||
        reviewable?.user;
    return author?.username || author?.name || '';
};

const getReviewableType = reviewable =>
    reviewable?.type || reviewable?.reviewable_type || '';

const getReviewableTypeLabel = (type, t) => {
    if (type === 'ReviewableFlaggedPost') {
        return t('被舉報貼文');
    }
    if (type === 'ReviewableQueuedPost') {
        return t('待批准貼文');
    }
    if (type === 'ReviewableUser') {
        return t('待批准用戶');
    }
    return type || t('待審案件');
};

const getActionLabel = action =>
    action?.label || action?.name || action?.clientAction || action?.client_action || '';

const getActionDescription = action =>
    action?.description || action?.short_description || '';

const getClientAction = action =>
    String(action?.clientAction || action?.client_action || '').toLowerCase();

const actionRequiresRejectReason = action =>
    Boolean(action?.requireRejectReason || action?.require_reject_reason);

const hasActionInputs = value => {
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return Boolean(value && typeof value === 'object' && Object.keys(value).length);
};

const actionNeedsInput = action => {
    const clientAction = getClientAction(action);
    const actionId = String(action?.actionId || '').toLowerCase();
    return (
        COMPLEX_CLIENT_ACTIONS.has(clientAction) ||
        COMPLEX_CLIENT_ACTIONS.has(actionId) ||
        action?.requires_reason ||
        action?.requires_input ||
        hasActionInputs(action?.fields) ||
        hasActionInputs(action?.params)
    );
};

const actionCanBeSubmitted = action => {
    if (!action?.actionId || actionNeedsInput(action)) {
        return false;
    }
    const clientAction = getClientAction(action);
    return !clientAction || SAFE_CLIENT_ACTIONS.has(clientAction);
};

const isDestructiveAction = action => {
    const value = `${action?.actionId || ''} ${getClientAction(action)} ${action?.name || ''} ${action?.label || ''} ${action?.buttonClass || action?.button_class || ''}`.toLowerCase();
    return /delete|reject|hide|silence|suspend|ban|封鎖|刪除|拒絕|隱藏|禁言/.test(value);
};

const getActionIcon = action => {
    const value = `${action?.actionId || ''} ${getClientAction(action)} ${action?.name || ''} ${action?.label || ''}`.toLowerCase();
    if (/approve|agree|restore|check|批准|同意|還原/.test(value)) {
        return 'check-circle-outline';
    }
    if (/delete|reject|hide|silence|suspend|ban|刪除|拒絕|隱藏|禁言/.test(value)) {
        return 'alert-octagon-outline';
    }
    return 'gesture-tap-button';
};

const ReviewQueueRow = ({item, onPress}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const title = getReviewableTitle(item);
    const body = getReviewableBody(item);
    const author = getReviewableAuthor(item);
    const type = getReviewableType(item);
    const typeLabel = getReviewableTypeLabel(type, t);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={title || typeLabel}
            onPress={() => {
                trigger();
                onPress(item);
            }}
            style={({pressed}) => [
                styles.queueRow,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary08
                        : theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <View
                style={[
                    styles.queueTypeIcon,
                    {backgroundColor: theme.tonal.unread15},
                ]}>
                <MaterialCommunityIcons
                    color={theme.unread}
                    name="shield-alert-outline"
                    size={scale(21)}
                />
            </View>
            <View style={styles.queueBody}>
                <View style={styles.queueTitleRow}>
                    <Text
                        numberOfLines={1}
                        style={[styles.queueTitle, {color: theme.black.main}]}>
                        {title || typeLabel}
                    </Text>
                    {Number.isFinite(Number(item?.score)) ? (
                        <Text
                            style={[styles.queueScore, {color: theme.unread}]}>
                            {item.score}
                        </Text>
                    ) : null}
                </View>
                {body ? (
                    <Text
                        numberOfLines={2}
                        style={[styles.queuePreview, {color: theme.black.third}]}>
                        {body}
                    </Text>
                ) : null}
                <View style={styles.queueFooter}>
                    {typeLabel ? (
                        <Text
                            numberOfLines={1}
                            style={[styles.queueMeta, {color: theme.themeColor}]}>
                            {typeLabel}
                        </Text>
                    ) : null}
                    {author ? (
                        <Text
                            numberOfLines={1}
                            style={[styles.queueMeta, {color: theme.black.third}]}>
                            @{author}
                        </Text>
                    ) : null}
                </View>
            </View>
            <MaterialCommunityIcons
                color={theme.black.third}
                name="chevron-right"
                size={scale(21)}
            />
        </Pressable>
    );
};

const ReviewDetailHeader = ({
    contentWidth,
    imageUrls,
    isLoading,
    onOpenImage,
    onPressLink,
    reviewable,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const title = getReviewableTitle(reviewable);
    const body = getReviewableBody(reviewable);
    const cooked = getReviewableCooked(reviewable);
    const author = getReviewableAuthor(reviewable);
    const type = getReviewableType(reviewable);
    const typeLabel = getReviewableTypeLabel(type, t);
    const scoreDetails = Array.isArray(reviewable?.reviewable_scores)
        ? reviewable.reviewable_scores
        : [];

    if (isLoading) {
        return (
            <View style={styles.detailLoading}>
                <ActivityIndicator color={theme.themeColor} size="small" />
                <Text style={[styles.detailLoadingText, {color: theme.black.third}]}>
                    {t('正在載入審核內容…')}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.detailHeader}>
            <View
                style={[
                    styles.detailType,
                    {backgroundColor: theme.tonal.unread15},
                ]}>
                <MaterialCommunityIcons
                    color={theme.unread}
                    name="shield-alert-outline"
                    size={scale(21)}
                />
                <Text style={[styles.detailTypeText, {color: theme.unread}]}>
                    {typeLabel}
                </Text>
            </View>
            <Text style={[styles.detailTitle, {color: theme.black.main}]}>
                {title || t('沒有可顯示的標題')}
            </Text>
            {author ? (
                <Text style={[styles.detailAuthor, {color: theme.black.third}]}>
                    {t('發佈者')} @{author}
                </Text>
            ) : null}
            {cooked ? (
                <View
                    style={[
                        styles.detailContent,
                        {
                            backgroundColor: theme.tonal.primary08,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <HarborPostContent
                        contentWidth={contentWidth}
                        cooked={cooked}
                        imageUrls={imageUrls}
                        onOpenImage={onOpenImage}
                        onPressLink={onPressLink}
                    />
                </View>
            ) : body ? (
                <View
                    style={[
                        styles.detailContent,
                        {
                            backgroundColor: theme.tonal.primary08,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <Text style={[styles.detailContentText, {color: theme.black.second}]}>
                        {body}
                    </Text>
                </View>
            ) : (
                <Text style={[styles.detailEmptyContent, {color: theme.black.third}]}>
                    {t('此案件沒有可在 App 內顯示的內容。')}
                </Text>
            )}
            {scoreDetails.length > 0 ? (
                <View
                    style={[
                        styles.contextCard,
                        {
                            backgroundColor: theme.tonal.primary08,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <Text style={[styles.contextTitle, {color: theme.black.main}]}>
                        {t('審核脈絡')}
                    </Text>
                    {scoreDetails.slice(0, 4).map((score, index) => (
                        <Text
                            key={`${score?.id || score?.reviewable_score_type || 'score'}-${index}`}
                            numberOfLines={2}
                            style={[styles.contextText, {color: theme.black.third}]}>
                            {score?.reason || score?.reviewable_score_type || t('已收到舉報')}
                        </Text>
                    ))}
                </View>
            ) : null}
        </View>
    );
};

const ReviewReasonModal = ({
    action,
    onCancel,
    onChangeReason,
    onSubmit,
    reason,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');

    return (
        <Modal
            animationType="fade"
            onRequestClose={onCancel}
            transparent
            visible={action != null}>
            <View style={styles.reasonModalPage}>
                <Pressable
                    accessibilityLabel={t('取消')}
                    accessibilityRole="button"
                    onPress={onCancel}
                    style={[
                        StyleSheet.absoluteFill,
                        styles.reasonModalBackdrop,
                        {backgroundColor: theme.black.main},
                    ]}
                />
                <View
                    style={[
                        styles.reasonModalCard,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.reasonModalTitle,
                            {color: theme.black.main},
                        ]}>
                        {t('填寫拒絕原因')}
                    </Text>
                    <Text
                        style={[
                            styles.reasonModalDescription,
                            {color: theme.black.third},
                        ]}>
                        {t('這個原因會隨審核操作一併送出。')}
                    </Text>
                    <TextInput
                        autoFocus
                        multiline
                        onChangeText={onChangeReason}
                        placeholder={t('請輸入拒絕原因')}
                        placeholderTextColor={theme.black.third}
                        style={[
                            styles.reasonInput,
                            {
                                backgroundColor: theme.tonal.primary08,
                                borderColor: theme.themeColorUltraLight,
                                color: theme.black.main,
                            },
                        ]}
                        textAlignVertical="top"
                        value={reason}
                    />
                    <View style={styles.reasonModalActions}>
                        <Pressable
                            accessibilityRole="button"
                            onPress={onCancel}
                            style={({pressed}) => [
                                styles.reasonCancelButton,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.primary15
                                        : theme.tonal.primary08,
                                },
                            ]}>
                            <Text
                                style={[
                                    styles.reasonCancelText,
                                    {color: theme.themeColor},
                                ]}>
                                {t('取消')}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            onPress={onSubmit}
                            style={({pressed}) => [
                                styles.reasonSubmitButton,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.unread30
                                        : theme.unread,
                                },
                            ]}>
                            <Text
                                style={[
                                    styles.reasonSubmitText,
                                    {color: theme.trueWhite},
                                ]}>
                                {getActionLabel(action) || t('確認')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const HarborReviewQueuePage = ({navigation, route}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const {width} = useWindowDimensions();
    const {
        patchReviewCount,
        refreshReviewCount,
        sessionGeneration,
        status,
        user,
    } = useHarborSession();
    const headerHeight = useHeaderHeight();
    const isDetailPage = route?.name === 'HarborReviewDetail';
    const routeReviewableId = route?.params?.reviewableId ?? null;
    const initialReviewable = route?.params?.initialReviewable ?? null;
    const [reviewables, setReviewables] = useState([]);
    const [isLoading, setIsLoading] = useState(!isDetailPage);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [isForbidden, setIsForbidden] = useState(false);
    const [nextPage, setNextPage] = useState(null);
    const [selectedId, setSelectedId] = useState(routeReviewableId);
    const [selectedReviewable, setSelectedReviewable] = useState(initialReviewable);
    const [isDetailLoading, setIsDetailLoading] = useState(isDetailPage);
    const [activeActionId, setActiveActionId] = useState(null);
    const [reasonAction, setReasonAction] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const initialLoadStartedRef = useRef(false);
    const requestActiveRef = useRef(false);
    const queueControllerRef = useRef(null);
    const detailControllerRef = useRef(null);
    const detailLoadStartedRef = useRef(false);
    const imageViewerRef = useRef(null);
    const previousSessionRef = useRef(null);
    const previousReviewRefreshRef = useRef(null);

    useEffect(() => {
        navigation?.setOptions?.({
            headerTitle: isDetailPage ? t('審核案件') : t('Harbor 審核'),
        });
    }, [isDetailPage, navigation, t]);

    const loadQueue = useCallback(
        async ({refresh = false, more = false} = {}) => {
            if (
                isDetailPage ||
                status !== 'signedIn' ||
                requestActiveRef.current ||
                (more && nextPage == null)
            ) {
                return;
            }
            requestActiveRef.current = true;
            const controller = new AbortController();
            queueControllerRef.current = controller;
            const page = more ? nextPage : 0;
            if (more) {
                setIsLoadingMore(true);
            } else if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setLoadError(false);

            try {
                const response = await fetchHarborReviewables({
                    page,
                    status: 'pending',
                    signal: controller.signal,
                });
                if (controller.signal.aborted) {
                    return;
                }
                const items = getQueueItems(response);
                if (Number.isFinite(Number(response?.meta?.reviewableCount))) {
                    patchReviewCount(
                        response.meta.reviewableCount,
                        user?.username,
                    );
                }
                setReviewables(current => {
                    if (!more) {
                        return items;
                    }
                    const currentIds = new Set(current.map(item => item?.id));
                    return [...current, ...items.filter(item => !currentIds.has(item?.id))];
                });
                setNextPage(getNextPage(response, page, items.length));
                setIsForbidden(false);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                if (isHarborReviewForbidden(error)) {
                    setIsForbidden(true);
                    setReviewables([]);
                    setNextPage(null);
                } else {
                    setLoadError(true);
                }
            } finally {
                if (queueControllerRef.current === controller) {
                    queueControllerRef.current = null;
                    requestActiveRef.current = false;
                    setIsLoading(false);
                    setIsRefreshing(false);
                    setIsLoadingMore(false);
                }
            }
        },
        [isDetailPage, nextPage, patchReviewCount, status, user?.username],
    );

    useEffect(() => {
        const sessionKey = `${sessionGeneration}:${status}`;
        if (previousSessionRef.current === sessionKey) {
            return;
        }
        previousSessionRef.current = sessionKey;
        queueControllerRef.current?.abort();
        detailControllerRef.current?.abort();
        queueControllerRef.current = null;
        detailControllerRef.current = null;
        requestActiveRef.current = false;
        initialLoadStartedRef.current = false;
        detailLoadStartedRef.current = false;
        setReviewables([]);
        setNextPage(null);
        setSelectedId(isDetailPage ? routeReviewableId : null);
        setSelectedReviewable(isDetailPage ? initialReviewable : null);
        setIsForbidden(false);
        setLoadError(false);
        setIsLoading(!isDetailPage && status === 'signedIn');
        setIsRefreshing(false);
        setIsLoadingMore(false);
        setIsDetailLoading(isDetailPage && status === 'signedIn');
        setActiveActionId(null);
        setReasonAction(null);
        setRejectReason('');
    }, [
        initialReviewable,
        isDetailPage,
        routeReviewableId,
        sessionGeneration,
        status,
    ]);

    useEffect(() => {
        if (
            !isDetailPage &&
            status === 'signedIn' &&
            !initialLoadStartedRef.current
        ) {
            initialLoadStartedRef.current = true;
            loadQueue();
        }
    }, [isDetailPage, loadQueue, sessionGeneration, status]);

    useEffect(() => {
        const refreshAt = route?.params?.reviewRefreshAt;
        if (
            isDetailPage ||
            refreshAt == null ||
            previousReviewRefreshRef.current === refreshAt
        ) {
            return;
        }
        previousReviewRefreshRef.current = refreshAt;
        loadQueue({refresh: true});
    }, [isDetailPage, loadQueue, route?.params?.reviewRefreshAt]);

    useEffect(() => {
        return () => {
            queueControllerRef.current?.abort();
            detailControllerRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (status === 'signedOut' || status === 'expired') {
            navigation.goBack();
        }
    }, [navigation, status]);

    const handleReviewablePress = useCallback(async item => {
        const reviewableId = item?.id;
        if (reviewableId == null) {
            return;
        }
        if (!isDetailPage) {
            navigation.navigate('HarborReviewDetail', {
                reviewableId,
                initialReviewable: item,
            });
            return;
        }
        setSelectedId(reviewableId);
        setSelectedReviewable(item);
        setIsDetailLoading(true);
        detailControllerRef.current?.abort();
        const controller = new AbortController();
        detailControllerRef.current = controller;
        try {
            const response = await fetchHarborReviewable(reviewableId, {
                signal: controller.signal,
            });
            if (controller.signal.aborted) {
                return;
            }
            setSelectedReviewable(unwrapReviewable(response));
        } catch (error) {
            if (controller.signal.aborted) {
                return;
            }
            if (isHarborReviewForbidden(error)) {
                setIsForbidden(true);
                setSelectedId(null);
                setSelectedReviewable(null);
                Toast.show(t('你目前沒有審核權限'));
                navigation.goBack();
            } else if (isHarborReviewError(error, 'not_found')) {
                setSelectedId(null);
                setSelectedReviewable(null);
                Toast.show(t('此案件已完成或不再存在'));
                navigation.popTo(
                    'HarborReviewQueue',
                    {reviewRefreshAt: Date.now()},
                    {merge: true},
                );
            } else {
                setSelectedId(null);
                setSelectedReviewable(null);
                Toast.show(t('無法載入此審核案件，請稍後再試。'));
                navigation.goBack();
            }
        } finally {
            if (detailControllerRef.current === controller) {
                detailControllerRef.current = null;
                setIsDetailLoading(false);
            }
        }
    }, [isDetailPage, navigation, t]);

    useEffect(() => {
        if (
            !isDetailPage ||
            status !== 'signedIn' ||
            routeReviewableId == null ||
            detailLoadStartedRef.current
        ) {
            return;
        }
        detailLoadStartedRef.current = true;
        handleReviewablePress(
            initialReviewable || {id: routeReviewableId},
        );
    }, [
        handleReviewablePress,
        initialReviewable,
        isDetailPage,
        routeReviewableId,
        status,
    ]);

    const submitAction = useCallback(
        async (action, params = {}) => {
            if (
                !selectedReviewable ||
                selectedId == null ||
                activeActionId != null ||
                !actionCanBeSubmitted(action)
            ) {
                return;
            }
            const version = selectedReviewable.version;
            if (version == null) {
                Toast.show(t('案件資料不完整，請重新載入後再試。'));
                return;
            }
            setActiveActionId(action.actionId);
            try {
                const result = await performHarborReviewAction({
                    reviewableId: selectedId,
                    actionId: String(action.actionId),
                    version,
                    params,
                });
                const removedIds = new Set([
                    selectedId,
                    ...(Array.isArray(result?.remove_reviewable_ids)
                        ? result.remove_reviewable_ids
                        : []),
                    ...(Array.isArray(result?.affected_reviewable_ids)
                        ? result.affected_reviewable_ids
                        : []),
                ]);
                setReviewables(current =>
                    current.filter(item => !removedIds.has(item?.id)),
                );
                if (Number.isFinite(Number(result?.reviewable_count))) {
                    patchReviewCount(
                        result.reviewable_count,
                        user?.username,
                    );
                } else {
                    refreshReviewCount().catch(() => {});
                }
                Toast.show(action.completedMessage || t('審核操作已完成'));
                navigation.popTo(
                    'HarborReviewQueue',
                    {reviewRefreshAt: Date.now()},
                    {merge: true},
                );
            } catch (error) {
                if (isHarborReviewConflict(error)) {
                    setReviewables(current =>
                        current.filter(item => item?.id !== selectedId),
                    );
                    Toast.show(t('此案件已由其他版主處理'));
                    refreshReviewCount().catch(() => {});
                    navigation.popTo(
                        'HarborReviewQueue',
                        {reviewRefreshAt: Date.now()},
                        {merge: true},
                    );
                } else if (isHarborReviewForbidden(error)) {
                    setIsForbidden(true);
                    Toast.show(t('你目前沒有審核權限'));
                    navigation.goBack();
                } else {
                    Toast.show(t('審核操作失敗，請稍後再試。'));
                }
            } finally {
                setActiveActionId(null);
            }
        },
        [
            activeActionId,
            navigation,
            patchReviewCount,
            refreshReviewCount,
            selectedId,
            selectedReviewable,
            t,
            user?.username,
        ],
    );

    const requestActionSubmission = useCallback(
        (action, params = {}) => {
            const label = getActionLabel(action) || t('此操作');
            const shouldConfirm =
                isDestructiveAction(action) ||
                Boolean(action?.confirmDestructive || action?.confirm_destructive) ||
                Boolean(action?.confirmMessage || action?.confirm_message);
            if (!shouldConfirm) {
                submitAction(action, params);
                return;
            }
            Alert.alert(
                t('確認審核操作'),
                action.confirmMessage ||
                    action.confirm_message ||
                    t('確定要「{{action}}」嗎？', {action: label}),
                [
                    {
                        text: t('取消'),
                        style: 'cancel',
                        onPress: () => trigger(),
                    },
                    {
                        text: label,
                        style: 'destructive',
                        onPress: () => {
                            trigger();
                            submitAction(action, params);
                        },
                    },
                ],
            );
        },
        [submitAction, t],
    );

    const handleActionPress = useCallback(
        action => {
            trigger();
            if (!actionCanBeSubmitted(action)) {
                Toast.show(t('此操作需要額外資料，請改用 Harbor 網頁版處理。'));
                return;
            }
            if (actionRequiresRejectReason(action)) {
                setReasonAction(action);
                setRejectReason('');
                return;
            }
            requestActionSubmission(action);
        },
        [requestActionSubmission, t],
    );

    const submitRejectReason = useCallback(() => {
        const reason = rejectReason.trim();
        if (!reason || !reasonAction) {
            Toast.show(t('請填寫拒絕原因'));
            return;
        }
        trigger();
        setReasonAction(null);
        setRejectReason('');
        requestActionSubmission(reasonAction, {reject_reason: reason});
    }, [reasonAction, rejectReason, requestActionSubmission, t]);
    const cancelRejectReason = useCallback(() => {
        if (activeActionId != null) {
            return;
        }
        trigger();
        setReasonAction(null);
        setRejectReason('');
    }, [activeActionId]);

    const detailActions = useMemo(
        () => getReviewableActions(selectedReviewable),
        [selectedReviewable],
    );
    const detailCooked = getReviewableCooked(selectedReviewable);
    const detailImageUrls = useMemo(
        () => extractPostImages(detailCooked),
        [detailCooked],
    );
    const detailContentWidth = Math.max(width - scale(54), 0);
    const handleOpenImage = useCallback(index => {
        imageViewerRef.current?.handleOpenImage(index);
    }, []);
    const handlePressLink = useCallback(url => {
        openLink({URL: url, mode: 'fullScreen'});
    }, []);
    const contentContainerStyle = useMemo(
        () => ({
            paddingTop:
                (isLiquidGlassSupported ? headerHeight : 0) +
                verticalScale(10),
            paddingBottom: verticalScale(30),
        }),
        [headerHeight],
    );
    const detailListContentStyle = useMemo(
        () => ({
            padding: scale(14),
            paddingTop:
                (isLiquidGlassSupported ? headerHeight : scale(14)) +
                verticalScale(10),
            paddingBottom: verticalScale(38),
        }),
        [headerHeight],
    );

    const renderQueueItem = useCallback(
        ({item}) => <ReviewQueueRow item={item} onPress={handleReviewablePress} />,
        [handleReviewablePress],
    );
    const renderAction = useCallback(
        ({item: action}) => {
            const isSubmitting = activeActionId === action.actionId;
            const isAllowed = actionCanBeSubmitted(action);
            const isDestructive = isDestructiveAction(action);
            return (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{disabled: isSubmitting || activeActionId != null}}
                    disabled={isSubmitting || activeActionId != null}
                    onPress={() => handleActionPress(action)}
                    style={({pressed}) => [
                        styles.actionRow,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary15
                                : theme.white,
                            borderColor: isDestructive
                                ? theme.tonal.unread30
                                : theme.themeColorUltraLight,
                            opacity: activeActionId != null && !isSubmitting ? 0.55 : 1,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        color={isDestructive ? theme.unread : theme.themeColor}
                        name={getActionIcon(action)}
                        size={scale(21)}
                    />
                    <View style={styles.actionText}>
                        <Text style={[styles.actionLabel, {color: theme.black.main}]}>
                            {getActionLabel(action) || t('審核操作')}
                        </Text>
                        {getActionDescription(action) ? (
                            <Text
                                numberOfLines={2}
                                style={[styles.actionDescription, {color: theme.black.third}]}>
                                {getActionDescription(action)}
                            </Text>
                        ) : null}
                        {!isAllowed ? (
                            <Text style={[styles.actionHint, {color: theme.black.third}]}>
                                {t('需要額外資料，請改用 Harbor 網頁版處理。')}
                            </Text>
                        ) : null}
                    </View>
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.themeColor} size="small" />
                    ) : (
                        <MaterialCommunityIcons
                            color={theme.black.third}
                            name="chevron-right"
                            size={scale(20)}
                        />
                    )}
                </Pressable>
            );
        },
        [activeActionId, handleActionPress, t, theme],
    );

    const keyExtractor = useCallback(
        item => `harbor-review-${item?.id}`,
        [],
    );
    const actionKeyExtractor = useCallback(
        item => `harbor-review-action-${item?.actionId || item?.id}`,
        [],
    );

    if (status !== 'signedIn') {
        return <View style={[styles.page, {backgroundColor: theme.bg_color}]} />;
    }

    if (isDetailPage) {
        return (
            <View style={[styles.page, {backgroundColor: theme.bg_color}]}>
                <FlashList
                    contentContainerStyle={detailListContentStyle}
                    contentInsetAdjustmentBehavior={
                        isLiquidGlassSupported ? 'never' : 'automatic'
                    }
                    data={detailActions}
                    keyExtractor={actionKeyExtractor}
                    ListEmptyComponent={
                        !isDetailLoading ? (
                            <Text style={[styles.noActions, {color: theme.black.third}]}>
                                {t('此案件目前沒有可執行的操作。')}
                            </Text>
                        ) : null
                    }
                    ListHeaderComponent={
                        <ReviewDetailHeader
                            contentWidth={detailContentWidth}
                            imageUrls={detailImageUrls}
                            isLoading={isDetailLoading}
                            onOpenImage={handleOpenImage}
                            onPressLink={handlePressLink}
                            reviewable={selectedReviewable}
                        />
                    }
                    renderItem={renderAction}
                    scrollIndicatorInsets={
                        isLiquidGlassSupported ? {top: headerHeight} : undefined
                    }
                    showsVerticalScrollIndicator={false}
                />
                <ReviewReasonModal
                    action={reasonAction}
                    onCancel={cancelRejectReason}
                    onChangeReason={setRejectReason}
                    onSubmit={submitRejectReason}
                    reason={rejectReason}
                />
                <ARKImageView
                    ref={imageViewerRef}
                    imageUrls={detailImageUrls}
                />
            </View>
        );
    }

    if (isLoading && reviewables.length === 0) {
        return (
            <View style={[styles.page, {backgroundColor: theme.bg_color}]}>
                <View style={styles.loadingState}>
                    <ActivityIndicator color={theme.themeColor} size="small" />
                    <Text style={[styles.loadingText, {color: theme.black.third}]}>
                        {t('正在載入待審案件…')}
                    </Text>
                </View>
            </View>
        );
    }

    if (isForbidden) {
        return (
            <View style={[styles.page, {backgroundColor: theme.bg_color}]}>
                <HarborFullState
                    icon="shield-lock-outline"
                    title={t('沒有審核權限')}
                    description={t('只有 Harbor 版主與管理員可以查看待審案件。')}
                    actionLabel={t('重新檢查')}
                    onAction={() => loadQueue({refresh: true})}
                />
            </View>
        );
    }

    return (
        <View style={[styles.page, {backgroundColor: theme.bg_color}]}>
            <FlashList
                contentContainerStyle={contentContainerStyle}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                data={reviewables}
                keyExtractor={keyExtractor}
                ListHeaderComponent={
                    loadError && reviewables.length > 0 ? (
                        <HarborInlineRetry
                            actionLabel={t('重試')}
                            message={t('更新失敗，已保留上次載入的案件')}
                            onRetry={() => loadQueue({refresh: true})}
                        />
                    ) : null
                }
                ListEmptyComponent={
                    loadError ? (
                        <HarborFullState
                            icon="cloud-alert-outline"
                            title={t('待審案件載入失敗')}
                            description={t('請檢查網絡後再試。')}
                            actionLabel={t('重新載入')}
                            onAction={() => loadQueue()}
                        />
                    ) : (
                        <HarborFullState
                            icon="shield-check-outline"
                            title={t('暫時沒有待審案件')}
                            description={t('新的案件會顯示在這裡。')}
                        />
                    )
                }
                onEndReached={() => loadQueue({more: true})}
                onEndReachedThreshold={0.45}
                refreshControl={
                    <RefreshControl
                        colors={[theme.themeColor]}
                        onRefresh={() => {
                            trigger();
                            loadQueue({refresh: true});
                        }}
                        refreshing={isRefreshing}
                        tintColor={theme.themeColor}
                    />
                }
                renderItem={renderQueueItem}
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    isLoadingMore ? (
                        <ActivityIndicator
                            color={theme.themeColor}
                            size="small"
                            style={styles.loadMore}
                        />
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: verticalScale(10),
        fontSize: scale(14),
    },
    queueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(15),
        marginHorizontal: scale(14),
        marginBottom: verticalScale(9),
        padding: scale(13),
    },
    queueTypeIcon: {
        alignItems: 'center',
        borderRadius: scale(18),
        height: scale(36),
        justifyContent: 'center',
        marginRight: scale(10),
        width: scale(36),
    },
    queueBody: {
        flex: 1,
        minWidth: 0,
    },
    queueTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    queueTitle: {
        flex: 1,
        fontSize: scale(15),
        fontWeight: '600',
    },
    queueScore: {
        fontSize: scale(12),
        fontWeight: '700',
        marginLeft: scale(7),
    },
    queuePreview: {
        fontSize: scale(13),
        lineHeight: scale(19),
        marginTop: verticalScale(4),
    },
    queueFooter: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: scale(8),
        marginTop: verticalScale(7),
    },
    queueMeta: {
        fontSize: scale(11),
        maxWidth: '58%',
    },
    loadMore: {
        marginVertical: verticalScale(14),
    },
    detailHeader: {
        paddingBottom: verticalScale(14),
    },
    detailLoading: {
        alignItems: 'center',
        paddingVertical: verticalScale(35),
    },
    detailLoadingText: {
        fontSize: scale(14),
        marginTop: verticalScale(10),
    },
    detailType: {
        alignSelf: 'flex-start',
        alignItems: 'center',
        borderRadius: scale(13),
        flexDirection: 'row',
        gap: scale(5),
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(5),
    },
    detailTypeText: {
        fontSize: scale(12),
        fontWeight: '600',
    },
    detailTitle: {
        fontSize: scale(21),
        fontWeight: '700',
        lineHeight: scale(29),
        marginTop: verticalScale(10),
    },
    detailAuthor: {
        fontSize: scale(13),
        marginTop: verticalScale(7),
    },
    detailContent: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        marginTop: verticalScale(13),
        padding: scale(13),
    },
    detailContentText: {
        fontSize: scale(15),
        lineHeight: scale(23),
    },
    detailEmptyContent: {
        fontSize: scale(14),
        lineHeight: scale(21),
        marginTop: verticalScale(13),
    },
    contextCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        marginTop: verticalScale(12),
        padding: scale(12),
    },
    contextTitle: {
        fontSize: scale(14),
        fontWeight: '600',
        marginBottom: verticalScale(6),
    },
    contextText: {
        fontSize: scale(13),
        lineHeight: scale(19),
        marginTop: verticalScale(3),
    },
    actionRow: {
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        flexDirection: 'row',
        marginBottom: verticalScale(8),
        padding: scale(13),
    },
    actionText: {
        flex: 1,
        marginHorizontal: scale(10),
    },
    actionLabel: {
        fontSize: scale(15),
        fontWeight: '600',
    },
    actionDescription: {
        fontSize: scale(12),
        lineHeight: scale(18),
        marginTop: verticalScale(3),
    },
    actionHint: {
        fontSize: scale(12),
        lineHeight: scale(18),
        marginTop: verticalScale(4),
    },
    noActions: {
        fontSize: scale(14),
        paddingVertical: verticalScale(14),
        textAlign: 'center',
    },
    reasonModalPage: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: scale(20),
    },
    reasonModalBackdrop: {
        opacity: 0.42,
    },
    reasonModalCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(17),
        padding: scale(17),
        width: '100%',
    },
    reasonModalTitle: {
        fontSize: scale(18),
        fontWeight: '700',
    },
    reasonModalDescription: {
        fontSize: scale(13),
        lineHeight: scale(19),
        marginTop: verticalScale(6),
    },
    reasonInput: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        fontSize: scale(15),
        lineHeight: scale(21),
        marginTop: verticalScale(13),
        minHeight: verticalScale(96),
        padding: scale(11),
    },
    reasonModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: verticalScale(13),
    },
    reasonCancelButton: {
        alignItems: 'center',
        borderRadius: scale(10),
        justifyContent: 'center',
        minWidth: scale(68),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
    },
    reasonCancelText: {
        fontSize: scale(14),
        fontWeight: '600',
    },
    reasonSubmitButton: {
        alignItems: 'center',
        borderRadius: scale(10),
        justifyContent: 'center',
        marginLeft: scale(8),
        minWidth: scale(76),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
    },
    reasonSubmitText: {
        fontSize: scale(14),
        fontWeight: '600',
    },
});

export default HarborReviewQueuePage;
