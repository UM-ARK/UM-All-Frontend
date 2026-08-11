module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // 必須放在 overrides：@react-native 對 *.js 使用 babel parser，根級 rules 不會生效
      files: ['*.js', '*.jsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react-native',
                importNames: ['Text', 'TextInput'],
                message:
                  'Text 請改用 src/components/AppText；TextInput 請改用 src/components/AppTextInput（皆為 default import，本地名稱可維持 Text／TextInput）。',
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        'src/components/AppText.js',
        'src/components/AppTextInput.js',
      ],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
