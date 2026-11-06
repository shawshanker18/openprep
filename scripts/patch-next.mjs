import fs from "node:fs";
import path from "node:path";

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, "utf8");
  let modified = false;
  if (content.includes("headers.hasOwnProperty(")) {
    content = content.replaceAll("headers.hasOwnProperty(", "Object.prototype.hasOwnProperty.call(headers, ");
    modified = true;
  }
  if (content.includes("rawHeaders.hasOwnProperty(")) {
    content = content.replaceAll("rawHeaders.hasOwnProperty(", "Object.prototype.hasOwnProperty.call(rawHeaders, ");
    modified = true;
  }
  if (modified) {
    fs.writeFileSync(file, content, "utf8");
  }
}

try {
  patchFile("node_modules/next/dist/server/api-utils/index.js");
  const compiledDir = "node_modules/next/dist/compiled/next-server";
  if (fs.existsSync(compiledDir)) {
    for (const f of fs.readdirSync(compiledDir)) {
      if (f.endsWith(".js")) {
        patchFile(path.join(compiledDir, f));
      }
    }
  }
} catch {
  // best effort
}
