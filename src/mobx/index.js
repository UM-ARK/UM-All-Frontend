import {observable, action} from 'mobx';

// 參考：https://www.digitalocean.com/community/tutorials/react-mobx-react-native-simplified
class RootStore {
    // es7裝飾器語法，observable表示屬性可以全局共享
    @observable
    // 用戶緩存信息
    userInfo = {};

    @action // 行為修飾器
    // 一般是從緩存存入數據到全局變量
    setUserInfo(userInfo) {
        this.userInfo = userInfo;
    }
}

export default new RootStore();
