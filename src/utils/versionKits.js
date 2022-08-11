// 版本號比較
// (即將到來的版本號, 上一個版本號)
// 1 pre版本提前
// -1 pre版本滯後
// 0 pre版本與上一版本相同
export const versionStringCompare = (preVersion = '', lastVersion = '') => {
    var sources = preVersion.split('.');
    var dests = lastVersion.split('.');
    var maxL = Math.max(sources.length, dests.length);
    var result = 0;
    for (let i = 0; i < maxL; i++) {
        let preValue = sources.length > i ? sources[i] : 0;
        let preNum = isNaN(Number(preValue))
            ? preValue.charCodeAt()
            : Number(preValue);
        let lastValue = dests.length > i ? dests[i] : 0;
        let lastNum = isNaN(Number(lastValue))
            ? lastValue.charCodeAt()
            : Number(lastValue);
        if (preNum < lastNum) {
            result = -1;
            break;
        } else if (preNum > lastNum) {
            result = 1;
            break;
        }
    }
    return result;
};

//使用示例：
// let result = versionStringCompare('1.0.2', '1.0');
// console.log(result); //1

// let result = versionStringCompare('1.0.0', '1.1');
// console.log(result); //-1

// let result = versionStringCompare('11.0.2', '5.5.6');
// console.log(result); //1

// let result = versionStringCompare('5.5.0', '5.5');
// console.log(result); //0

// let result = versionStringCompare('1.1.a', '1.1.1');
// console.log(result); //1
