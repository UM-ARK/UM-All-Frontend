import moment from 'moment';
import { getLocalStorage, setLocalStorage, logAllStorage } from './storageKits';
import offerCourses from '../static/UMCourses/offerCourses';
import coursePlan from '../static/UMCourses/coursePlan';
import coursePlanTime from '../static/UMCourses/coursePlanTime';


// TODO: 只有App.js調用該函數
// 檢查本地課程版本，若有更新則覆蓋本地緩存
// APP包更新時，會覆蓋本地緩存
// 其餘更新從服務器獲取，選課頁手動更新
export async function checkLocalCourseVersion() {
    const storageOfferCourses = await getLocalStorage('offer_courses');
    if (storageOfferCourses) {
        if (moment(storageOfferCourses.updateTime).isBefore(moment(offerCourses.updateTime))) {
            // 新APP需覆蓋舊版APP的本地緩存
            const saveResult = await setLocalStorage('offer_courses', offerCourses);
            if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
        }
    } else {
        const saveResult = await setLocalStorage('offer_courses', offerCourses);
        if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
    }

    const storageCoursePlan = await getLocalStorage('course_plan');
    if (storageCoursePlan) {
        if (moment(storageCoursePlan.updateTime).isBefore(moment(coursePlan.updateTime))) {
            // 新APP需覆蓋舊版APP的本地緩存
            // console.log('修改本地緩存日期為', coursePlan.updateTime);
            let saveResult = await setLocalStorage('course_plan', coursePlan);
            if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
            saveResult = await setLocalStorage('course_plan_time', coursePlanTime);
            if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
        }
    } else {
        const saveResult = await setLocalStorage('course_plan', coursePlan);
        if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
    }
}