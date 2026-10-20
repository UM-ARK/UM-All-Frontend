const { withPodfile } = require('expo/config-plugins');

const HEADER_FIX = `    # 相容 RN Menu 的引號匯入與 React Native 預編譯框架。
    installer.pods_project.targets.each do |target|
      next unless target.name == 'react-native-menu'
      target.build_configurations.each do |build_config|
        paths = Array(build_config.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)')
        build_config.build_settings['HEADER_SEARCH_PATHS'] = (paths + [
          '$(PODS_XCFRAMEWORKS_BUILD_DIR)/React-Core-prebuilt/React.framework/Headers'
        ]).uniq
      end
    end
`;

module.exports = function withRNMenuHeaders(config) {
    return withPodfile(config, mod => {
        const contents = mod.modResults.contents;
        if (contents.includes(HEADER_FIX)) return mod;

        const anchor = '  post_install do |installer|';
        if (!contents.includes(anchor)) {
            throw new Error('找不到 RN Menu 標頭設定的 Podfile post_install 區塊。');
        }
        mod.modResults.contents = contents.replace(anchor, `${anchor}\n${HEADER_FIX}`);
        return mod;
    });
};
