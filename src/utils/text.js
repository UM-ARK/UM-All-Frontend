// 判斷字串是否包含中文
export function hasChinese(str = '') {
    return /[\u4E00-\u9FA5]+/g.test(str);
}
