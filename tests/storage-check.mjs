import assert from "node:assert/strict";
import {
  createEmptyProfileData,
  createProfile,
  initializeProfiles,
  listProfiles,
  loadProfileData,
  sanitizeProfileData,
  saveProfileData,
  storageKeys
} from "../src/js/storage.js";

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value))
};

memory.set(storageKeys.LEGACY_KEY, JSON.stringify({
  version: 1,
  answeredIds: ["q1"],
  totalAttempts: 3,
  correctAttempts: 2,
  wrongIds: ["q2"],
  sequentialIndex: 8
}));

initializeProfiles();
const migratedProfiles = listProfiles();
assert.equal(migratedProfiles.length, 1, "旧进度应迁移成一个本地档案");
assert.equal(migratedProfiles[0].name, "原有用户");
assert.equal(loadProfileData(migratedProfiles[0].id).totalAttempts, 3);
assert.ok(memory.has(storageKeys.LEGACY_KEY), "迁移后应保留旧存储作为备份");

const alice = createProfile(" Alice ");
const bob = createProfile("Bob");
assert.equal(alice.name, "Alice", "昵称应去除首尾空格");
assert.throws(() => createProfile("alice"), /已存在/, "昵称应忽略大小写保持唯一");

const aliceData = createEmptyProfileData();
aliceData.totalAttempts = 5;
assert.equal(saveProfileData(alice.id, aliceData), true);
assert.equal(loadProfileData(alice.id).totalAttempts, 5);
assert.equal(loadProfileData(bob.id).totalAttempts, 0, "不同档案的数据必须隔离");

const dirty = createEmptyProfileData();
dirty.answeredIds = ["q1", "missing", "q1"];
dirty.wrongIds = ["q2", "missing"];
dirty.sequentialIndex = 99;
const clean = sanitizeProfileData(dirty, [{ id: "q1" }, { id: "q2" }]);
assert.deepEqual(clean.answeredIds, ["q1"]);
assert.deepEqual(clean.wrongIds, ["q2"]);
assert.equal(clean.sequentialIndex, 1);

console.log("本地档案检查通过：迁移、重名校验、隔离和清理正常。");
