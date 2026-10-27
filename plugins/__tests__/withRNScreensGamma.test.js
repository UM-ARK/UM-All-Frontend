const withRNScreensGamma = require('../withRNScreensGamma');

jest.mock('expo/config-plugins', () => ({
    withPodfile: (config, action) => action(config),
}));

describe('withRNScreensGamma', () => {
    it('在載入原生依賴前啟用列表標記，保留原本的 Podfile', () => {
        const contents = "require 'expo/autolinking'\n";
        const config = { modResults: { contents } };

        withRNScreensGamma(config);

        expect(config.modResults.contents).toBe(
            "ENV['RNS_GAMMA_ENABLED'] = '1'\n" + contents,
        );
    });

    it('重複 prebuild 不會累加設定', () => {
        const config = { modResults: { contents: "require 'expo/autolinking'\n" } };
        withRNScreensGamma(config);
        const first = config.modResults.contents;

        withRNScreensGamma(config);

        expect(config.modResults.contents).toBe(first);
    });
});
