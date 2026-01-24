/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "PivotLogWidget",
  displayName: "PivotLog",
  deploymentTarget: "16.0",
  colors: {
    // プライマリカラー (sage green)
    $accent: "#8B9D83",
    $widgetBackground: {
      light: "#FFFFFF",
      dark: "#1C1C1E",
    },
  },
  entitlements: {
    "com.apple.security.application-groups": [
      `group.${config.ios.bundleIdentifier}.expowidgets`,
    ],
  },
});
