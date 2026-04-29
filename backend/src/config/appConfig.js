const path = require("path");
const os = require("os");

const rootDir = path.resolve(__dirname, "..", "..");
const requestedDbFile = process.env.DB_FILE;

module.exports = {
  port: process.env.PORT || 4000,
  dbFile: requestedDbFile
    ? requestedDbFile === ":memory:"
      ? requestedDbFile
      : path.resolve(rootDir, requestedDbFile)
    : path.resolve(os.tmpdir(), "caltrackr", "caltrackr-dev.sqlite"),
  defaultUserId: 1
};
