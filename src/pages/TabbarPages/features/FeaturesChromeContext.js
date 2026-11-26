import React, { createContext, useContext } from 'react';

const FeaturesChromeContext = createContext({
    topChromeHeight: 0,
    isEditingFrequent: false,
    setIsEditingFrequent: () => {},
});

export const FeaturesChromeProvider = ({
    topChromeHeight = 0,
    isEditingFrequent = false,
    setIsEditingFrequent = () => {},
    children,
}) => (
    <FeaturesChromeContext.Provider
        value={{ topChromeHeight, isEditingFrequent, setIsEditingFrequent }}>
        {children}
    </FeaturesChromeContext.Provider>
);

export const useFeaturesChrome = () => useContext(FeaturesChromeContext);

export default FeaturesChromeContext;
