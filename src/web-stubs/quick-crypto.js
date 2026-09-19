/* eslint-env browser */
// Web 替身：react-native-quick-crypto 依賴 Nitro 原生模塊，web 端無法加載
// 目前只有 Harbor 登入（RSA 密鑰對 + OAEP 解密）用到它，web 端暫不支持該流程；
// 這裡提供最小接口讓模塊能被 import，真正調用時拋出明確錯誤。
// 之後若要在桌面端支持 Harbor 登入，可改用瀏覽器內置的 SubtleCrypto（RSA-OAEP）實現。
const WEB_UNSUPPORTED = 'react-native-quick-crypto 在 web 端不可用（Harbor 登入暫不支持）';

const base64ToBytes = value => {
    const binary = atob(String(value ?? ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

// 只覆蓋 Buffer.from(str, 'base64' | 'utf8') 與 toString('utf8')
export const Buffer = {
    from(value, encoding) {
        const bytes = encoding === 'base64'
            ? base64ToBytes(value)
            : new TextEncoder().encode(String(value ?? ''));
        bytes.toString = enc => (enc === 'base64'
            ? btoa(String.fromCharCode(...bytes))
            : new TextDecoder().decode(bytes));
        return bytes;
    },
    isBuffer: value => value instanceof Uint8Array,
};

export const constants = {
    RSA_PKCS1_OAEP_PADDING: 4,
    RSA_PKCS1_PADDING: 1,
};

export const generateKeyPair = (type, options, callback) => {
    const error = new Error(WEB_UNSUPPORTED);
    if (typeof callback === 'function') {
        callback(error);
        return;
    }
    throw error;
};

export const generateKeyPairSync = () => {
    throw new Error(WEB_UNSUPPORTED);
};

export const privateDecrypt = () => {
    throw new Error(WEB_UNSUPPORTED);
};

export const publicEncrypt = () => {
    throw new Error(WEB_UNSUPPORTED);
};

export const randomBytes = size => {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
};

export default {
    Buffer,
    constants,
    generateKeyPair,
    generateKeyPairSync,
    privateDecrypt,
    publicEncrypt,
    randomBytes,
};
