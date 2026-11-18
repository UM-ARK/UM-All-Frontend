import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ReduceMotion, ReducedMotionConfig, useReducedMotion } from 'react-native-reanimated';

import { getLocalStorage, setLocalStorageSilently } from '../utils/storageKits';

const STORAGE_KEY = 'reduceMotionPreference';
const ReducedMotionContext = createContext(null);

export const ReducedMotionProvider = ({ children }) => {
    const initialSystemPreference = useReducedMotion();
    const [systemPreference, setSystemPreference] = useState(initialSystemPreference);
    const [preference, setPreference] = useState(null);
    const [saveFailed, setSaveFailed] = useState(false);
    const savedPreferenceRef = useRef(false);
    const pendingSaveRef = useRef(null);

    useEffect(() => {
        let active = true;
        let systemChanged = false;
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
            systemChanged = true;
            setSystemPreference(enabled);
        });

        AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
            if (active && !systemChanged) {
                setSystemPreference(enabled);
            }
        }).catch(() => {});

        getLocalStorage(STORAGE_KEY).then(stored => {
            if (active) {
                savedPreferenceRef.current = stored === true;
                setPreference(savedPreferenceRef.current);
            }
        });

        return () => {
            active = false;
            subscription?.remove();
        };
    }, []);

    const setReduceMotionPreference = useCallback(enabled => {
        setPreference(enabled);
        setSaveFailed(false);

        const previousSave = pendingSaveRef.current ?? Promise.resolve();
        const save = previousSave.then(() => setLocalStorageSilently(STORAGE_KEY, enabled));
        pendingSaveRef.current = save;
        save.then(result => {
            if (result === 'ok') {
                savedPreferenceRef.current = enabled;
            }
            if (pendingSaveRef.current !== save) {
                return;
            }
            pendingSaveRef.current = null;
            if (result !== 'ok') {
                setPreference(savedPreferenceRef.current);
                setSaveFailed(true);
            }
        });
    }, []);

    const reducedMotion = preference === true || systemPreference;
    const value = useMemo(
        () => ({ reducedMotion, preference, setReduceMotionPreference, saveFailed }),
        [reducedMotion, preference, setReduceMotionPreference, saveFailed],
    );

    return (
        <ReducedMotionContext.Provider value={value}>
            {reducedMotion !== initialSystemPreference && (
                <ReducedMotionConfig mode={reducedMotion ? ReduceMotion.Always : ReduceMotion.Never} />
            )}
            {children}
        </ReducedMotionContext.Provider>
    );
};

export const useReducedMotionPreference = () => useContext(ReducedMotionContext);

export const useAppReducedMotion = () => {
    const systemPreference = useReducedMotion();
    return useReducedMotionPreference()?.reducedMotion ?? systemPreference;
};
