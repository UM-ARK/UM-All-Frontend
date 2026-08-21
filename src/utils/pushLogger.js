const PUSH_LOG_PREFIX = '[Push]';

export function getSafeNotificationLogDetails(notification) {
    const data = notification?.request?.content?.data;
    const notificationType = Number(data?.notificationType);
    const hasPositiveInteger = value => {
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) && parsed > 0;
    };
    return {
        dataType: typeof data?.type === 'string' ? data.type : 'unknown',
        notificationType:
            Number.isSafeInteger(notificationType) && notificationType > 0
                ? notificationType
                : null,
        hasTopicId: hasPositiveInteger(data?.topicId),
        hasPostNumber: hasPositiveInteger(data?.postNumber),
        hasChannelId: hasPositiveInteger(data?.channelId),
        hasMessageId: hasPositiveInteger(data?.messageId),
    };
}

export function logPushEvent(event, details) {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return;
    }
    if (details === undefined) {
        console.log(`${PUSH_LOG_PREFIX} ${event}`);
        return;
    }
    console.log(`${PUSH_LOG_PREFIX} ${event}`, details);
}

export function logPushError(event, error, details = {}) {
    logPushEvent(event, {
        ...details,
        errorCode: error?.code ?? null,
        httpStatus: error?.status ?? error?.response?.status ?? null,
    });
}
