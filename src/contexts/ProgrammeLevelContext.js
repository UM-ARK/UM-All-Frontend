import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    DEFAULT_PROGRAMME_LEVEL,
    getCourseProgrammeLevel,
    isProgrammeLevel,
    setCourseProgrammeLevel,
} from '../utils/courseProgramme';

const ProgrammeLevelContext = createContext(null);

export const ProgrammeLevelProvider = ({ children }) => {
    const [programmeLevel, setProgrammeLevelState] = useState(
        DEFAULT_PROGRAMME_LEVEL,
    );

    useEffect(() => {
        let cancelled = false;

        getCourseProgrammeLevel().then(level => {
            if (!cancelled) {
                setProgrammeLevelState(level);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const setProgrammeLevel = useCallback(async level => {
        if (!isProgrammeLevel(level)) {
            throw new Error('Unknown course programme level');
        }
        setProgrammeLevelState(level);
        const result = await setCourseProgrammeLevel(level);
        if (result !== 'ok') {
            throw result;
        }
    }, []);

    const value = useMemo(
        () => ({programmeLevel, setProgrammeLevel}),
        [programmeLevel, setProgrammeLevel],
    );

    return (
        <ProgrammeLevelContext.Provider value={value}>
            {children}
        </ProgrammeLevelContext.Provider>
    );
};

export const useProgrammeLevel = () => {
    const context = useContext(ProgrammeLevelContext);
    if (!context) {
        throw new Error('useProgrammeLevel 必須在 ProgrammeLevelProvider 內使用');
    }
    return context;
};

export default ProgrammeLevelContext;
