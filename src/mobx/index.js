import {observable, action} from 'mobx';

// 參考：https://www.digitalocean.com/community/tutorials/react-mobx-react-native-simplified
class RootStore {
    // es7裝飾器語法，observable表示屬性可以全局共享
    @observable
    // 用戶登錄狀態
    isLogin = false;
    // 是否組織賬號
    isClubAccount = false;

    @action // 行為修飾器
    // 登錄或登出賬號
    changeLoginState() {
        this.isLogin = !this.isLogin;
    }
}

export default new RootStore();
