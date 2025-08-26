import { observable, action, makeObservable } from 'mobx';

class RootStore {
    userInfo = {};

    constructor() {
        // 在建構子裡說明哪些成員是 observable/action
        makeObservable(this, {
            userInfo: observable,
            setUserInfo: action,
        });
    }

    setUserInfo(userInfo) {
        this.userInfo = userInfo;
    }
}

export default new RootStore();