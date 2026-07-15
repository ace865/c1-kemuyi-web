const LEGACY_KEY = "c1-kemuyi-progress-v1";
const REGISTRY_KEY = "c1-kemuyi-profiles-v2";
const PROFILE_KEY_PREFIX = "c1-kemuyi-profile-v2:";
const DATA_VERSION = 2;
const MAX_HISTORY = 20;

export function createEmptyProfileData() {
  return {
    version: DATA_VERSION,
    answeredIds: [],
    totalAttempts: 0,
    correctAttempts: 0,
    wrongIds: [],
    sequentialIndex: 0,
    activeExam: null,
    examHistory: []
  };
}

export function initializeProfiles() {
  const registry = readRegistry();
  if (registry.profiles.length || registry.legacyMigrated) return registry.profiles;

  const legacy = readJson(LEGACY_KEY);
  if (isLegacyProgress(legacy)) {
    const profile = createProfileRecord("原有用户");
    const data = {
      ...createEmptyProfileData(),
      answeredIds: toStringArray(legacy.answeredIds),
      totalAttempts: toNonNegativeInteger(legacy.totalAttempts),
      correctAttempts: Math.min(
        toNonNegativeInteger(legacy.correctAttempts),
        toNonNegativeInteger(legacy.totalAttempts)
      ),
      wrongIds: toStringArray(legacy.wrongIds),
      sequentialIndex: toNonNegativeInteger(legacy.sequentialIndex)
    };
    writeJson(profileKey(profile.id), data);
    registry.profiles.push(profile);
  }

  registry.legacyMigrated = true;
  writeRegistry(registry);
  return registry.profiles;
}

export function listProfiles() {
  return readRegistry().profiles;
}

export function createProfile(name) {
  const normalizedName = normalizeProfileName(name);
  const registry = readRegistry();
  const duplicate = registry.profiles.some(
    (profile) => profile.name.toLocaleLowerCase("zh-CN") === normalizedName.toLocaleLowerCase("zh-CN")
  );
  if (duplicate) throw new Error("该昵称已存在，请换一个昵称");

  const profile = createProfileRecord(normalizedName);
  registry.profiles.push(profile);
  writeJson(profileKey(profile.id), createEmptyProfileData());
  writeRegistry(registry);
  return profile;
}

export function loadProfileData(profileId) {
  const data = readJson(profileKey(profileId));
  if (!data || data.version !== DATA_VERSION) return createEmptyProfileData();

  const totalAttempts = toNonNegativeInteger(data.totalAttempts);
  return {
    version: DATA_VERSION,
    answeredIds: toStringArray(data.answeredIds),
    totalAttempts,
    correctAttempts: Math.min(toNonNegativeInteger(data.correctAttempts), totalAttempts),
    wrongIds: toStringArray(data.wrongIds),
    sequentialIndex: toNonNegativeInteger(data.sequentialIndex),
    activeExam: data.activeExam && typeof data.activeExam === "object" ? data.activeExam : null,
    examHistory: Array.isArray(data.examHistory) ? data.examHistory.slice(0, MAX_HISTORY) : []
  };
}

export function sanitizeProfileData(data, questions) {
  const validIds = new Set(questions.map((question) => question.id));
  const maxIndex = Math.max(questions.length - 1, 0);
  const activeExam = isValidExam(data.activeExam, validIds) ? sanitizeExam(data.activeExam) : null;

  return {
    ...data,
    version: DATA_VERSION,
    answeredIds: unique(data.answeredIds.filter((id) => validIds.has(id))),
    wrongIds: unique(data.wrongIds.filter((id) => validIds.has(id))),
    sequentialIndex: Math.min(data.sequentialIndex, maxIndex),
    activeExam,
    examHistory: data.examHistory
      .filter((record) => isValidExamRecord(record, validIds))
      .slice(0, MAX_HISTORY)
  };
}

export function saveProfileData(profileId, data) {
  try {
    writeJson(profileKey(profileId), { ...data, version: DATA_VERSION, examHistory: data.examHistory.slice(0, MAX_HISTORY) });
    return true;
  } catch {
    return false;
  }
}

export function normalizeProfileName(name) {
  const normalized = String(name ?? "").trim();
  if (!normalized) throw new Error("请输入昵称");
  if ([...normalized].length > 20) throw new Error("昵称不能超过20个字符");
  return normalized;
}

function readRegistry() {
  const stored = readJson(REGISTRY_KEY);
  if (!stored || stored.version !== DATA_VERSION || !Array.isArray(stored.profiles)) {
    return { version: DATA_VERSION, legacyMigrated: false, profiles: [] };
  }
  return {
    version: DATA_VERSION,
    legacyMigrated: Boolean(stored.legacyMigrated),
    profiles: stored.profiles.filter(isProfileRecord)
  };
}

function writeRegistry(registry) {
  writeJson(REGISTRY_KEY, registry);
}

function createProfileRecord(name) {
  return {
    id: createId("profile"),
    name,
    createdAt: Date.now()
  };
}

function createId(prefix) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function profileKey(profileId) {
  return `${PROFILE_KEY_PREFIX}${profileId}`;
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isLegacyProgress(value) {
  return value && value.version === 1 && Array.isArray(value.answeredIds) && Array.isArray(value.wrongIds);
}

function isProfileRecord(value) {
  return value && typeof value.id === "string" && typeof value.name === "string";
}

function isValidExam(value, validIds) {
  return value
    && value.status === "active"
    && Array.isArray(value.questionIds)
    && value.questionIds.length === 100
    && new Set(value.questionIds).size === 100
    && value.questionIds.every((id) => validIds.has(id))
    && Number.isFinite(value.startedAt)
    && Number.isFinite(value.endAt);
}

function isValidExamRecord(value, validIds) {
  return value
    && typeof value.id === "string"
    && Array.isArray(value.questionIds)
    && value.questionIds.length === 100
    && value.questionIds.every((id) => validIds.has(id))
    && value.answers
    && typeof value.answers === "object"
    && Number.isFinite(value.score);
}

function sanitizeExam(exam) {
  return {
    ...exam,
    answers: exam.answers && typeof exam.answers === "object" ? exam.answers : {},
    currentIndex: Math.min(toNonNegativeInteger(exam.currentIndex), exam.questionIds.length - 1)
  };
}

function toStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function toNonNegativeInteger(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function unique(items) {
  return [...new Set(items)];
}

export const storageKeys = { LEGACY_KEY, REGISTRY_KEY, PROFILE_KEY_PREFIX };
