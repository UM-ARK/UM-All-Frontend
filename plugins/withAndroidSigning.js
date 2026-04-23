const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_BLOCK = `
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile new File(rootProject.projectDir.parentFile, MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }`;

function injectReleaseSigningConfig(contents) {
    if (contents.includes('MYAPP_RELEASE_STORE_FILE')) return contents;

    const signingStart = contents.indexOf('signingConfigs {');
    if (signingStart === -1) return contents;

    const debugStart = contents.indexOf('debug {', signingStart);
    if (debugStart === -1) return contents;

    // 找 debug { } 的結尾 }
    let depth = 0;
    let debugEnd = -1;
    for (let i = debugStart; i < contents.length; i++) {
        if (contents[i] === '{') depth++;
        else if (contents[i] === '}') {
            depth--;
            if (depth === 0) { debugEnd = i; break; }
        }
    }
    if (debugEnd === -1) return contents;

    // 在 debug } 後插入 release block
    return (
        contents.slice(0, debugEnd + 1) +
        RELEASE_SIGNING_BLOCK +
        contents.slice(debugEnd + 1)
    );
}

function switchToReleaseSigning(contents) {
    // buildTypes.release 裡的 signingConfig 從 debug 改為 release（只改一次）
    return contents.replace(
        /(\bbuildTypes\b[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
        '$1signingConfig signingConfigs.release'
    );
}

module.exports = function withAndroidSigning(config) {
    return withAppBuildGradle(config, (mod) => {
        let contents = mod.modResults.contents;
        contents = injectReleaseSigningConfig(contents);
        contents = switchToReleaseSigning(contents);
        mod.modResults.contents = contents;
        return mod;
    });
};
