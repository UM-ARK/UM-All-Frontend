const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const DISCOURSE_REVISION =
    '1979c9ee121896749bfa56d1e0d55d1098e9f21a';
const DISCOURSE_EMOJI_DATA_URL =
    'https://raw.githubusercontent.com/discourse/discourse/' +
    `${DISCOURSE_REVISION}/frontend/pretty-text/addon/emoji/data.js`;
const OUTPUT_PATH = path.resolve(
    __dirname,
    '../src/utils/harbor/harborDiscourseEmojiShortcodes.json',
);

const extractObject = (source, name) => {
    const prefix = `export const ${name} = `;
    const start = source.indexOf(prefix);
    if (start < 0) {
        throw new Error(`找不到 Discourse ${name} 資料`);
    }
    const valueStart = start + prefix.length;
    const valueEnd = source.indexOf('\n};', valueStart);
    if (valueEnd < 0) {
        throw new Error(`無法解析 Discourse ${name} 資料`);
    }
    return vm.runInNewContext(`(${source.slice(valueStart, valueEnd + 2)})`);
};

const main = async () => {
    const response = await fetch(DISCOURSE_EMOJI_DATA_URL);
    if (!response.ok) {
        throw new Error(`下載 Discourse Emoji 資料失敗：${response.status}`);
    }
    const source = await response.text();
    const aliases = extractObject(source, 'aliases');
    const replacements = extractObject(source, 'replacements');
    const shortcodes = {};

    Object.entries(replacements).forEach(([unicode, name]) => {
        shortcodes[name] = unicode;
    });
    Object.entries(aliases).forEach(([name, aliasNames]) => {
        const unicode = shortcodes[name];
        if (!unicode) {
            return;
        }
        aliasNames.forEach(aliasName => {
            shortcodes[aliasName] = unicode;
        });
    });

    const sortedShortcodes = Object.fromEntries(
        Object.entries(shortcodes).sort(([left], [right]) =>
            left.localeCompare(right, 'en'),
        ),
    );
    if (
        Object.keys(sortedShortcodes).length < 4000 ||
        sortedShortcodes.smirking_face !== '😏' ||
        sortedShortcodes['waving_hand:t2'] !== '👋🏻'
    ) {
        throw new Error('Discourse Emoji 靜態映射驗證失敗');
    }
    await fs.writeFile(
        OUTPUT_PATH,
        `${JSON.stringify(sortedShortcodes)}\n`,
        'utf8',
    );
    console.log(
        `已生成 ${Object.keys(sortedShortcodes).length} 個 Discourse Emoji shortcode`,
    );
};

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
