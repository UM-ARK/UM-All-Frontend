import {observable, action} from 'mobx';

// 參考：https://www.digitalocean.com/community/tutorials/react-mobx-react-native-simplified
class RootStore {
    // es7裝飾器語法，observable表示屬性可以全局共享
    @observable
    // 用戶登錄狀態
    // isLogin = false;
    // 是否組織賬號
    // isClub = false;
    // 用戶緩存信息
    userInfo = {};

    @action // 行為修飾器
    // 登錄或登出賬號
    // loginStd() {
    //     this.isLogin = true;
    //     this.isClub = false;
    // }
    // logoutStd() {
    //     this.isLogin = false;
    //     this.isClub = false;
    // }

    // // 登錄或登出組織賬號
    // loginClub() {
    //     this.isLogin = true;
    //     this.isClub = true;
    // }
    // logoutClub() {
    //     this.isLogin = false;
    //     this.isClub = true;
    // }
    // 一般是從緩存存入數據到全局變量
    setUserInfo(userInfo) {
        this.userInfo = userInfo;
    }
}

export default new RootStore();
