/**
 * 可共用的剪貼板 Deep Link 掃描器。
 *
 * 僅在呼叫 scan() 時讀取剪貼板（建議掛在 AppState → active），
 * 以 parser 依序解析，同一 fingerprint 只觸發一次，避免反覆打擾。
 * 刻意不把剪貼板全文寫入 log。
 */
import {AppState} from 'react-native';

/**
 * @typedef {object} ClipboardDeepLinkMatch
 * @property {string} parserId
 * @property {string} fingerprint 去重鍵（勿寫入持久化／analytics）
 * @property {*} payload parser 自訂資料
 */

/**
 * @typedef {object} ClipboardDeepLinkParser
 * @property {string} id
 * @property {(text: string) => ({fingerprint: string, payload: *} | null)} parse
 */

async function defaultReadClipboard() {
    try {
        // 延遲載入，避免 Jest 環境強制綁定原生 Clipboard 模組
        const Clipboard =
            require('@react-native-clipboard/clipboard').default;
        return (await Clipboard.getString()) || '';
    } catch (_error) {
        return '';
    }
}

/**
 * @param {object} options
 * @param {ClipboardDeepLinkParser[]} options.parsers
 * @param {(match: ClipboardDeepLinkMatch) => void | Promise<void>} options.onMatch
 * @param {() => boolean} [options.shouldScan]
 * @param {() => Promise<string>} [options.getClipboardText] 測試可注入
 */
export function createClipboardDeepLinkScanner({
    parsers,
    onMatch,
    shouldScan,
    getClipboardText,
}) {
    const list = Array.isArray(parsers) ? parsers : [];
    const seenFingerprints = new Set();
    let scanning = false;

    const readClipboard =
        typeof getClipboardText === 'function'
            ? getClipboardText
            : defaultReadClipboard;

    const fingerprintKey = (parserId, fingerprint) =>
        `${parserId}:${fingerprint}`;

    const markSeen = (parserId, fingerprint) => {
        if (!parserId || fingerprint == null || fingerprint === '') {
            return;
        }
        seenFingerprints.add(fingerprintKey(parserId, fingerprint));
    };

    const hasSeen = (parserId, fingerprint) =>
        seenFingerprints.has(fingerprintKey(parserId, fingerprint));

    const clearSeen = () => {
        seenFingerprints.clear();
    };

    const scan = async () => {
        if (scanning) {
            return null;
        }
        if (typeof shouldScan === 'function' && !shouldScan()) {
            return null;
        }

        scanning = true;
        try {
            const text = await readClipboard();
            if (!text || typeof text !== 'string') {
                return null;
            }

            for (let i = 0; i < list.length; i += 1) {
                const parser = list[i];
                if (!parser || typeof parser.parse !== 'function') {
                    continue;
                }
                let result = null;
                try {
                    result = parser.parse(text);
                } catch (_error) {
                    result = null;
                }
                if (!result || result.fingerprint == null) {
                    continue;
                }
                const fingerprint = String(result.fingerprint);
                if (!fingerprint || hasSeen(parser.id, fingerprint)) {
                    continue;
                }
                // 先標記再回調，避免使用者關閉提示後反覆彈出
                markSeen(parser.id, fingerprint);
                const match = {
                    parserId: parser.id,
                    fingerprint,
                    payload: result.payload,
                };
                await onMatch?.(match);
                return match;
            }
            return null;
        } finally {
            scanning = false;
        }
    };

    /**
     * 監聽 App 回前景並自動 scan。
     * @param {object} [listenOptions]
     * @param {boolean} [listenOptions.scanOnStart=true] 訂閱時若已在前景則立即 scan
     * @returns {() => void} unsubscribe
     */
    const subscribeAppState = (listenOptions = {}) => {
        const scanOnStart = listenOptions.scanOnStart !== false;
        let appState = AppState.currentState;

        if (scanOnStart && appState === 'active') {
            scan().catch(() => {});
        }

        const subscription = AppState.addEventListener(
            'change',
            nextState => {
                const wasBackground =
                    appState === 'inactive' || appState === 'background';
                appState = nextState;
                if (wasBackground && nextState === 'active') {
                    scan().catch(() => {});
                }
            },
        );

        return () => {
            subscription?.remove?.();
        };
    };

    return {
        scan,
        markSeen,
        hasSeen,
        clearSeen,
        subscribeAppState,
    };
}
