import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

import AppShareSheet from '../components/AppShareSheet';
import {normalizeAppSharePayload} from '../utils/appShare';

const AppShareContext = createContext(null);

export const AppShareProvider = ({children}) => {
    const [payload, setPayload] = useState(null);

    const openShare = useCallback(nextPayload => {
        const normalized = normalizeAppSharePayload(nextPayload);
        if (normalized) {
            setPayload(normalized);
        }
    }, []);

    const closeShare = useCallback(() => {
        setPayload(null);
    }, []);

    const value = useMemo(
        () => ({openShare, closeShare}),
        [closeShare, openShare],
    );

    return (
        <AppShareContext.Provider value={value}>
            {children}
            <AppShareSheet
                onClose={closeShare}
                payload={payload}
                visible={Boolean(payload)}
            />
        </AppShareContext.Provider>
    );
};

export function useAppShare() {
    const context = useContext(AppShareContext);
    if (!context) {
        throw new Error('useAppShare 必須在 AppShareProvider 內使用。');
    }
    return context;
}
