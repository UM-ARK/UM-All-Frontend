/**
 * 組隊活動收藏：Storage 持久化與已掛載頁面同步
 */
import {useCallback, useEffect, useState} from 'react';

import {getLocalStorage, setLocalStorage} from '../../../utils/storageKits';

const TEAM_EVENT_FAVORITES_STORAGE_KEY = 'ARK_TeamSchedule_Favorite_Event_Ids';

let favoriteEventIdsCache = null;
let favoriteLoadPromise = null;
let favoriteWriteQueue = Promise.resolve();
const favoriteListeners = new Set();

function normalizeFavoriteEventIds(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return Array.from(
        new Set(
            value
                .map(eventId => String(eventId || ''))
                .filter(Boolean),
        ),
    );
}

function notifyFavoriteListeners() {
    favoriteListeners.forEach(listener => {
        try {
            listener(favoriteEventIdsCache || []);
        } catch (_error) {
            // 單一訂閱失敗不影響其他實例
        }
    });
}

async function loadFavoriteEventIds() {
    if (Array.isArray(favoriteEventIdsCache)) {
        return favoriteEventIdsCache;
    }
    if (!favoriteLoadPromise) {
        favoriteLoadPromise = getLocalStorage(
            TEAM_EVENT_FAVORITES_STORAGE_KEY,
        ).then(stored => {
            favoriteEventIdsCache = normalizeFavoriteEventIds(stored);
            notifyFavoriteListeners();
            return favoriteEventIdsCache;
        });
    }
    return favoriteLoadPromise;
}

async function toggleTeamEventFavorite(eventId) {
    const id = eventId != null ? String(eventId) : '';
    if (!id) {
        return favoriteEventIdsCache || [];
    }

    const write = favoriteWriteQueue.then(async () => {
        const current = await loadFavoriteEventIds();
        const next = current.includes(id)
            ? current.filter(currentId => currentId !== id)
            : [...current, id];
        const result = await setLocalStorage(
            TEAM_EVENT_FAVORITES_STORAGE_KEY,
            next,
        );
        if (result !== 'ok') {
            return current;
        }
        favoriteEventIdsCache = next;
        notifyFavoriteListeners();
        return next;
    });
    favoriteWriteQueue = write.catch(() => {});
    return write;
}

export function useTeamEventFavorites() {
    const [favoriteEventIds, setFavoriteEventIds] = useState(
        () => favoriteEventIdsCache || [],
    );

    useEffect(() => {
        const listener = nextIds => setFavoriteEventIds(nextIds);
        favoriteListeners.add(listener);
        loadFavoriteEventIds().catch(() => {});
        return () => {
            favoriteListeners.delete(listener);
        };
    }, []);

    const toggleFavorite = useCallback(
        eventId => toggleTeamEventFavorite(eventId),
        [],
    );

    return {favoriteEventIds, toggleFavorite};
}

export default useTeamEventFavorites;
