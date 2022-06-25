export const COLOR_DIY = {
    themeColor:'#005F95',
    // B站使用的安卓Material Design，亮色背景下87%的黑色用於顯示
    black:{
        // 最高層級，類似大標題
        main    :'#000',
        // 次標題
        second  :'#666666',
        // 次次標題
        third   :'#9E9E9E',
    },
    // 當想用純白，或其他顏色背景，白色文字時用white的色值
    white:'#F5F5F5',
    // 全局背景白色(偏灰)
    bg_color:'#F5F5F7',
    meScreenColor:{
        bg_color:'#ededed',
        card_color:'white',
    },

    // 陰影，IOS和Android要分開設置，shadow屬性只適用於IOS
    viewShadow:{
        shadowColor: '#000',
        shadowOffset: {width: 1, height: 1},
        shadowOpacity: 0.4,
        shadowRadius: 3,
        // 適用於Android
        elevation: 5,
    }
}
