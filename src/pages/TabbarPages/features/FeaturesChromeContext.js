import React, { createContext, useContext } from 'react';

const FeaturesChromeContext = createContext({
    topChromeHeight: 0,
});

export const FeaturesChromeProvider = ({ topChromeHeight = 0, children }) => (
    <FeaturesChromeContext.Provider value={{ topChromeHeight }}>
        {children}
    </FeaturesChromeContext.Provider>
);

export const useFeaturesChrome = () => useContext(FeaturesChromeContext);

export default FeaturesChromeContext;
