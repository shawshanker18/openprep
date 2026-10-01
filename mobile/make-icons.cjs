// Regenerates the Android launcher, notification and splash images from the OpenPrep mark (run from repo root).
const sharp = require("sharp");
const path = require("node:path");
const RES = path.join(__dirname, "android/app/src/main/res");
const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
(async () => {
  for (const [d, k] of Object.entries(D)) {
    const legacy = Math.round(48 * k), fg = Math.round(108 * k), stat = Math.round(24 * k);
    const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#171717"/><circle cx="256" cy="256" r="138" fill="none" stroke="#fafafa" stroke-width="56"/></svg>`;
    const round = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="#171717"/><circle cx="256" cy="256" r="130" fill="none" stroke="#fafafa" stroke-width="52"/></svg>`;
    // Adaptive foreground: the mark sits in the middle 66% safe zone of a 108dp canvas.
    const fore = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><circle cx="54" cy="54" r="17" fill="none" stroke="#fafafa" stroke-width="7"/></svg>`;
    const statSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="#ffffff" stroke-width="3"/></svg>`;
    await sharp(Buffer.from(full)).resize(legacy, legacy).png().toFile(`${RES}/mipmap-${d}/ic_launcher.png`);
    await sharp(Buffer.from(round)).resize(legacy, legacy).png().toFile(`${RES}/mipmap-${d}/ic_launcher_round.png`);
    await sharp(Buffer.from(fore)).resize(fg, fg).png().toFile(`${RES}/mipmap-${d}/ic_launcher_foreground.png`);
    await sharp(Buffer.from(statSvg)).resize(stat, stat).png().toFile(`${RES}/drawable-${d}/ic_stat_openprep.png`).catch(async () => {
      require("node:fs").mkdirSync(`${RES}/drawable-${d}`, { recursive: true });
      await sharp(Buffer.from(statSvg)).resize(stat, stat).png().toFile(`${RES}/drawable-${d}/ic_stat_openprep.png`);
    });
    for (const o of ["port", "land"]) {
      const [w, h] = o === "port" ? [Math.round(320 * k), Math.round(480 * k)] : [Math.round(480 * k), Math.round(320 * k)];
      const m = Math.round(Math.min(w, h) * 0.28);
      const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#0a0a0a"/><circle cx="${w / 2}" cy="${h / 2}" r="${m / 2}" fill="none" stroke="#fafafa" stroke-width="${m / 7}"/></svg>`;
      await sharp(Buffer.from(splash)).png().toFile(`${RES}/drawable-${o}-${d}/splash.png`);
    }
  }
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="#0a0a0a"/><circle cx="240" cy="240" r="60" fill="none" stroke="#fafafa" stroke-width="18"/></svg>`;
  await sharp(Buffer.from(s)).png().toFile(`${RES}/drawable/splash.png`);
  console.log("icons done");
})();
