/**
 * Metro 0.83.5+ 開發伺服器會向 @react-navigation/elements 索取
 * back-icon@Nx.png（無平台後綴），但套件僅提供 .ios / .android 變體，
 * 導致 getAsset 失敗。此腳本於安裝後將 iOS 圖示複製為通用檔名，與社群 workaround 一致。
 * TODO: 臨時方案，具體看navigation或Metro怎麼修復
 *
 * @see https://github.com/facebook/metro/issues/1667
 * @see https://github.com/react-navigation/react-navigation/issues/13023
 */
const fs = require('fs');
const path = require('path');

const elementsRoot = path.dirname(
  require.resolve('@react-navigation/elements/package.json'),
);
const assetsDir = path.join(elementsRoot, 'lib', 'module', 'assets');

if (!fs.existsSync(assetsDir)) {
  process.exit(0);
}

const scales = ['1x', '2x', '3x', '4x'];
/** 僅有平台後綴、可能造成 Metro 索取通用檔名的前綴 */
const prefixes = ['back-icon', 'search-icon'];

for (const prefix of prefixes) {
  for (const scale of scales) {
    const from = path.join(assetsDir, `${prefix}@${scale}.ios.png`);
    const to = path.join(assetsDir, `${prefix}@${scale}.png`);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, to);
    }
  }
}
