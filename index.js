#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifest = exports.html = exports.link = exports.writeBundle = exports.createBundle = void 0;
if (require.main === module) {
    const [ipaPath] = process.argv.slice(2);
    if (!ipaPath) {
        console.log("Usage: ipa-bundler <ipa-file>");
    }
    else {
        writeBundle({ ipaPath: ipaPath, ipaUrl: ipaPath }).catch(console.error);
    }
}
function hasIpaPath(opt) {
    return "ipaPath" in opt && typeof opt.ipaPath === "string";
}
async function createBundle(inputOptions) {
    const options = Object.assign({
        outDir: ".",
        htmlFile: "index.html",
        manifestFile: "manifest.plist",
    }, inputOptions);
    if (hasIpaPath(options)) {
        const { createReadStream } = await Promise.resolve().then(() => require("fs"));
        let module;
        try {
            module = await Promise.resolve().then(() => require("app-bundle-info"));
        }
        catch (e) {
            throw new Error("When setting ipaPath, the optional dependency app-bundle-info must be installed.");
        }
        const bundle = new module.iOS(createReadStream(options.ipaPath));
        const info = await new Promise((resolve, reject) => bundle.loadInfo((err, info) => err ? reject(err) : resolve(info)));
        const appDetails = Object.assign(options, {
            bundleIdentifier: info.CFBundleIdentifier,
            bundleVersion: info.CFBundleVersion,
            bundleMarketingVersion: info.CFBundleShortVersionString,
            appTitle: info.CFBundleDisplayName || info.CFBundleName,
            appIcon: await parseImage(bundle),
        });
        return {
            [options.htmlFile]: html(options.manifestFile, appDetails),
            [options.manifestFile]: manifest(options.ipaUrl, appDetails),
        };
    }
    return {
        [options.htmlFile]: html(options.manifestFile, options),
        [options.manifestFile]: manifest(options.ipaUrl, options),
    };
}
exports.createBundle = createBundle;
async function writeBundle(inputOptions) {
    const { writeFile } = require("fs");
    const { promisify } = require('util');
    const assets = await createBundle(inputOptions);
    return Promise.all(Object.entries(assets).map(([file, data]) => promisify(writeFile)(file, data, { encoding: "utf8" })));
}
exports.writeBundle = writeBundle;
function link(manifest) {
    return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifest)}`;
}
exports.link = link;
function html(manifest, options) {
    const maybeImage = options.appIcon ? `<img width=200 height=200 src="data:image/${extension(options.appIcon)};base64,${options.appIcon.toString("base64")}" /> ` : "";
    return `
<a href="${link(manifest)}">
  ${maybeImage}
  <span class="caption">Install <span class="title">${options.appTitle}</span> (${options.bundleMarketingVersion} / ${options.bundleVersion})</span>
</a>`.trim();
}
exports.html = html;
function manifest(ipaUrl, options) {
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
              <string>${ipaUrl}</string>
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
exports.manifest = manifest;
function parseImage(bundle) {
    return new Promise((resolve, reject) => bundle.getIconFile((err, iconStream) => {
        if (err) {
            return reject(err);
        }
        var bufs = [];
        iconStream.on('data', (d) => bufs.push(d));
        iconStream.on('end', () => resolve(Buffer.concat(bufs)));
    }));
}
// https://stackoverflow.com/questions/27886677/javascript-get-extension-from-base64-image
function extension(buf) {
    switch (buf.slice(0, 2).toString("hex")) {
        case "ffd8": return "jpg";
        case "8950": return "png";
        default: return "unknown"; // probably not ideal
    }
}
