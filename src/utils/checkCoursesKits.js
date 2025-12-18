import moment from 'moment';
import axios from "axios";
import { Alert } from 'react-native';

import { getLocalStorage, setLocalStorage, logAllStorage } from './storageKits';
import { COURSE_API_CF_WORKERS } from "./pathMap";
import offerCourses from '../static/UMCourses/offerCourses';
import coursePlan from '../static/UMCourses/coursePlan';
import coursePlanTime from '../static/UMCourses/coursePlanTime';
import sourceCourseVersion from '../static/UMCourses/courseVersion';


/**
 * 檢查Cloudflare Workers的version API
 */
export async function checkCloudCourseVersion() {
    try {
        console.log('檢查雲端版本');
        const res = await axios.get(`${COURSE_API_CF_WORKERS}/version`);
        if (res.status === 200) {
            const { data } = res;
            /* Example Data Return: 
                {
                    "pre": { "updateTime": "2025-10-21", "academicYear": "25/26", "sem": "1" },
                    "adddrop": { "updateTime": "2025-10-21", "academicYear": "25/26", "sem": "1" }
                }
            */
            await compareLocalCourseVersion(data);
        }
    } catch (error) {
        Alert.alert('', `Check course version error!\nPlease check your network!\nOr it's caused by the developer...`, null, { cancelable: true })
    }
}

/**
 * 對比本地課程版本，若有更新則覆蓋本地緩存
 * 
 * @param {Object} versionInfo -  Version API返回的雲端版本對象
 */
export async function compareLocalCourseVersion(versionInfo) {
    let localCourseVersion = await getLocalStorage('course_version');
    // 如果本地沒有緩存則用source替代
    if (!localCourseVersion) { localCourseVersion = sourceCourseVersion; }

    let needSave = false;
    let newVersion = { ...localCourseVersion };

    if (needUpdate(localCourseVersion.pre, versionInfo.pre)) {
        needSave = true;
        newVersion.pre = versionInfo.pre;
        const courseData = await requestCourseData('pre');
        await saveCourseDataToStorage('pre', courseData);
    }
    if (needUpdate(localCourseVersion.adddrop, versionInfo.adddrop)) {
        needSave = true;
        newVersion.adddrop = versionInfo.adddrop;
        const courseData = await requestCourseData('adddrop');
        await saveCourseDataToStorage('adddrop', courseData);
    }

    if (needSave) {
        const saveResult = await setLocalStorage('course_version', newVersion);
        if (saveResult !== 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
    }
}

/**
 * 比較target Object的updateTime是否比origin更新
 * 
 * @param {Object} origin - 現有課表版本對象，需有updateTime屬性
 * @param {Object} target - 待判斷的新課表版本對象，需有updateTime屬性
 * @returns 
 */
export function needUpdate(origin, target) {
    try {
        return moment(origin.updateTime).isBefore(moment(target.updateTime));
    } catch (error) {
        Alert.alert('', `needUpdate Function Error`, null, { cancelable: true })
    }
}

/**
 * 根據類型從 Cloudflare Workers 請求課程數據並返回
 * 
 * - 當 type 為 'pre' 時，僅請求一次 /pre 接口並保存課程數據。
 * - 當 type 為 'adddrop' 時，分別請求 /adddrop 和 /timetable 兩個接口，並將結果組合後保存。
 * 
 * @param {('pre'|'adddrop')} type - 請求的課程數據類型。
 * @returns {Object} - 需要返回的課程數據
 */
async function requestCourseData(type) {
    try {
        console.log('請求', type, '的CF數據');
        // type是pre只請求一次，是adddrop要請求兩次
        if (type === 'pre') {
            const res = await axios.get(COURSE_API_CF_WORKERS + '/pre');
            if (res.status === 200 && res.data) { return res.data; }
        } else if (type === 'adddrop') {
            const adddropRes = await axios.get(COURSE_API_CF_WORKERS + '/adddrop');
            const timetableRes = await axios.get(COURSE_API_CF_WORKERS + '/timetable');
            if (adddropRes.status === 200 && timetableRes.status === 200 && adddropRes.data && timetableRes.data) {
                return { adddrop: adddropRes.data, timetable: timetableRes.data };
            }
        }
    } catch (error) {
        Alert.alert('', `Request course data error!\nPlease check your network!\nOr it's caused by the developer...`, null, { cancelable: true })
        return null;
    }
}

/**
 * 保存課程數據到本地儲存
 * 
 * @param {('pre'|'adddrop')} type - 覆蓋 預選 或 adddrop數據 到緩存。
 * @param {('source'|Object)} courseData - 課程數據。'source' 表示用源文件覆蓋本地緩存；
 *   當 type 為 'pre' 時，courseData 應為課程對象；
 *   當 type 為 'adddrop' 時，courseData 應為 { adddrop: Object, timetable: Object } 結構。
 * @param {Object} [courseData.adddrop] - 僅當 type 為 'adddrop' 時，adddrop 課程對象。
 * @param {Object} [courseData.timetable] - 僅當 type 為 'adddrop' 時，課表對象。
 */
export async function saveCourseDataToStorage(type, courseData) {
    try {
        if (type === 'pre') {
            const saveResult = await setLocalStorage('offer_courses', courseData === 'source' ? offerCourses : courseData);
            if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
        }
        if (type === 'adddrop') {
            // 新APP需覆蓋舊版APP的本地緩存
            let saveResult = await setLocalStorage('course_plan', courseData === 'source' ? coursePlan : courseData.adddrop);
            if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
            saveResult = await setLocalStorage('course_plan_time', courseData === 'source' ? coursePlanTime : courseData.timetable);
            if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
        }
    } catch (error) {
        Alert.alert('', `Saving course data error...\nPlease contact developer.`, null, { cancelable: true })
    }
}


/**
 * 根據 type 返回對應的課程數據（預選或加退選+課表）。
 * 
 * - 若本地有緩存則優先返回緩存數據；
 * - 若無緩存則返回本地源文件數據。
 * 
 * @param {'pre'|'adddrop'} type - 課程數據類型，'pre' 為預選，'adddrop' 為加退選+課表。
 * @returns {Promise<Object>} 
 *   - 當 type 為 'pre' 時，返回預選課數據對象；
 *   - 當 type 為 'adddrop' 時，返回 { adddrop: Object, timetable: Object } 結構。
 */
export async function getCourseData(type) {
    try {
        if (type === 'pre') {
            // 先查本地緩存
            const localData = await getLocalStorage('offer_courses');
            if (localData) {
                return localData;
            } else {
                // 無緩存則用本地源文件
                return offerCourses;
            }
        } else if (type === 'adddrop') {
            // 查兩個緩存
            const adddropData = await getLocalStorage('course_plan');
            const timetableData = await getLocalStorage('course_plan_time');
            if (adddropData && timetableData) {
                return { adddrop: adddropData, timetable: timetableData };
            } else {
                // 有一個沒緩存則用本地源文件
                return { adddrop: coursePlan, timetable: coursePlanTime };
            }
        } else {
            throw new Error('Unknown type for getCourseData');
        }
    } catch (error) {
        Alert.alert('', `Get course data error...\nPlease contact developer.`, null, { cancelable: true });
        // fallback
        if (type === 'pre') {
            return offerCourses;
        } else if (type === 'adddrop') {
            return { adddrop: coursePlan, timetable: coursePlanTime };
        }
    }
}