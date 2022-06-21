
import {Dimensions } from 'react-native'

// 等號左邊單位都是px，右邊都是dp
// 設計稿的寬度 / 元素的寬度 = 手機屏幕 / 手機中元素的寬度
// 手機中元素的寬度 = 手機屏幕 * 元素寬度 / 設計稿的寬度（暫定375）

// 導出
export const screenWidth  = Dimensions.get('window').width;
export const screenHeight = Dimensions.get('window').height;

// 傳入設計稿元素的寬度，返回RN要寫的dp單位寬度
/**
 * 將像素轉dp
 * @param {Number} elePx 元素的寬度或者高度，單位px
 * 
 */
export const pxToDp=(elePx)=> screenWidth * elePx / 375