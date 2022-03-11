export function createBundle(ipaUrl, inputOptions) {
    const options = Object.assign({
        outDir: ".",
        htmlFile: "index.html",
        manifestFile: "manifest.plist",
    }, inputOptions);
    return {
        [options.htmlFile]: html(options.manifestFile, options),
        [options.manifestFile]: manifest(ipaUrl, options),
    };
}
export function writeBundle(ipaUrl, inputOptions) {
    const { writeFile } = require("fs");
    const { promisify } = require('util');
    const assets = createBundle(ipaUrl, inputOptions);
    return Promise.all(Object.entries(assets).map(([file, data]) => promisify(writeFile)(file, data, { encoding: "utf8" })));
}
export function link(manifest) {
    return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifest)}`;
}
export function html(manifest, options) {
    return `<a href="${link(manifest)}">Install ${options.appTitle} (${options.bundleVersion})</a>`;
}
export function manifest(ipa, options) {
    return `
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
    <dict>
      <key>items</key>
      <array>
        <dict>
          <key>assets</key>
          <array>
            <dict>
              <key>kind</key>
              <string>software-package</string>
              <key>url</key>
              <string>${ipa}</string>
            </dict>
          </array>
          <key>metadata</key>
          <dict>
            <key>bundle-identifier</key>
            <string>${options.bundleIdentifier}</string>
            <key>bundle-version</key>
            <string>${options.bundleVersion}</string>
            <key>kind</key>
            <string>software</string>
            <key>title</key>
            <string>${options.appTitle}</string>
          </dict>
        </dict>
      </array>
    </dict>
  </plist>
  `.trim();
}
