// 文件操作相關
import { Platform, Alert, Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { File, Directory, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import Toast from "react-native-simple-toast";

/**
 * 檢查並請求相冊權限
 * @returns {Promise<boolean>} 是否有權限
 */
async function checkAndRequestMediaLibraryPermission() {
    const { status: existingStatus } = await MediaLibrary.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

/**
 * 顯示權限被拒絕的提示框
 * @param {string} title - 標題
 * @param {string} message - 消息內容
 */
function showPermissionDeniedAlert(title, message) {
    Alert.alert(
        title,
        message,
        [{
            text: 'GO NOW', onPress: () => {
                Linking.openSettings();
            }
        },
        { text: 'NO' }],
        { cancelable: false },
    );
}

// 儲存圖片API，需傳入圖片URL
export async function handleImageDownload(IMAGE_URL) {
    // 檢查權限
    const hasPermission = await checkAndRequestMediaLibraryPermission();

    if (!hasPermission) {
        showPermissionDeniedAlert(
            '保存圖片失敗 / Save remote Image Failed',
            '請前往應用設置-權限管理，手動賦予相機、圖片等權限！\nGrant Me Permission to save Image!\n如一直出現此錯誤，請在設置中清除全部資料 或 重裝APP再試！'
        );
        return;
    }

    try {
        // 下載文件到緩存目錄
        const fileName = `temp_image_${Date.now()}.png`;
        const cacheDir = new Directory(Paths.cache);

        // 使用新的 File API 下載文件
        const downloadedFile = await File.downloadFileAsync(IMAGE_URL, cacheDir);

        // 重命名文件為我們想要的文件名
        const targetFile = new File(Paths.cache, fileName);
        await downloadedFile.move(targetFile);

        // 保存到相冊
        await MediaLibrary.saveToLibraryAsync(targetFile.uri);
        Toast.show('保存成功 😊 ~');

        // 清理緩存文件
        try {
            if (targetFile.exists) {
                await targetFile.delete();
            }
        } catch (cleanupError) {
            // 忽略清理錯誤
            console.log('Cache cleanup error (non-critical):', cleanupError.message);
        }
    } catch (error) {
        console.error('Image download error:', error);
        Alert.alert(
            '保存失敗',
            error.message || '圖片保存失敗，請檢查網絡連接後重試。'
        );
    }
}

// 選擇圖片API
export async function handleImageSelect() {
    // 檢查權限
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        showPermissionDeniedAlert(
            '選擇圖片失敗 / Select Image Failed',
            '請前往應用設置-權限管理，手動賦予相機、圖片等權限！\nGrant Me Permission to save Image!\n如一直出現此錯誤，請在設置中清除全部資料 或 重裝APP再試！'
        );
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
    });

    if (!result.canceled) {
        return {
            assets: result.assets.map(asset => ({
                uri: asset.uri,
                fileName: asset.fileName || `image_${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
                width: asset.width,
                height: asset.height,
                fileSize: asset.fileSize,
            }))
        };
    }

    return null;
}

// 導出兼容層函數（如果需要與舊代碼兼容）
export { MediaLibrary, File, Directory, Paths, ImagePicker };
