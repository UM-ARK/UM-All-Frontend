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
                parse: {eventId: String},
            },
        },
    },
};
