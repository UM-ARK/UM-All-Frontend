{/* 頂部粘性標籤 */}
<SpringScrollView directionalLockEnabled={true} showsHorizontalScrollIndicator={false} style={{flexDirection:'row'}}>
<View style={{flexDirection:'row',}}>
    {/* 佔位View，用於給SpringScrollView橫向滾動 */}
    <View style={{marginLeft:pxToDp(10)}}></View>
    {/*{this.GetMessageTab()}*/}
    {/* 選項1 全部訊息 */}
    <TouchableOpacity style={{
        marginRight:pxToDp(5),
        backgroundColor:this.state.tagIndex==0?themeColor:bg_color,
        borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
        padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
        ...viewShadow
    }} activeOpacity={0.7} onPress={()=>this.handleClickTag(0)}>
        <Text style={{color:this.state.tagIndex==0?white:themeColor, fontSize:12}}>全部訊息</Text>
    </TouchableOpacity>

    {/*/!* 選項2 官方通告 *!/*/}
    <TouchableOpacity style={{
        marginRight:pxToDp(5),
        backgroundColor:this.state.tagIndex==1?themeColor:bg_color,
        borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
        padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
        ...viewShadow
    }} activeOpacity={0.7} onPress={()=>this.handleClickTag(1)}>
        <Text style={{color:this.state.tagIndex==1?white:themeColor, fontSize:12}}>官方通告</Text>
    </TouchableOpacity>

    {/*/!* 選項3 活動訊息 *!/*/}
    <TouchableOpacity style={{
        marginRight:pxToDp(5),
        backgroundColor:this.state.tagIndex==2?themeColor:bg_color,
        borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
        padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
        ...viewShadow
    }} activeOpacity={0.7} onPress={()=>this.handleClickTag(2)}>
        <Text style={{color:this.state.tagIndex==2?white:themeColor, fontSize:12}}>活動訊息</Text>
    </TouchableOpacity>

    {/* 佔位View，用於給SpringScrollView橫向滾動 */}
    <View style={{marginLeft:pxToDp(20)}}></View>
</View>
</SpringScrollView>