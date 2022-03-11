#! /usr/bin/env node
import { iOS, iOSInformation } from "app-bundle-info";
import { basename } from "path";

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
  baseURL: string;
} & (AppDetails | { ipaPath: string });

type Options = ReqOptions & OptOptions;
type InputOptions = ReqOptions & Partial<OptOptions>;

if (require.main === module) {
  const [ipaPath, baseURL] = process.argv.slice(2);
  if (!ipaPath || !baseURL) {
    console.log("Usage: ipa-bundler <ipa-file> <baseurl>");
  } else {
    writeBundle({ ipaPath: ipaPath, baseURL: baseURL }).catch(console.error);
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

  const manifestUrl = new URL(basename(options.manifestFile), options.baseURL).toString();
  const ipaUrl = new URL(basename(options.manifestFile), options.baseURL).toString();

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
      [options.htmlFile]: html(manifestUrl, appDetails),
      [options.manifestFile]: manifest(ipaUrl, appDetails),
    };
  }
  return {
    [options.htmlFile]: html(manifestUrl, options),
    [options.manifestFile]: manifest(ipaUrl, options),
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

export function html(manifestUrl: string, options: AppDetails) {
  const maybeImage = options.appIcon ? `<img width=200 height=200 src="data:image/${extension(options.appIcon)};base64,${options.appIcon.toString("base64")}" /> ` : "";
  return `
<a href="${link(manifestUrl)}">
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

// https://stackoverflow.com/questions/27886677/javascript-get-extension-from-base64-image
function extension(buf: Buffer) {
  switch (buf.slice(0, 2).toString("hex")) {
      case "ffd8": return "jpg";
      case "8950": return "png";
      default: return "unknown" // probably not ideal
  }
}