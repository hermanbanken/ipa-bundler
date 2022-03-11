#! /usr/bin/env node
import { iOS, iOSInformation } from "app-bundle-info";
import { write } from "fs";

type OptOptions = {
  outDir: string;
  htmlFile: string;
  manifestFile: string;
}

type AppDetails = {
  bundleVersion: string;
  bundleMarketingVersion: string;
  bundleIdentifier: string;
  appTitle: string;
  appIcon: Buffer;
};

type ReqOptions = {
  /**
  * Absolute url, or relative to manifest file (and html file)
  */
  ipaUrl: string;
} & (AppDetails | { ipaPath: string });

type Options = ReqOptions & OptOptions;
type InputOptions = ReqOptions & Partial<OptOptions>;

if (require.main === module) {
  const [ipaPath] = process.argv.slice(2);
  if (!ipaPath) {
    console.log("Usage: ipa-bundler <ipa-file>");
  } else {
    writeBundle({ ipaPath: ipaPath, ipaUrl: ipaPath }).catch(console.error);
  }
}

function hasIpaPath(opt: InputOptions): opt is ReqOptions & { ipaPath: string } {
  return "ipaPath" in opt && typeof opt.ipaPath === "string";
}

export async function createBundle(inputOptions: InputOptions) {
  const options: Options = Object.assign<OptOptions,typeof inputOptions>({
    outDir: ".",
    htmlFile: "index.html",
    manifestFile: "manifest.plist",
  }, inputOptions);

  if (hasIpaPath(options)) {
    const { createReadStream } = await import("fs");
    let module: typeof import("app-bundle-info");
    try {
      module = await import("app-bundle-info");
    } catch (e) {
      throw new Error("When setting ipaPath, the optional dependency app-bundle-info must be installed.");
    }
    const bundle = new module.iOS(createReadStream(options.ipaPath));
    const info = await new Promise<iOSInformation>((resolve, reject) => bundle.loadInfo((err, info) => err ? reject(err) : resolve(info)));
    const appDetails = Object.assign<InputOptions, AppDetails>(options, {
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

export async function writeBundle(inputOptions: InputOptions) {
  const { writeFile } = require("fs");
  const { promisify } = require('util');
  const assets = await createBundle(inputOptions);
  return Promise.all(Object.entries(assets).map(([file, data]) => promisify(writeFile)(file, data, { encoding: "utf8"})));
}

export function link(manifest: string ) {
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifest)}`
}

export function html(manifest: string, options: AppDetails) {
  const maybeImage = options.appIcon ? `<img width=200 height=200 src="data:image/png;base64,${options.appIcon.toString("base64url")}" /> ` : "";
  return `
<a href="${link(manifest)}">
  ${maybeImage}
  <span class="caption">Install <span class="title">${options.appTitle}</span> (${options.bundleMarketingVersion} / ${options.bundleVersion})</span>
</a>`.trim();
}

export function manifest(ipaUrl: string, options: AppDetails) {
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

function parseImage(bundle: iOS) {
  return new Promise<Buffer>((resolve, reject) => bundle.getIconFile((err, iconStream) => {
    if (err) {
      return reject(err);
    }
    var bufs = [];
    iconStream.on('data', (d) => bufs.push(d));
    iconStream.on('end', () => resolve(Buffer.concat(bufs)));
  }));
}