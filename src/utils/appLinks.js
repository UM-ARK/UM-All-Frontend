export const APP_LINKING = {
    prefixes: ['https://umall.one/app', 'one.umall://app'],
    config: {
        initialRouteName: 'Tabbar',
        screens: {
            Tabbar: '',
            LocalCourse: 'course/:courseCode',
            ClubDetail: 'club/:clubNum',
            EventDetail: 'event/:eventId',
            HarborTopicDetail: {
                path: 'harbor/topic/:topicId/:postNumber?',
                parse: {
                    topicId: Number,
                    postNumber: Number,
                },
            },
            TeamScheduleDetail: {
                path: 'team/:eventId',
                parse: {
                    eventId: String,
                    invite: String,
                },
            },
        },
    },
};

const decodeAppLinkSegment = value => {
    try {
        return decodeURIComponent(value);
    } catch {
        return '';
    }
};

export const parseArkAppLink = value => {
    if (typeof value !== 'string' || !value.trim()) {
        return null;
    }

    let url;
    try {
        url = new URL(value.trim());
    } catch {
        return null;
    }

    let path;
    if (url.protocol === 'https:' && url.hostname === 'umall.one') {
        if (!url.pathname.startsWith('/app/')) {
            return null;
        }
        path = url.pathname.slice('/app/'.length);
    } else if (url.protocol === 'one.umall:' && url.hostname === 'app') {
        path = url.pathname.replace(/^\//, '');
    } else {
        return null;
    }

    const segments = path.split('/').map(decodeAppLinkSegment);
    if (segments.some(segment => !segment)) {
        return null;
    }

    if (segments[0] === 'course' && segments.length === 2) {
        return {
            type: 'course',
            routeName: 'LocalCourse',
            params: {courseCode: segments[1]},
            url: value.trim(),
        };
    }
    if (segments[0] === 'club' && segments.length === 2) {
        return {
            type: 'club',
            routeName: 'ClubDetail',
            params: {clubNum: segments[1]},
            url: value.trim(),
        };
    }
    if (segments[0] === 'event' && segments.length === 2) {
        return {
            type: 'event',
            routeName: 'EventDetail',
            params: {eventId: segments[1]},
            url: value.trim(),
        };
    }
    if (segments[0] === 'harbor' && segments[1] === 'topic') {
        const topicId = Number(segments[2]);
        const postNumber = segments[3] == null
            ? null
            : Number(segments[3]);
        if (
            segments.length < 3 ||
            segments.length > 4 ||
            !Number.isInteger(topicId) ||
            topicId <= 0 ||
            (postNumber != null &&
                (!Number.isInteger(postNumber) || postNumber <= 0))
        ) {
            return null;
        }
        return {
            type: 'harborTopic',
            routeName: 'HarborTopicDetail',
            params: {
                topicId,
                ...(postNumber == null ? {} : {postNumber}),
            },
            url: value.trim(),
        };
    }
    if (segments[0] === 'team' && segments.length === 2) {
        const invite = url.searchParams.get('invite');
        return {
            type: 'team',
            routeName: 'TeamScheduleDetail',
            params: {
                eventId: segments[1],
                ...(invite ? {invite} : {}),
            },
            url: value.trim(),
        };
    }

    return null;
};
