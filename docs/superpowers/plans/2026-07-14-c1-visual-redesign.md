# C1 Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing visual system with the approved road-atlas learning interface and cockpit exam mode while preserving all offline study behavior and fixing known persistence/timer defects.

**Architecture:** Keep the current offline Electron + native ES modules architecture. Add a small lifecycle helper for cancellable exam tasks, strengthen storage sanitation, rebuild semantic page markup and replace the stylesheet with one token-driven responsive design system; application domain modules remain independent from rendering.

**Tech Stack:** Electron 43, HTML5, native CSS, ES modules, Node.js test runner, localStorage, offline JSON assets.

## Global Constraints

- Preserve all 2,194 questions and 787 local images.
- Preserve existing localStorage keys and data version.
- Keep practice explanations and post-submit exam review explanations; never show explanations while an exam is active.
- Keep immediate correct/incorrect feedback in mock exams.
- Do not add online fonts, CDNs, runtime network access, or a frontend framework.
- Maintain Electron sandbox, CSP, context isolation, offline network blocking, and 320px minimum width.
- Respect `prefers-reduced-motion` and animate only `transform` and `opacity` in normal UI transitions.

---

### Task 1: Persistence and exam lifecycle defects

**Files:**
- Create: `src/js/exam-lifecycle.js`
- Modify: `src/js/storage.js`
- Modify: `src/js/app.js`
- Test: `tests/storage-check.mjs`
- Create: `tests/exam-lifecycle-check.mjs`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- `createExamTaskController(schedule, cancel)` returns `{ scheduleAutoAdvance(callback, delay), startTimer(callback, delay), clearAll() }`.
- `loadProfileData(profileId)` returns a sanitized `wrongSources` record.
- `sanitizeProfileData(data, questions)` removes invalid source keys and values.

- [x] Add failing storage assertions that save and reload `wrongSources`, discard missing question IDs, and reject source values outside `practice | exam`.
- [x] Add failing lifecycle assertions with fake schedulers proving replacement and `clearAll()` cancellation.
- [x] Implement the storage sanitation and lifecycle controller.
- [x] Replace separate exam timer/auto-advance IDs in `app.js` with the controller and clear it on initialization, navigation away from exam, profile switch, new exam, and submission.
- [x] Run `npm.cmd test`; expect all checks to pass.

### Task 2: Semantic application shell

**Files:**
- Modify: `index.html`
- Modify: `tests/static-check.mjs`

**Interfaces:**
- Existing element IDs referenced by `app.js` remain stable.
- `body[data-scene="cockpit"]` is the visual scene switch controlled by navigation.

- [x] Extend static checks for the route masthead, route progress region, accessible skip link, exam cockpit region, and lack of an active-exam explanation element.
- [x] Recompose existing views into the route-atlas shell without changing required IDs or actions.
- [x] Add meaningful structural labels, live regions, keyboard focus order, and a skip link.
- [x] Run `node tests/static-check.mjs`; expect all structure checks to pass.

### Task 3: Road-atlas visual system

**Files:**
- Replace: `src/css/styles.css`

**Interfaces:**
- CSS tokens expose paper, ink, route blue/green/red/amber, cockpit surfaces, spacing, radii, shadows, and motion durations.
- Existing state classes (`is-active`, `is-correct`, `is-wrong`, `is-selected`, `is-urgent`, `is-open`) remain supported.

- [x] Build the warm paper/ink token system, typography scale, responsive desktop layout, and asymmetric home composition.
- [x] Restyle profile, practice hub, question, wrong-book, history, result, empty, error, toast, and navigation states.
- [x] Implement the route line and node language using CSS pseudo-elements and semantic progress markup.
- [x] Remove grain, floating particles, conic effects, generic monochrome card wall, repeated keyframes, and permanent `will-change` layers.
- [x] Add 1023px, 767px, and 390px adaptations with no horizontal overflow.

### Task 4: Cockpit exam scene

**Files:**
- Modify: `src/js/app.js`
- Modify: `src/css/styles.css`

**Interfaces:**
- The central `showView(viewName)` path sets `body.dataset.scene` to `cockpit` only for active exam view; all other views use `atlas`.
- Exam answer buttons continue to show immediate correct/error status and allow revisiting/changing an answer.

- [x] Activate the scene switch from the central `showView()` path.
- [x] Render exam progress and navigator as 100 route nodes with answered/correct/error/current states.
- [x] Ensure the active exam renders no analysis content; preserve result review analysis.
- [x] Add the dark cockpit shell while keeping question text on a light reading surface.
- [x] Preserve the existing persisted current index and answers when leaving and re-entering an exam.

### Task 5: Unified motion system

**Files:**
- Replace: `src/js/motion.js`
- Modify: `src/js/app.js`
- Modify: `src/css/styles.css`

**Interfaces:**
- Preserve exported functions used by `app.js`: `staggerIn`, `countTo`, `shake`, `pulse`, `toastIn`, `toastOut`, `animate`, `PRESETS`, `easeOutExpo`, `reducedMotion`.
- All functions settle to the documented final visual state and return promises.

- [x] Replace fixed-step spring integration with duration/easing-driven WAAPI helpers.
- [x] Honor `delay` in `countTo` and cancel prior element animations before new WAAPI motion.
- [x] Use one feedback animation per answer state; remove competing CSS and JavaScript transforms.
- [x] Reduce page transitions to 280–360ms and keep startup under 700ms.
- [x] Replace confetti and ambient motion with a restrained route-line startup cue.

### Task 6: Visual regression contracts and final verification

**Files:**
- Modify: `tests/static-check.mjs`
- Modify: `tests/desktop-check.mjs`
- Modify: `scripts/check-offline.mjs`
- Update: `docs/WORKLOG.md`

**Interfaces:** None.

- [x] Assert the approved token names, scene switch, reduced-motion coverage, focus-visible styles, and responsive breakpoints exist.
- [x] Assert forbidden legacy effects and active-exam explanation markup are absent.
- [x] Run `npm.cmd run check`; offline resources and all tests pass.
- [x] Run syntax checks for every JS/MJS/CJS source with `node --check`.
- [x] Record completed requirements, remaining visual inspection limitations, and user decisions in the worklog.
