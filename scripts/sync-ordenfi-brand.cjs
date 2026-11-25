/* Reproduce web assets from the owner's unchanged source image. */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const source = path.resolve("public/brand/ordenfi-logo-original.jpg");
  const image = fs.readFileSync(source);
  const imageUrl = "data:image/jpeg;base64," + image.toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254"><title>Ordenfi</title><image width="1254" height="1254" href="${imageUrl}"/></svg>`;
  for (const name of ["ordenfi-mark.svg", "ordenfi-main.svg", "ordenfi-wordmark.svg"]) {
    fs.writeFileSync(path.resolve("public/brand", name), svg);
  }
  for (const [file, size] of [["brand/ordenfi-logo.png", 256], ["icon-32.png", 32], ["icon-180.png", 180], ["apple-icon.png", 180], ["logo-light.png", 512]]) {
    await sharp(image).resize(size, size).png().toFile(path.resolve("public", file));
  }
  const png = await sharp(image).resize(32, 32).png().toBuffer();
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  ico[6] = 32; ico[7] = 32;
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
  fs.writeFileSync(path.resolve("public/favicon.ico"), Buffer.concat([ico, png]));

  const socialPath = path.resolve("public/brand/ordenfi-social.svg");
  let social = fs.readFileSync(socialPath, "utf8");
  social = social.replace(/<g transform="translate\(72 48\)">[\s\S]*?<\/g>|<image x="72"[^>]*\/>/, `<image x="72" y="44" width="44" height="44" href="${imageUrl}"/>`)
    .replace(/#e9bd75/gi, "#B9FA0A");
  fs.writeFileSync(socialPath, social);
  await sharp(Buffer.from(social)).png().toFile(path.resolve("public/og.png"));
  console.log("Synced supplied Ordenfi logo, app icons, favicon, and social preview.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
