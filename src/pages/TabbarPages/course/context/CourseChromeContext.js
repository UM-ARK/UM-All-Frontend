import React, { createContext, useContext } from 'react';

const CourseChromeContext = createContext({
    topChromeHeight: 0,
});

export const CourseChromeProvider = ({ topChromeHeight = 0, children }) => (
    <CourseChromeContext.Provider value={{ topChromeHeight }}>
        {children}
    </CourseChromeContext.Provider>
);

export const useCourseChrome = () => useContext(CourseChromeContext);

export default CourseChromeContext;
