import {Platform} from 'react-native';

import lodash from 'lodash';

import {openLink} from '../../../../utils/browser';
import {logToFirebase} from '../../../../utils/firebaseAnalytics';
import {
    ARK_WIKI_SEARCH,
    OFFICIAL_COURSE_SEARCH,
} from '../../../../utils/pathMap';
import {getCurrentUmehHost} from '../../../../utils/umehHost';

/** 建立課程卡片共用的查詢選項。 */
export function getCourseInfoMenuActions({t, themeColor, secondaryColor}) {
    return [
        {
            id: 'wiki',
            title: 'Wiki',
            image: Platform.select({
                ios: 'book',
                android: 'ic_menu_agenda',
            }),
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: 'harbor-discuss',
            title: t('討論', {ns: 'catalog'}),
            image: Platform.select({
                ios: 'bubble.left.and.bubble.right',
                android: 'ic_btn_speak_now',
            }),
            imageColor: secondaryColor,
            titleColor: secondaryColor,
        },
        {
            id: 'what2reg',
            title: t('評價', {ns: 'catalog'}),
            image: Platform.select({
                ios: 'star',
                android: 'btn_star_big_on',
            }),
            imageColor: secondaryColor,
            titleColor: secondaryColor,
        },
        {
            id: 'official',
            title: t('官方', {ns: 'catalog'}),
            image: Platform.select({
                ios: 'graduationcap',
                android: 'ic_menu_info_details',
            }),
            imageColor: secondaryColor,
            titleColor: secondaryColor,
        },
        {
            id: 'section',
            title: t('Section / 老師', {ns: 'catalog'}),
            image: Platform.select({
                ios: 'list.bullet',
                android: 'ic_menu_sort_by_size',
            }),
            imageColor: secondaryColor,
            titleColor: secondaryColor,
        },
    ];
}

/** 處理課程卡片共用的查詢選項。 */
export function handleCourseInfoMenuAction({actionId, course, navigation}) {
    const courseCode = course['Course Code'];
    const profName = course['Teacher Information'];

    switch (actionId) {
        case 'wiki': {
            let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
            if (profName) {
                URL = ARK_WIKI_SEARCH + encodeURIComponent(profName);
                logToFirebase('checkCourse', {
                    courseCode,
                    profName,
                    action: 'ark-wiki',
                });
            } else {
                logToFirebase('checkCourse', {
                    courseCode,
                    action: 'ark-wiki',
                });
            }
            openLink(URL);
            return true;
        }
        case 'harbor-discuss':
            logToFirebase('checkCourse', {
                courseCode,
                action: 'harbor-discuss',
            });
            navigation.navigate('HarborSearch', {query: courseCode});
            return true;
        case 'what2reg': {
            const URI =
                getCurrentUmehHost() +
                '/reviews/' +
                encodeURIComponent(courseCode) +
                '/' +
                encodeURIComponent(lodash.deburr(profName || ''));
            openLink(URI);
            return true;
        }
        case 'official':
            openLink(OFFICIAL_COURSE_SEARCH + courseCode);
            return true;
        case 'section':
            navigation.navigate('LocalCourse', courseCode);
            return true;
        default:
            return false;
    }
}
