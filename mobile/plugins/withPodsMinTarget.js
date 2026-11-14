// Xcode 27 rejects pod targets below iOS 15 (RNSVG, AsyncStorage ship 12.4/13.4). Raise them in Podfile post_install.
const { withPodfile } = require('expo/config-plugins');

const MARK = '# orbit: pods min deployment target';
const SNIPPET = `
    ${MARK}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1' if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
      end
    end`;

module.exports = (config) =>
  withPodfile(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (!src.includes(MARK)) cfg.modResults.contents = src.replace(/post_install do \|installer\|/, (m) => m + SNIPPET);
    return cfg;
  });
