const { withPodfile } = require('expo/config-plugins');

const GAMMA_SETTING = "ENV['RNS_GAMMA_ENABLED'] = '1'";

module.exports = function withRNScreensGamma(config) {
    return withPodfile(config, mod => {
        if (!mod.modResults.contents.includes(GAMMA_SETTING)) {
            // 列表標記需要編入 Screens 的 Gamma 原生元件。
            mod.modResults.contents = `${GAMMA_SETTING}\n${mod.modResults.contents}`;
        }
        return mod;
    });
};
