const {
  withDangerousMod,
  withAndroidManifest,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function copyFileSync(source, target) {
  let targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, target) {
  let files = [];

  // Check if folder needs to be created or integrated
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const withAndroidWidget = (config) => {
  // Step 1: Copy widget files
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidPath = path.join(projectRoot, "android");
      const widgetSourcePath = path.join(projectRoot, "widgets", "android", "src", "main");

      // Copy Java/Kotlin files for widget provider (to app package)
      const javaSourcePath = path.join(widgetSourcePath, "java", "package_name");
      const javaTargetPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "java",
        "com",
        "kumasan11251",
        "pivotlog"
      );
      ensureDir(javaTargetPath);

      // Copy PivotLogWidgetProvider.kt to app package
      const providerFile = path.join(javaSourcePath, "PivotLogWidgetProvider.kt");
      if (fs.existsSync(providerFile)) {
        const targetFile = path.join(javaTargetPath, "PivotLogWidgetProvider.kt");
        fs.writeFileSync(targetFile, fs.readFileSync(providerFile, "utf8"));
      }

      // Copy WidgetBridgeModule.kt to app package
      const bridgeModuleFile = path.join(javaSourcePath, "WidgetBridgeModule.kt");
      if (fs.existsSync(bridgeModuleFile)) {
        const targetFile = path.join(javaTargetPath, "WidgetBridgeModule.kt");
        fs.writeFileSync(targetFile, fs.readFileSync(bridgeModuleFile, "utf8"));
      }

      // Copy WidgetBridgePackage.kt to app package
      const bridgePackageFile = path.join(javaSourcePath, "WidgetBridgePackage.kt");
      if (fs.existsSync(bridgePackageFile)) {
        const targetFile = path.join(javaTargetPath, "WidgetBridgePackage.kt");
        fs.writeFileSync(targetFile, fs.readFileSync(bridgePackageFile, "utf8"));
      }

      // Modify MainApplication.kt to add WidgetBridgePackage
      const mainAppPath = path.join(javaTargetPath, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let mainAppContent = fs.readFileSync(mainAppPath, "utf8");

        // Check if WidgetBridgePackage is already added
        if (!mainAppContent.includes("WidgetBridgePackage")) {
          // Add package to imports
          mainAppContent = mainAppContent.replace(
            "import expo.modules.ApplicationLifecycleDispatcher",
            "import expo.modules.ApplicationLifecycleDispatcher\nimport com.kumasan11251.pivotlog.WidgetBridgePackage"
          );

          // Add package to getPackages()
          mainAppContent = mainAppContent.replace(
            "PackageList(this).packages.apply {",
            "PackageList(this).packages.apply {\n              add(WidgetBridgePackage())"
          );

          fs.writeFileSync(mainAppPath, mainAppContent);
        }
      }

      // Copy Module.kt to expo.modules.widgets package (keep for potential future use)
      const moduleFile = path.join(javaSourcePath, "Module.kt");
      if (fs.existsSync(moduleFile)) {
        const expoModulesPath = path.join(
          androidPath,
          "app",
          "src",
          "main",
          "java",
          "expo",
          "modules",
          "widgets"
        );
        ensureDir(expoModulesPath);
        const targetModuleFile = path.join(expoModulesPath, "ExpoWidgetsModule.kt");
        fs.writeFileSync(targetModuleFile, fs.readFileSync(moduleFile, "utf8"));
      }

      // Copy res/layout files
      const layoutSourcePath = path.join(widgetSourcePath, "res", "layout");
      const layoutTargetPath = path.join(androidPath, "app", "src", "main", "res", "layout");
      ensureDir(layoutTargetPath);

      if (fs.existsSync(layoutSourcePath)) {
        fs.readdirSync(layoutSourcePath).forEach((file) => {
          copyFileSync(path.join(layoutSourcePath, file), layoutTargetPath);
        });
      }

      // Copy res/xml files
      const xmlSourcePath = path.join(widgetSourcePath, "res", "xml");
      const xmlTargetPath = path.join(androidPath, "app", "src", "main", "res", "xml");
      ensureDir(xmlTargetPath);

      if (fs.existsSync(xmlSourcePath)) {
        fs.readdirSync(xmlSourcePath).forEach((file) => {
          copyFileSync(path.join(xmlSourcePath, file), xmlTargetPath);
        });
      }

      // Copy res/drawable files
      const drawableSourcePath = path.join(widgetSourcePath, "res", "drawable");
      const drawableTargetPath = path.join(androidPath, "app", "src", "main", "res", "drawable");
      ensureDir(drawableTargetPath);

      if (fs.existsSync(drawableSourcePath)) {
        fs.readdirSync(drawableSourcePath).forEach((file) => {
          copyFileSync(path.join(drawableSourcePath, file), drawableTargetPath);
        });
      }

      // Merge values/strings.xml for widget
      const stringsSourcePath = path.join(widgetSourcePath, "res", "values", "strings.xml");
      const stringsTargetPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "res",
        "values",
        "strings.xml"
      );

      if (fs.existsSync(stringsSourcePath) && fs.existsSync(stringsTargetPath)) {
        let targetStrings = fs.readFileSync(stringsTargetPath, "utf8");
        const sourceStrings = fs.readFileSync(stringsSourcePath, "utf8");

        // Extract widget_name string from source
        const widgetNameMatch = sourceStrings.match(
          /<string name="widget_name">.*?<\/string>/
        );
        if (widgetNameMatch && !targetStrings.includes('name="widget_name"')) {
          // Insert before closing </resources>
          targetStrings = targetStrings.replace(
            "</resources>",
            `  ${widgetNameMatch[0]}\n</resources>`
          );
        }

        // Extract widget_description string from source
        const widgetDescMatch = sourceStrings.match(
          /<string name="widget_description">.*?<\/string>/
        );
        if (widgetDescMatch && !targetStrings.includes('name="widget_description"')) {
          // Insert before closing </resources>
          targetStrings = targetStrings.replace(
            "</resources>",
            `  ${widgetDescMatch[0]}\n</resources>`
          );
        }

        fs.writeFileSync(stringsTargetPath, targetStrings);
      }

      // Merge values/colors.xml for widget
      const colorsSourcePath = path.join(widgetSourcePath, "res", "values", "colors.xml");
      const colorsTargetPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "res",
        "values",
        "colors.xml"
      );

      if (fs.existsSync(colorsSourcePath) && fs.existsSync(colorsTargetPath)) {
        let targetColors = fs.readFileSync(colorsTargetPath, "utf8");
        const sourceColors = fs.readFileSync(colorsSourcePath, "utf8");

        // Extract all color definitions from source
        const colorMatches = sourceColors.match(/<color name="widget_[^"]*">[^<]*<\/color>/g);
        if (colorMatches) {
          colorMatches.forEach((colorDef) => {
            const colorName = colorDef.match(/name="([^"]*)"/)[1];
            if (!targetColors.includes(`name="${colorName}"`)) {
              // Insert before closing </resources>
              targetColors = targetColors.replace(
                "</resources>",
                `  ${colorDef}\n</resources>`
              );
            }
          });
          fs.writeFileSync(colorsTargetPath, targetColors);
        }
      }

      // Copy res/drawable-night files for dark mode
      const drawableNightSourcePath = path.join(widgetSourcePath, "res", "drawable-night");
      const drawableNightTargetPath = path.join(androidPath, "app", "src", "main", "res", "drawable-night");
      ensureDir(drawableNightTargetPath);

      if (fs.existsSync(drawableNightSourcePath)) {
        fs.readdirSync(drawableNightSourcePath).forEach((file) => {
          copyFileSync(path.join(drawableNightSourcePath, file), drawableNightTargetPath);
        });
      }

      // Merge values-night/colors.xml for dark mode widget
      const colorsNightSourcePath = path.join(widgetSourcePath, "res", "values-night", "colors.xml");
      const colorsNightTargetPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "res",
        "values-night",
        "colors.xml"
      );

      ensureDir(path.dirname(colorsNightTargetPath));

      if (fs.existsSync(colorsNightSourcePath)) {
        if (fs.existsSync(colorsNightTargetPath)) {
          // Merge with existing colors
          let targetColors = fs.readFileSync(colorsNightTargetPath, "utf8");
          const sourceColors = fs.readFileSync(colorsNightSourcePath, "utf8");

          const colorMatches = sourceColors.match(/<color name="widget_[^"]*">[^<]*<\/color>/g);
          if (colorMatches) {
            colorMatches.forEach((colorDef) => {
              const colorName = colorDef.match(/name="([^"]*)"/)[1];
              if (!targetColors.includes(`name="${colorName}"`)) {
                targetColors = targetColors.replace(
                  "</resources>",
                  `  ${colorDef}\n</resources>`
                );
              }
            });
            fs.writeFileSync(colorsNightTargetPath, targetColors);
          }
        } else {
          // Copy the file as is
          copyFileSync(colorsNightSourcePath, colorsNightTargetPath);
        }
      }

      return config;
    },
  ]);

  // Step 2: Add widget receiver to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Check if receiver already exists
    const receivers = application.receiver || [];
    const widgetReceiverExists = receivers.some(
      (r) => r.$["android:name"] === ".PivotLogWidgetProvider"
    );

    if (!widgetReceiverExists) {
      if (!application.receiver) {
        application.receiver = [];
      }

      application.receiver.push({
        $: {
          "android:name": ".PivotLogWidgetProvider",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/pivot_log_widget_info",
            },
          },
        ],
      });
    }

    return config;
  });

  return config;
};

module.exports = withAndroidWidget;
