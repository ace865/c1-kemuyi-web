export function createExamTaskController(schedule = setTimeout, cancel = clearTimeout) {
  let autoAdvanceId = null;
  let timerId = null;

  function scheduleAutoAdvance(callback, delay) {
    if (autoAdvanceId !== null) cancel(autoAdvanceId);
    autoAdvanceId = schedule(() => {
      autoAdvanceId = null;
      callback();
    }, delay);
    return autoAdvanceId;
  }

  function startTimer(callback, delay) {
    if (timerId !== null) cancel(timerId);
    const tick = () => {
      callback();
      timerId = schedule(tick, delay);
    };
    timerId = schedule(tick, delay);
    return timerId;
  }

  function clearAll() {
    if (autoAdvanceId !== null) cancel(autoAdvanceId);
    if (timerId !== null) cancel(timerId);
    autoAdvanceId = null;
    timerId = null;
  }

  return { scheduleAutoAdvance, startTimer, clearAll };
}
