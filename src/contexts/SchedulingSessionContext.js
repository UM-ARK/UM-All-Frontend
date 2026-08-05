import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {useHarborSession} from './HarborSessionContext';
import {
    clearSchedulingSession,
    ensureSchedulingSession,
    getSchedulingSession,
    reverifyExistingSchedulingSession,
    setSchedulingHarborAuthFailureHandler,
} from '../utils/scheduling/schedulingAuth';
import {
    createSchedulingError,
    normalizeSchedulingError,
} from '../utils/scheduling/schedulingErrors';

const SchedulingSessionContext = createContext(null);

/**
 * 監聽 Harbor session：僅在 signedIn 時允許換票；登出時清空記憶體與 SecureStore JWT。
 * restoring／authorizing 不清盤，以便冷啟動重用未過期 JWT。
 * 不向頁面暴露 Harbor credentials。
 */
export const SchedulingSessionProvider = ({children}) => {
    const {status: harborStatus, logout} = useHarborSession();
    const [status, setStatus] = useState('idle');
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setSchedulingHarborAuthFailureHandler(authError => {
            clearSchedulingSession();
            setUser(null);
            setStatus('idle');
            setError(authError);
            // Harbor 憑證已失效：走既有登出流程要求重新登入
            logout().catch(() => {});
        });

        return () => {
            setSchedulingHarborAuthFailureHandler(null);
        };
    }, [logout]);

    useEffect(() => {
        if (harborStatus === 'signedIn') {
            const session = getSchedulingSession();
            if (session?.user) {
                setUser(session.user);
                setStatus('ready');
            }
            return;
        }

        // restoring／authorizing：只重置 UI，保留 SecureStore JWT
        if (
            harborStatus === 'restoring' ||
            harborStatus === 'authorizing'
        ) {
            setUser(null);
            setError(null);
            setStatus('idle');
            return;
        }

        // signedOut／expired：清空記憶體與 SecureStore
        clearSchedulingSession();
        setUser(null);
        setError(null);
        setStatus('idle');
    }, [harborStatus]);

    const ensureSession = useCallback(async () => {
        if (harborStatus !== 'signedIn') {
            const authError = createSchedulingError({
                code: 'authentication_required',
                message: '請先登入 Harbor',
                status: 401,
                retryable: false,
            });
            setError(authError);
            setStatus('idle');
            throw authError;
        }

        try {
            const session = await ensureSchedulingSession();
            setUser(session?.user || null);
            setError(null);
            setStatus('ready');
            return session;
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            setError(normalized);
            // harbor_unavailable 等可重試錯誤：保持可重試，不強制 idle 登出
            if (normalized.code === 'harbor_auth_failed') {
                setStatus('idle');
                setUser(null);
            } else if (getSchedulingSession()) {
                setStatus('ready');
            } else {
                setStatus('error');
            }
            throw normalized;
        }
    }, [harborStatus]);

    const clearSession = useCallback(() => {
        clearSchedulingSession();
        setUser(null);
        setError(null);
        setStatus('idle');
    }, []);

    const syncIdentity = useCallback(async () => {
        try {
            const session = await reverifyExistingSchedulingSession();
            if (!session) {
                return null;
            }
            setUser(session.user);
            setError(null);
            setStatus('ready');
            return session;
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            setError(normalized);
            if (
                normalized.code === 'harbor_auth_failed' ||
                normalized.code === 'harbor_account_mismatch'
            ) {
                setStatus('idle');
                setUser(null);
            } else if (getSchedulingSession()) {
                setStatus('ready');
            } else {
                setStatus('error');
            }
            throw normalized;
        }
    }, []);

    const value = useMemo(
        () => ({
            status,
            user,
            error,
            harborStatus,
            ensureSession,
            syncIdentity,
            clearSession,
        }),
        [
            clearSession,
            ensureSession,
            error,
            harborStatus,
            status,
            syncIdentity,
            user,
        ],
    );

    return (
        <SchedulingSessionContext.Provider value={value}>
            {children}
        </SchedulingSessionContext.Provider>
    );
};

export function useSchedulingSession() {
    const context = useContext(SchedulingSessionContext);
    if (!context) {
        throw new Error(
            'useSchedulingSession 必須在 SchedulingSessionProvider 內使用。',
        );
    }
    return context;
}
