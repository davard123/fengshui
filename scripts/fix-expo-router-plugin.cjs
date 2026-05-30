const fs = require("fs");
const path = require("path");

const pluginDir = path.join(__dirname, "..", "node_modules", "expo-router", "plugin");
const pluginEntry = path.join(pluginDir, "index.js");
const source = 'module.exports = require("./build");\n';

try {
  if (!fs.existsSync(pluginDir)) {
    process.exit(0);
  }

  if (!fs.existsSync(pluginEntry) || fs.readFileSync(pluginEntry, "utf8") !== source) {
    fs.writeFileSync(pluginEntry, source, "utf8");
  }
} catch (error) {
  console.warn("[postinstall] Unable to ensure expo-router/plugin entry:", error.message);
}
