import React, { createContext, useContext } from 'react';

const CourseChromeContext = createContext({
    topChromeHeight: 0,
    useNativeLiquidGlassHeader: false,
});

export const CourseChromeProvider = ({
    topChromeHeight = 0,
    useNativeLiquidGlassHeader = false,
    children,
}) => (
    <CourseChromeContext.Provider
        value={{ topChromeHeight, useNativeLiquidGlassHeader }}>
        {children}
    </CourseChromeContext.Provider>
);

export const useCourseChrome = () => useContext(CourseChromeContext);

export default CourseChromeContext;
