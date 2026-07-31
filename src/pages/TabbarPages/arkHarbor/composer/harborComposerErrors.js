import {getHarborRateLimitDelayMs} from '../../../../utils/harbor/harborRateLimit';

function getServerErrorMessage(error) {
    const data = error?.response?.data;
    const errors = data?.errors;

    if (Array.isArray(errors)) {
        return errors.filter(Boolean).join('\n');
    }
    if (typeof errors === 'string') {
        return errors;
    }
    if (typeof data?.error === 'string') {
        return data.error;
    }
    if (typeof data?.message === 'string') {
        return data.message;
    }
    return '';
}

export function getComposerErrorMessage(error, t) {
    const status = error?.response?.status;
    const serverMessage = getServerErrorMessage(error);

    if (error?.code === 'INVALID_HARBOR_POST_RESULT') {
        return t('Harbor 沒有返回新貼文位置，請重新載入話題確認。');
    }
    if (status === 401) {
        return t('Harbor 登入已失效，請重新登入。');
    }
    if (status === 403) {
        return (
            serverMessage ||
            t('你目前沒有權限發布或編輯這篇內容。')
        );
    }
    if (status === 409) {
        return (
            serverMessage ||
            t('這篇內容已在其他地方更新，請重新載入後再編輯。')
        );
    }
    if (status === 422) {
        return (
            serverMessage ||
            t('Harbor 無法接受這篇內容，請檢查標題、分類、標籤及正文。')
        );
    }
    if (status === 429) {
        const seconds = Math.max(
            1,
            Math.ceil(getHarborRateLimitDelayMs(error) / 1000),
        );
        return serverMessage || t('操作太頻繁，請在 {{count}} 秒後再試。', {
            count: seconds,
        });
    }
    if (!error?.response) {
        return t('無法連接 Harbor，請檢查網絡後再試。');
    }
    return serverMessage || t('發布失敗，請稍後再試。');
}

export function getUploadErrorMessage(error, t) {
    const serverMessage = getServerErrorMessage(error);

    if (error?.response?.status === 413) {
        return t('圖片檔案太大，請選擇較小的圖片。');
    }
    if (error?.response?.status === 422) {
        return serverMessage || t('Harbor 無法接受這張圖片。');
    }
    if (!error?.response) {
        return t('圖片上傳失敗，請檢查網絡後重試。');
    }
    return serverMessage || t('圖片上傳失敗，請稍後再試。');
}
