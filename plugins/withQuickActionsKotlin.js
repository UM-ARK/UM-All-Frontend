const { withProjectBuildGradle } = require('expo/config-plugins');

const KOTLIN_COMPAT = `
// expo-quick-actions 6.0.2 的型別推導尚未相容 Kotlin 2.3+，僅保留此套件的 2.2 語言模式。
subprojects { subproject ->
  if (subproject.name == 'expo-quick-actions') {
    subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      compilerOptions.languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_2)
    }
  }
}
`;

module.exports = function withQuickActionsKotlin(config) {
    if (require('expo-quick-actions/package.json').version !== '6.0.2') return config;

    return withProjectBuildGradle(config, mod => {
        if (!mod.modResults.contents.includes(KOTLIN_COMPAT)) {
            mod.modResults.contents += KOTLIN_COMPAT;
        }
        return mod;
    });
};
