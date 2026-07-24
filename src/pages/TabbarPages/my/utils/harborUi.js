export const activityMeta = {
    activity: {
        icon: 'pulse-outline',
        label: '活動',
    },
    bookmark: {
        icon: 'bookmark-outline',
        label: '收藏了',
    },
    like: {
        icon: 'heart-outline',
        label: '讚好了',
    },
    reply: {
        icon: 'arrow-undo-outline',
        label: '回覆了',
    },
    topic: {
        icon: 'chatbox-ellipses-outline',
        label: '建立話題',
    },
};

export function formatRelativeTime(value, language = 'tc', now = Date.now()) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const seconds = Math.round((date.getTime() - now) / 1000);
    const units = [
        ['year', 60 * 60 * 24 * 365],
        ['month', 60 * 60 * 24 * 30],
        ['day', 60 * 60 * 24],
        ['hour', 60 * 60],
        ['minute', 60],
    ];
    const isEnglish = language === 'en';

    if (Math.abs(seconds) < 60) {
        return isEnglish ? 'just now' : '剛剛';
    }

    for (const [unit, duration] of units) {
        if (Math.abs(seconds) >= duration) {
            const count = Math.max(1, Math.round(Math.abs(seconds) / duration));
            if (isEnglish) {
                const unitLabel = `${unit}${count === 1 ? '' : 's'}`;
                return seconds > 0
                    ? `in ${count} ${unitLabel}`
                    : `${count} ${unitLabel} ago`;
            }

            const unitLabels = {
                year: '年',
                month: '個月',
                day: '日',
                hour: '小時',
                minute: '分鐘',
            };
            return `${count} ${unitLabels[unit]}${seconds > 0 ? '後' : '前'}`;
        }
    }

    return isEnglish ? 'just now' : '剛剛';
}

export function formatJoinedAt(value, language = 'tc') {
    if (!/^\d{4}-\d{2}$/.test(value || '')) {
        return '';
    }

    const [year, month] = value.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(language === 'en' ? 'en' : 'zh-HK', {
        year: 'numeric',
        month: 'short',
    }).format(date);
}
