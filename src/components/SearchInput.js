import { Input } from '@rneui/themed';
import { ThemeProvider, useTheme } from 'styled-components';
import OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 簡體轉繁體

/**
 * 列表搜索組件。給定一個列表，組件會通過過過濾函數和用戶輸入的文本來更新列表。
 * @param {*} itemList - 要搜索的項目列表。
 * @param {*} filter - 用於過濾項目的函數，接受一個項目和搜索文本，返回布爾值。
 * @param {*} displayResult - 用於顯示過濾後結果的函數，接受過濾後的項目列表。
 * @param {*} theme - 主題對象，包含顏色和樣式。
 * @returns 
 */
const SearchInput = ({ itemList, filter, displayResult, theme }) => {
    const { black} = theme;
    return (
        <Input placeholder="Search..."
            style={{ color: black.main }}
            onChange={(e) => {
                const searchText = e.nativeEvent.text.toLowerCase();
                const filteredList = itemList.filter(item => filter(item, searchText));
                displayResult(filteredList);
            }} />

    );
};

export default SearchInput;