// 文件操作相關
import { Platform, Alert, Linking, } from 'react-native';
import { checkMultiple, PERMISSIONS, requestMultiple, } from 'react-native-permissions';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFetchBlob from 'rn-fetch-blob';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from "react-native-simple-toast";

function detectVersion() {
    let verNum = Platform.Version;
    let permissionArr = [];
    if (verNum <= 32) {
        permissionArr.push(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
    } else if (verNum == 33) {
        permissionArr.push(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        permissionArr.push(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
    } else if (verNum >= 34) {
        permissionArr.push(PERMISSIONS.ANDROID.READ_MEDIA_VISUAL_USER_SELECTED);
    }
    return permissionArr;
}

// 儲存圖片API，需傳入圖片URL
export async function handleImageDownload(IMAGE_URL) {
    // 安卓平台需要請求儲存權限
    if (Platform.OS === 'android') {
        const permissionArr = detectVersion();
        const granted = await requestMultiple(permissionArr).then((statuses) => {
            let ok = true;
            permissionArr.map(i => {
                ok = (ok && statuses[i] == 'granted');
            });
            return ok;
        })

        // 權限請求失敗
        if (!granted) {
            Alert.alert(
                '保存圖片失敗 / Save remote Image Failed',
                '請前往應用設置-權限管理，手動賦予相機、圖片等權限！\nGrant Me Permission to save Image!\n如一直出現此錯誤，請在設置中清除全部資料 或 重裝APP再試！',
                [{
                    text: 'GO NOW', onPress: () => {
                        // 打開應用設置
                        Linking.openSettings();
                    }
                },
                { text: 'NO', }],
                { cancelable: false },
            );
            return;
        }
    }

    // 保存圖片
    RNFetchBlob.config({
        fileCache: true,
        appendExt: 'png',
    })
        .fetch('GET', IMAGE_URL)
        .then(res => {
            CameraRoll.save(res.data, { type: 'photo' })
                .then(res => {
                    Toast.show('保存成功 😊 ~')
                })
                .catch(err => console.error(err));
        })
        .catch(err => {
            console.error(err);
            Alert.alert(err);
        });
}

// 選擇圖片API
export async function handleImageSelect() {
    // 安卓平台需要請求儲存權限
    if (Platform.OS === 'android') {
        const permissionArr = detectVersion();
        const granted = await requestMultiple(permissionArr).then((statuses) => {
            let ok = true;
            permissionArr.map(i => {
                ok = (ok && statuses[i] == 'granted');
            });
            return ok;
        }).catch(err => { console.log('err', err); })

        if (!granted) {
            Alert.alert(
                '選擇圖片失敗 / Select Image Failed',
                '請前往應用設置-權限管理，手動賦予相機、圖片等權限！\nGrant Me Permission to save Image!\n如一直出現此錯誤，請在設置中清除全部資料 或 重裝APP再試！',
                [{
                    text: 'GO NOW', onPress: () => {
                        // 打開應用設置
                        Linking.openSettings();
                    }
                },
                { text: 'NO', }],
                { cancelable: false },
            );
            return;
        }
    }

    let options = {
        mediaType: 'photo',
        // 一次選擇一張
        quality: 1,
        // includeBase64: true,
    };

    return await launchImageLibrary(options);
}
