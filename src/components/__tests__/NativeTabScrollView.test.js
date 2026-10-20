import React, { useContext } from 'react';
import { Platform, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Screen, ScreenContainer } from 'react-native-screens';
import { ScrollViewMarker } from 'react-native-screens/experimental';

import NativeTabScrollView from '../NativeTabScrollView';

const glassEffect = require('../../utils/glassEffect');

jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useContext: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: jest.fn() }));
jest.mock('react-native-screens', () => ({
    Screen: 'Screen',
    ScreenContainer: 'ScreenContainer',
}));
jest.mock('react-native-screens/experimental', () => ({
    ScrollViewMarker: 'ScrollViewMarker',
}));
jest.mock('../../utils/glassEffect', () => ({ isLiquidGlassSupported: true }));

describe('NativeTabScrollView', () => {
    beforeEach(() => {
        Platform.OS = 'ios';
        glassEffect.isLiquidGlassSupported = true;
        useIsFocused.mockReturnValue(true);
        useContext.mockReturnValue(true);
    });

    it('將目前列表直接登記給原生 tabbar，並轉交 ref 與捲動屬性', () => {
        const ref = React.createRef();
        const props = {
            onScroll: jest.fn(),
            refreshControl: <React.Fragment />,
            contentInsetAdjustmentBehavior: 'automatic',
            children: <React.Fragment />,
        };
        const tree = NativeTabScrollView.render(props, ref);
        const screen = tree.props.children;
        const marker = screen.props.children;
        const scrollView = marker.props.children;

        expect(tree.type).toBe(ScreenContainer);
        expect(screen.type).toBe(Screen);
        expect(screen.props.activityState).toBe(2);
        expect(marker.type).toBe(ScrollViewMarker);
        expect(scrollView.type).toBe(ScrollView);
        expect(scrollView.props).toEqual({ ...props, ref });
    });

    it.each([
        [false, true],
        [true, false],
    ])('頁面或校園子分頁失焦時卸離原生視圖，切回沿用同一個列表元件', (focused, active) => {
        useIsFocused.mockReturnValue(focused);
        useContext.mockReturnValue(active);
        const inactive = NativeTabScrollView.render({}, null);

        useIsFocused.mockReturnValue(true);
        useContext.mockReturnValue(true);
        const activeTree = NativeTabScrollView.render({}, null);

        expect(inactive.props.children.props.activityState).toBe(0);
        expect(activeTree.props.children.props.activityState).toBe(2);
        expect(activeTree.type).toBe(inactive.type);
        expect(activeTree.props.children.type).toBe(inactive.props.children.type);
        expect(activeTree.props.children.props.children.props.children.type).toBe(ScrollView);
    });

    it.each(['android', 'web'])('%s 沿用普通 ScrollView', platform => {
        Platform.OS = platform;
        expect(NativeTabScrollView.render({}, null).type).toBe(ScrollView);
    });

    it('舊版 iOS 沿用普通 ScrollView', () => {
        glassEffect.isLiquidGlassSupported = false;
        expect(NativeTabScrollView.render({}, null).type).toBe(ScrollView);
    });
});
