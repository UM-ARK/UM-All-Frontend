import React, { useState, useRef }from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

import { WebView } from 'react-native-webview';
import * as Progress from 'react-native-progress';
import { TouchableOpacity } from 'react-native';

const IntegratedWebView = ({source }) => {
    const [progress, setProgress] = useState(0);
    const [isLoaded, setLoaded] = useState(false);

    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);

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
            />
            <NavigationView 
                onBackPress={handleBackPress}
                onForwardPress={handleForwardPress}
                canGoBack={canGoBack}
                canGoForward={canGoForward} />
        </>
    );
};

const NavigationView = ({ onBackPress, onForwardPress, canGoBack, canGoForward }) => {

    return <>
        {
            canGoBack || canGoForward ?
            <View style={styles.container}>
                <TouchableOpacity onPress={onBackPress} disabled={canGoBack ? false : true}>
                    <Text style={canGoBack ? styles.buttonTitle : styles.disabledButtonTitle}>{"<"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onForwardPress}>
                    <Text style={canGoForward ? styles.buttonTitle : styles.disabledButtonTitle}>{">"}</Text>
                </TouchableOpacity>
            </View>
            : null
        }
    </>
}

const window = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        height: window.height * 0.1,
        width: window.width,
        backgroundColor: 'lightblue',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
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
