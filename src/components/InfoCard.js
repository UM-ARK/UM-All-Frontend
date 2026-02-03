import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import GlassmorphismCard from './GlassmorphismCard';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

/**
 * 信息卡片組件
 * 統一的信息展示卡片
 */
const InfoCard = React.memo(({ title, children, delay = 0, themeColor }) => {
    return (
        <Animated.View
            entering={FadeInUp.delay(delay).duration(600).springify()}
            layout={LinearTransition.springify()}
        >
            <GlassmorphismCard style={staticStyles.infoCard}>
                {title && (
                    <View style={staticStyles.infoCardHeader}>
                        <View
                            style={[staticStyles.infoCardIndicator, { backgroundColor: themeColor }]}
                        />
                        <Text style={[staticStyles.infoCardTitle, { color: themeColor }]}>
                            {title}
                        </Text>
                    </View>
                )}
                <View style={staticStyles.infoCardBody}>{children}</View>
            </GlassmorphismCard>
        </Animated.View>
    );
});

const staticStyles = StyleSheet.create({
    infoCard: {
        marginVertical: verticalScale(8),
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
        paddingBottom: verticalScale(8),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    infoCardIndicator: {
        width: scale(4),
        height: scale(20),
        borderRadius: scale(2),
        marginRight: scale(8),
    },
    infoCardTitle: {
        fontSize: moderateScale(17),
        fontWeight: '700',
    },
    infoCardBody: {
        gap: verticalScale(10),
    },
});

export default InfoCard;
