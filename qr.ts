#! /usr/bin/env node
if (require.main === module) {
  let [url, size] = process.argv.slice(2);
  process.stdout.write(qr(url, size));
  process.stderr.write("\n");
}

export function qr(url, size) {
  size = encodeURIComponent(size || "150");
  if (!url) {
    console.log("Usage: qr <url> <size>");
    process.exit(1);
  } else {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  }
}
