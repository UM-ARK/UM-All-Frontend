// 文件操作相關
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFetchBlob from 'rn-fetch-blob';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Toast from "react-native-simple-toast";

async function hasAndroidPermission() {
    const getCheckPermissionPromise = () => {
        if (Platform.Version >= 33) {
            return Promise.all([
                PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES),
                PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO),
            ]).then(
                ([hasReadMediaImagesPermission, hasReadMediaVideoPermission]) =>
                    hasReadMediaImagesPermission && hasReadMediaVideoPermission,
            );
        } else {
            return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
    };

    const hasPermission = await getCheckPermissionPromise();
    if (hasPermission) {
        return true;
    }
    const getRequestPermissionPromise = () => {
        if (Platform.Version >= 33) {
            return PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
            ]).then(
                (statuses) =>
                    statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
                    PermissionsAndroid.RESULTS.GRANTED &&
                    statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] ===
                    PermissionsAndroid.RESULTS.GRANTED,
            );
        } else {
            return PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE).then((status) => status === PermissionsAndroid.RESULTS.GRANTED);
        }
    };

    return await getRequestPermissionPromise();
}

// 安卓端請求圖片儲存權限
export async function getPermissionAndroid() {
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
                title: '圖片下載權限',
                message: '需要圖片儲存權限以保存圖片到您的設備',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
        }
        Alert.alert(
            'Save remote Image',
            'Grant Me Permission to save Image',
            [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
            { cancelable: false },
        );
    } catch (err) {
        Alert.alert(
            'Save remote Image',
            'Failed to save Image: ' + err.message,
            [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
            { cancelable: false },
        );
    }
}

// 儲存圖片API，需傳入圖片URL
export async function handleImageDownload(IMAGE_URL) {
    // 安卓平台需要請求儲存權限
    if (Platform.OS === 'android') {
        const granted = await getPermissionAndroid() && await hasAndroidPermission();
        if (!granted) {
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
        const granted = await getPermissionAndroid() && await hasAndroidPermission();
        if (!granted) {
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
