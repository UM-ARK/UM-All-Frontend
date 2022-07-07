import React, { useState, useRef }from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';

import { WebView } from 'react-native-webview';
import * as Progress from 'react-native-progress';
import { TouchableOpacity } from 'react-native';

const IntegratedWebView = ({source }) => {
    const [progress, setProgress] = useState(0);
    const [isLoaded, setLoaded] = useState(false);

    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);

    const scrollY = new Animated.Value(0);
    const diffClamp = Animated.diffClamp(scrollY, 0, window.height * 0.08)
    const translateY = diffClamp.interpolate({
        inputRange: [0, window.height * 0.08],
        outputRange: [0, (window.height * 0.08)],
    })

    const webViewRef = useRef();

    const handleBackPress = () => {
        webViewRef.current.goBack();
    }

    const handleForwardPress = () => {
        webViewRef.current.goForward();
    }

    return (
        <>
        { // 判斷: 網站加載完成則隱藏進度條
            !isLoaded ? 
                <Progress.Bar
                    progress={progress}
                    borderWidth={0}
                    borderRadius={0}
                    width={null} // null -> 寬度為全屏
                    height={2}
                />
                    : null
        }
            <WebView
                ref={webViewRef}
                source={source} //{uri: 'https://www.umeh.top/'}
                originWhitelist={['*']}
                startInLoadingState={true}
                onLoadProgress={event => setProgress(event.nativeEvent.progress)}
                onLoadStart={() => { 
                    setLoaded(false);
                    setProgress(0);
                }}
                onLoadEnd={() => setLoaded(true)}
                onNavigationStateChange={state => {
                    const back = state.canGoBack;
                    const forward = state.canGoForward;
                    setCanGoBack(back);
                    setCanGoForward(forward);
                }}
                onScroll={(e) => {
                    scrollY.setValue(e.nativeEvent.contentOffset.y);
                }}
                pullToRefreshEnabled={true}
            />
            <NavigationView 
                onBackPress={handleBackPress}
                onForwardPress={handleForwardPress}
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                translateY={translateY}
                />
        </>
    );
};

const NavigationView = ({ onBackPress, onForwardPress, canGoBack, canGoForward, translateY }) => {

    return <>
        {
            canGoBack || canGoForward ?
            <Animated.View style={[styles.container, {transform: [{translateY: translateY}]}]}>
                <TouchableOpacity style={styles.button} onPress={onBackPress} disabled={canGoBack ? false : true}>
                    <Text style={canGoBack ? styles.buttonTitle : styles.disabledButtonTitle}>{"<"}</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity style={styles.button} onPress={onForwardPress}>
                    <Text style={styles.buttonTitle}>{"O"}</Text>
                </TouchableOpacity> */}
                <TouchableOpacity style={styles.button} onPress={onForwardPress}>
                    <Text style={canGoForward ? styles.buttonTitle : styles.disabledButtonTitle}>{">"}</Text>
                </TouchableOpacity>
            </Animated.View>
            : null
        }
    </>
}

const window = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        height: window.height * 0.08,
        width: window.width,
        backgroundColor: '#CFD2CF',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    button: {
        paddingBottom: 20,
    },
    buttonTitle: {
        color: 'black',
        fontSize: 26,
    },
    disabledButtonTitle: {
        color: 'grey',
        fontSize: 26,
    }
})

export default IntegratedWebView;
