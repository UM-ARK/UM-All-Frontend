import { useState, useEffect } from 'react';
import { getLocalStorage, setLocalStorage } from './storageKits';

export const UMEH_PRIMARY_HOST = 'https://umeh.top';
export const UMEH_BACKUP_HOST = 'https://cf.umeh.top';

const PREF_KEY = 'umeh_host_pref';
const PROBE_TIMEOUT_MS = 2500;
const PROBE_CACHE_TTL_MS = 30 * 60 * 1000; // 30分鐘

export async function getUmehHostPref() {
    const v = await getLocalStorage(PREF_KEY);
    return v || 'auto';
}

export async function setUmehHostPref(pref) {
    await setLocalStorage(PREF_KEY, pref);
}

// 探測緩存
let _probeCache = { result: null, ts: 0 };

async function probeHost(host) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const response = await fetch(host, {
            method: 'HEAD',
            signal: controller.signal,
        });
        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

// 單例狀態
let _currentHost = UMEH_BACKUP_HOST;
const _subs = new Set();

function _notify() {
    _subs.forEach(cb => cb(_currentHost));
}

export function getCurrentUmehHost() {
    return _currentHost;
}

export function subscribeUmehHost(cb) {
    _subs.add(cb);
    return () => _subs.delete(cb);
}

export async function refreshUmehHost() {
    const pref = await getUmehHostPref();

    if (pref === 'primary') {
        _currentHost = UMEH_PRIMARY_HOST;
        _notify();
        return;
    }
    if (pref === 'backup') {
        _currentHost = UMEH_BACKUP_HOST;
        _notify();
        return;
    }

    // auto：探測 primary，30 分鐘內用緩存結果
    const now = Date.now();
    let primaryOk;
    if (now - _probeCache.ts < PROBE_CACHE_TTL_MS && _probeCache.result !== null) {
        primaryOk = _probeCache.result;
    } else {
        primaryOk = await probeHost(UMEH_PRIMARY_HOST);
        _probeCache = { result: primaryOk, ts: Date.now() };
    }

    _currentHost = primaryOk ? UMEH_PRIMARY_HOST : UMEH_BACKUP_HOST;
    _notify();
}

// React Hook：訂閱單例
export function useUmehHost() {
    const [host, setHost] = useState(getCurrentUmehHost);

    useEffect(() => {
        const unsub = subscribeUmehHost(setHost);
        return unsub;
    }, []);

    return {
        baseHost: host,
        searchHost: host + '/search/course/',
    };
}
