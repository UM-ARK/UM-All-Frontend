/**
 * 組隊邀請連結：解析、分享文案（純函式）
 *
 * 契約 URL：
 * https://umall.one/app/team/{eventId}?invite={inviteToken}
 * one.umall://app/team/{eventId}?invite={inviteToken}
 */

export const TEAM_INVITE_PARSER_ID = 'team-invite';

// 分享時預設提示（繁中；UI 層可用 i18n 覆寫）
export const TEAM_INVITE_SHARE_HINT_ZH =
    '複製此條信息打開ARK ALL即可組隊，或瀏覽器打開下方鏈接。';

const HTTPS_TEAM_INVITE_RE =
    /https?:\/\/(?:www\.)?umall\.one\/app\/team\/([^/?#\s]+)(?:\?([^#\s]*))?/gi;
const SCHEME_TEAM_INVITE_RE =
    /one\.umall:\/\/app\/team\/([^/?#\s]+)(?:\?([^#\s]*))?/gi;

/**
 * 自查詢字串取出 invite（容錯大小寫鍵名）
 * @param {string} query
 * @returns {string|null}
 */
function pickInviteFromQuery(query) {
    if (!query || typeof query !== 'string') {
        return null;
    }
    try {
        const params = new URLSearchParams(query);
        const invite =
            params.get('invite') ||
            params.get('Invite') ||
            params.get('INVITE');
        if (invite == null || invite === '') {
            return null;
        }
        return String(invite);
    } catch (_error) {
        return null;
    }
}

/**
 * 安全 decode path 段
 * @param {string} value
 */
function safeDecode(value) {
    try {
        return decodeURIComponent(String(value));
    } catch (_error) {
        return String(value);
    }
}

/**
 * 從任意文字（分享訊息／純 URL）解析組隊邀請。
 * @param {string} text
 * @returns {{eventId: string, invite: string, fingerprint: string}|null}
 */
export function parseTeamInviteLink(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }
    const source = text.trim();
    if (!source) {
        return null;
    }

    const patterns = [HTTPS_TEAM_INVITE_RE, SCHEME_TEAM_INVITE_RE];
    for (let p = 0; p < patterns.length; p += 1) {
        const re = patterns[p];
        re.lastIndex = 0;
        let match = re.exec(source);
        while (match) {
            const eventId = safeDecode(match[1] || '').trim();
            const invite = pickInviteFromQuery(match[2] || '');
            if (eventId && invite) {
                return {
                    eventId,
                    invite,
                    fingerprint: `${eventId}:${invite}`,
                };
            }
            match = re.exec(source);
        }
    }
    return null;
}

/**
 * 剪貼板 scanner 用的 parser
 * @returns {{id: string, parse: (text: string) => ({fingerprint: string, payload: {eventId: string, invite: string}} | null)}}
 */
export function createTeamInviteClipboardParser() {
    return {
        id: TEAM_INVITE_PARSER_ID,
        parse: text => {
            const parsed = parseTeamInviteLink(text);
            if (!parsed) {
                return null;
            }
            return {
                fingerprint: parsed.fingerprint,
                payload: {
                    eventId: parsed.eventId,
                    invite: parsed.invite,
                },
            };
        },
    };
}

/**
 * 組裝分享訊息（含剪貼板自動匯入提示）
 * @param {object} options
 * @param {string} options.url
 * @param {string} [options.title]
 * @param {string} [options.hint] 預設繁中提示
 */
export function buildTeamInviteShareMessage({
    url,
    title = '',
    hint = TEAM_INVITE_SHARE_HINT_ZH,
}) {
    const safeUrl = url == null ? '' : String(url).trim();
    const safeTitle = title == null ? '' : String(title).trim();
    const safeHint = hint == null ? '' : String(hint).trim();
    const lines = [];
    if (safeHint) {
        lines.push(safeHint);
    }
    if (safeTitle) {
        lines.push(safeTitle);
    }
    if (safeUrl) {
        lines.push(safeUrl);
    }
    return lines.join('\n');
}

/**
 * 以邀請 token 開啟詳情：必須 push，避免 stack 複用實例導致 invite 未寫入 hook。
 * @param {{navigate?: Function, push?: Function}|null|undefined} navigation
 * @param {{eventId: string, invite: string}} params
 */
export function openTeamInviteDetail(navigation, {eventId, invite}) {
    if (!navigation || !eventId || !invite) {
        return false;
    }
    const params = {eventId: String(eventId), invite: String(invite)};
    if (typeof navigation.push === 'function') {
        navigation.push('TeamScheduleDetail', params);
        return true;
    }
    if (typeof navigation.navigate === 'function') {
        navigation.navigate('TeamScheduleDetail', params);
        return true;
    }
    return false;
}
