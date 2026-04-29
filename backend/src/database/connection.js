const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { dbFile } = require("../config/appConfig");

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new sqlite3.Database(dbFile);
db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA busy_timeout = 5000");

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = { db, run, get, all };
