//调试模式
var debugmod=1;

//输出到控制台
function Printf(log)
{
    if(debugmod==1)
    {
        console.log(log);
    }
}

//获取html
/*
如果在open方法中第三个参数async设置为false，则请求是同步进行的。
换句话说，JavaScript 执行在send()收到响应时暂停并恢复。有点像alert或prompt命令。
这是重写的示例，的第三个参数open是false：
*/
function Get_Html(url)
{
    var request = new XMLHttpRequest();
    request.open("get", url,false);
    request.send();
    if(request.status==200)
    {
        var html=request.response;
        //Printf("status code:200\n"+html);
        return html;

    }else
    {
        Printf("Error Can't open the page! Status code: "+request.status);
        return "";
    }

    

}

//失物招領網頁數據轉json  (Lost and found)
function LaF_to_Json(url)
{
    var html_source_data=Get_Html(url)
    var return_js={};
    //正則條件
    var patt = /<tr valign="top"[\s\S]*?Current Location : /g;
    var patt1 = /<font size="2">[\s\S]*?<\/font>/g;
    var patt2 = /拾獲地點 : [\s\S]*?<br>/g;
    var patt3 = /現時位置 : [\s\S]*?<\/font>/g;
    //用來刪除多餘的字符串
    var replace1=/<font size="2">物品名稱 : <font color=red>/g;
    var replace2=/<\/font>/g;
    var replace3=/<font size="2">/g;
    var replace4=/拾獲地點 : /g;
    var replace5=/<br>/g;
    var replace6=/現時位置 :  /g;

    data=html_source_data.match(patt);//先將數據分割成塊

    for(i in data)
    {
        var js_piece={}
        var temp_data;
        data1=data[i].match(patt1);

        temp_data=data1[3];
        temp_data=temp_data.replace(replace1,"");
        temp_data=temp_data.replace(replace2,"");
        js_piece['title']=temp_data;

        temp_data=data1[1];
        temp_data=temp_data.replace(replace2,"");
        temp_data=temp_data.replace(replace3,"");
        js_piece['date']=temp_data;

        temp_data=data1[2];
        temp_data=temp_data.replace(replace2,"");
        temp_data=temp_data.replace(replace3,"");
        js_piece['ref']=temp_data;

        data2=data[i].match(patt2);
        temp_data=data2[0];
        temp_data=temp_data.replace(replace4,"");
        temp_data=temp_data.replace(replace5,"");
        js_piece['pick_up']=temp_data;

        data3=data[i].match(patt3);
        temp_data=data3[0];
        temp_data=temp_data.replace(replace6,"");
        temp_data=temp_data.replace(replace2,"");
        js_piece['current']=temp_data;

        return_js[i]=js_piece;
    }

    return return_js;
}

