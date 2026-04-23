import * as OpenCC from 'opencc-js';
import { hasChinese } from '../../what2Reg/utils/text';

/** 與搵課頁 what2Reg/utils/search.js 相同：簡體輸入轉繁體後比對 */
const cnToTw = OpenCC.Converter({ from: 'cn', to: 'tw' });

/**
 * 依關鍵字篩選組織（名稱）
 * - 無中文：不分大小寫比對
 * - 含中文：比對原文與簡轉繁後字串（資料名稱為繁體時可搜簡體）
 */
export function filterClubsBySearchQuery(clubs, searchQuery) {
    const raw = (searchQuery || '').trim();
    if (!raw) {
        return clubs || [];
    }
    const qLower = raw.toLowerCase();
    return (clubs || []).filter((c) => {
        const name = c.name || '';
        const nameLower = name.toLowerCase();
        if (!hasChinese(raw)) {
            return nameLower.includes(qLower);
        }
        return name.includes(raw) || name.includes(cnToTw(raw));
    });
}
