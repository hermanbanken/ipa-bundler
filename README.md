# IPA Bundler
Just like bundler but in NPM format so you can easily run this on CI/CD.

Example:
```typescript
import { writeBundle } from "ipa-bundler"
const relativeIpaUrl = "./my.ipa"

const opts = {
    appTitle: "Foo",
    bundleVersion: "1.0.0",
    bundleIdentifier: "com.example",
};
await writeBundle(relativeIpaUrl, opts);

// or with extra options:
await writeBundle(relativeIpaUrl, {
    ...opts,
    outDir: "public",
});
```

## Options

|- Option -|- Description -|- Default -|
|----------|---------------|-----------|
| outDir | Where to write the html and manifest files | . |
| htmlFile | How to name the html file, relative to outDir | index.html |
| manifestFile | How to name the manifest file, relative to outDir | manifest.plist |
| bundleVersion | Which (marketing) version the IPA is | 1.0.0 |
| bundleIdentifier | Which identifier the IPA uses | com.example |
| appTitle | Which title the IPA uses | MyApp |

## References
1. https://stackoverflow.com/questions/23561370/download-and-install-an-ipa-from-self-hosted-url-on-ios
