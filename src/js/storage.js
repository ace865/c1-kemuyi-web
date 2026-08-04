const LEGACY_KEY = "c1-kemuyi-progress-v1";
const REGISTRY_KEY = "c1-kemuyi-profiles-v2";
const PROFILE_KEY_PREFIX = "c1-kemuyi-profile-v2:";
const DATA_VERSION = 3;
const MAX_HISTORY = 20;
const DEFAULT_SUBJECT = 1;

export function createEmptyProfileData() {
  return {
    version: DATA_VERSION,
    answeredIds: [],
    totalAttempts: 0,
    correctAttempts: 0,
    wrongIds: [],
    wrongStats: {},
    sequentialIndex: 0,
    activeExam: null,
    examHistory: [],
    preferences: {
      reduceMotion: false
    }
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
    data.wrongStats = createStatsForWrongIds(data.wrongIds);
    writeSubjectData(profile.id, DEFAULT_SUBJECT, data);
    registry.profiles.push(profile);
  }

  registry.legacyMigrated = true;
  writeRegistry(registry);
  return registry.profiles;
}

export function ensureDefaultProfile() {
  const profiles = initializeProfiles();
  if (profiles.length) return profiles[0];
  return createProfile("我的档案");
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
  writeSubjectData(profile.id, DEFAULT_SUBJECT, createEmptyProfileData());
  writeRegistry(registry);
  return profile;
}

export function loadProfileData(profileId, subject = DEFAULT_SUBJECT) {
  let data = readJson(subjectKey(profileId, subject));
  // Migration: try old key format (no subject suffix)
  if (!data && subject === DEFAULT_SUBJECT) {
    data = readJson(oldProfileKey(profileId));
    if (data) {
      // Save to new key format for future loads
      writeSubjectData(profileId, subject, normalizeProfileData(data));
    }
  }
  return normalizeProfileData(data);
}

export function sanitizeProfileData(data, questions) {
  const normalized = normalizeProfileData(data);
  const validIds = new Set(questions.map((q) => q.id));
  const maxIndex = Math.max(questions.length - 1, 0);
  const wrongIds = unique(normalized.wrongIds.filter((id) => validIds.has(id)));
  const wrongStats = {};

  for (const id of Object.keys(normalized.wrongStats)) {
    if (validIds.has(id)) wrongStats[id] = sanitizeWrongStat(normalized.wrongStats[id]);
  }
  for (const id of wrongIds) {
    if (!wrongStats[id]) wrongStats[id] = createWrongStat();
  }

  return {
    ...normalized,
    answeredIds: unique(normalized.answeredIds.filter((id) => validIds.has(id))),
    wrongIds,
    wrongStats,
    sequentialIndex: Math.min(normalized.sequentialIndex, maxIndex),
    activeExam: isValidExam(normalized.activeExam, validIds) ? sanitizeExam(normalized.activeExam) : null,
    examHistory: normalized.examHistory
      .filter((record) => isValidExamRecord(record, validIds))
      .slice(0, MAX_HISTORY)
  };
}

export function saveProfileData(profileId, data, subject = DEFAULT_SUBJECT) {
  try {
    writeSubjectData(profileId, subject, normalizeProfileData(data));
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

function normalizeProfileData(data) {
  const base = createEmptyProfileData();
  if (!data || typeof data !== "object") return base;

  const totalAttempts = toNonNegativeInteger(data.totalAttempts);
  const wrongIds = toStringArray(data.wrongIds);
  const wrongStats = {};
  const rawStats = data.wrongStats && typeof data.wrongStats === "object" ? data.wrongStats : {};

  for (const id of Object.keys(rawStats)) {
    if (typeof id === "string") wrongStats[id] = sanitizeWrongStat(rawStats[id]);
  }
  for (const id of wrongIds) {
    if (!wrongStats[id]) wrongStats[id] = createWrongStat();
  }

  return {
    version: DATA_VERSION,
    answeredIds: toStringArray(data.answeredIds),
    totalAttempts,
    correctAttempts: Math.min(toNonNegativeInteger(data.correctAttempts), totalAttempts),
    wrongIds,
    wrongStats,
    sequentialIndex: toNonNegativeInteger(data.sequentialIndex),
    activeExam: data.activeExam && typeof data.activeExam === "object" ? data.activeExam : null,
    examHistory: Array.isArray(data.examHistory) ? data.examHistory.slice(0, MAX_HISTORY) : [],
    preferences: {
      ...base.preferences,
      ...(data.preferences && typeof data.preferences === "object" ? data.preferences : {}),
      reduceMotion: Boolean(data.preferences?.reduceMotion)
    }
  };
}

function readRegistry() {
  const stored = readJson(REGISTRY_KEY);
  if (!stored || typeof stored !== "object" || !Array.isArray(stored.profiles)) {
    return { version: DATA_VERSION, legacyMigrated: false, profiles: [] };
  }
  return {
    version: DATA_VERSION,
    legacyMigrated: Boolean(stored.legacyMigrated),
    profiles: stored.profiles.filter(isProfileRecord)
  };
}

function writeRegistry(registry) {
  writeJson(REGISTRY_KEY, { ...registry, version: DATA_VERSION });
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

function subjectKey(profileId, subject) {
  return `${PROFILE_KEY_PREFIX}${profileId}:${subject}`;
}

function oldProfileKey(profileId) {
  return `${PROFILE_KEY_PREFIX}${profileId}`;
}

function writeSubjectData(profileId, subject, data) {
  writeJson(subjectKey(profileId, subject), data);
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
    && [50, 100].includes(value.questionIds.length)
    && new Set(value.questionIds).size === value.questionIds.length
    && value.questionIds.every((id) => validIds.has(id))
    && Number.isFinite(value.startedAt)
    && Number.isFinite(value.endAt);
}

function isValidExamRecord(value, validIds) {
  return value
    && typeof value.id === "string"
    && Array.isArray(value.questionIds)
    && [50, 100].includes(value.questionIds.length)
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

function createStatsForWrongIds(ids) {
  return Object.fromEntries(unique(ids).map((id) => [id, createWrongStat()]));
}

function createWrongStat() {
  return {
    wrongCount: 1,
    correctStreak: 0,
    lastWrongAt: 0,
    lastPracticedAt: 0
  };
}

function sanitizeWrongStat(value) {
  return {
    wrongCount: Math.max(0, toNonNegativeInteger(value?.wrongCount)),
    correctStreak: Math.max(0, toNonNegativeInteger(value?.correctStreak)),
    lastWrongAt: toNonNegativeInteger(value?.lastWrongAt),
    lastPracticedAt: toNonNegativeInteger(value?.lastPracticedAt)
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
