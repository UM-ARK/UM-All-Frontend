const { withPodfile } = require('@expo/config-plugins');

module.exports = function withRNFirebaseDisableSPM(config) {
    return withPodfile(config, mod => {
        const setting = '$RNFirebaseDisableSPM = true';

        if (!mod.modResults.contents.includes(setting)) {
            mod.modResults.contents = mod.modResults.contents.replace(
                'prepare_react_native_project!',
                `${setting}\n\nprepare_react_native_project!`,
            );
        }

        return mod;
    });
};