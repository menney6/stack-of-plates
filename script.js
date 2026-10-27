(() => {
  "use strict";

  const MAX_PLATES = 12;
  const INITIAL_COUNT = 3;

  const PLATE_STYLES = [
    { color: "#f2eadc", rim: "#efe3cf", edge: "#d3c2a7", center: "#fffdf8", ink: "#6a5841" },
    { color: "#cfe5ef", rim: "#e4f2f7", edge: "#8fb8c8", center: "#f9fdff", ink: "#34535e" },
    { color: "#d9e7d6", rim: "#eaf4e7", edge: "#9db99a", center: "#fbfdf9", ink: "#3e5939" },
    { color: "#f1d7d7", rim: "#fae9e9", edge: "#c99a9a", center: "#fffafa", ink: "#674040" },
    { color: "#f2e5be", rim: "#fbf2d7", edge: "#cdb77a", center: "#fffdf6", ink: "#61522b" },
    { color: "#e2d9ef", rim: "#f2ecf9", edge: "#b2a0c9", center: "#fdfbff", ink: "#504161" },
    { color: "#ecc7b5", rim: "#f9e4d9", edge: "#c48b70", center: "#fffaf7", ink: "#633a2b" }
  ];

  const TILTS = ["-0.9deg", "0.7deg", "-0.4deg", "1deg", "-0.6deg", "0.3deg", "0.9deg", "-1deg"];
  const SHIFTS = ["-2px", "2px", "-1px", "1px", "-3px", "3px", "0px", "2px"];

  const els = {
    stage: document.getElementById("stage"),
    stackArea: document.getElementById("stack-area"),
    plateStack: document.getElementById("plate-stack"),
    emptyStack: document.getElementById("empty-stack"),
    topMarker: document.getElementById("top-marker"),
    peekBubble: document.getElementById("peek-bubble"),
    peekValue: document.getElementById("peek-value"),
    stageSubtitle: document.getElementById("stage-subtitle"),
    stackSummary: document.getElementById("stack-summary"),
    sizeBadge: document.getElementById("size-badge"),
    topBadge: document.getElementById("top-badge"),
    stateTop: document.getElementById("state-top"),
    stateSize: document.getElementById("state-size"),
    stateCapacity: document.getElementById("state-capacity"),
    codeTop: document.getElementById("code-top"),
    codeSize: document.getElementById("code-size"),
    log: document.getElementById("log"),
    clearLogBtn: document.getElementById("clear-log-btn"),
    pushBtn: document.getElementById("push-btn"),
    popBtn: document.getElementById("pop-btn"),
    peekBtn: document.getElementById("peek-btn"),
    clearBtn: document.getElementById("clear-btn"),
    live: document.getElementById("live"),
    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toast-message"),
    toastAction: document.getElementById("toast-action")
  };

  let plates = [];
  let nextValue = 1;
  let logs = [];

  let lastPopped = null;
  let lastClear = null;

  let toastTimer = null;
  let toastAction = null;
  let peekTimer = null;
  let peekHideTimer = null;
  let announceTimer = null;
  let markerFrame = 0;

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function makePlate(value) {
    return {
      id: uid(),
      value,
      palette: PLATE_STYLES[(value - 1) % PLATE_STYLES.length]
    };
  }

  function plateWord(count) {
    return count === 1 ? "plate" : "plates";
  }

  function renderStack({ newId = null, intro = false } = {}) {
    const fragment = document.createDocumentFragment();

    plates.forEach((plate, index) => {
      const el = document.createElement("div");
      el.className = "plate";
      if (intro) {
        el.classList.add("is-intro");
      }
      if (plate.id === newId) {
        el.classList.add("is-new");
      }
      if (index === plates.length - 1) {
        el.dataset.top = "true";
      }

      el.dataset.plateId = plate.id;
      el.style.setProperty("--i", String(index));
      el.style.setProperty("--tilt", TILTS[index % TILTS.length]);
      el.style.setProperty("--shift", SHIFTS[index % SHIFTS.length]);
      el.style.setProperty("--plate-color", plate.palette.color);
      el.style.setProperty("--plate-rim", plate.palette.rim);
      el.style.setProperty("--plate-edge", plate.palette.edge);
      el.style.setProperty("--plate-center", plate.palette.center);
      el.style.setProperty("--plate-ink", plate.palette.ink);

      const label = document.createElement("span");
      label.className = "plate-value";
      label.textContent = String(plate.value);
      el.append(label);

      fragment.append(el);
    });

    els.plateStack.replaceChildren(fragment);
    els.emptyStack.hidden = plates.length > 0;
    els.topMarker.hidden = plates.length === 0;

    if (plates.length > 0) {
      schedulePositionMarker();
    }
  }

  function updateUI() {
    const top = plates[plates.length - 1];
    const empty = plates.length === 0;
    const full = plates.length >= MAX_PLATES;

    if (empty) {
      els.stageSubtitle.textContent = "Empty stack · push a plate to begin";
    } else if (full) {
      els.stageSubtitle.textContent = `${plates.length} plates · stack is full`;
    } else {
      els.stageSubtitle.textContent = `${plates.length} ${plateWord(plates.length)} · top is ${top.value}`;
    }

    els.sizeBadge.textContent = `size ${plates.length} / ${MAX_PLATES}`;
    els.topBadge.textContent = empty ? "empty" : `top ${top.value}`;
    els.topBadge.classList.toggle("is-empty", empty);

    els.stateTop.textContent = empty ? "—" : String(top.value);
    els.stateSize.textContent = String(plates.length);
    els.stateCapacity.textContent = `${plates.length} / ${MAX_PLATES}`;
    els.codeTop.textContent = empty ? "null" : String(top.value);
    els.codeSize.textContent = String(plates.length);

    els.stackSummary.textContent = empty
      ? "The stack is empty."
      : `${plates.length} ${plateWord(plates.length)}. Top plate is ${top.value}.`;

    els.pushBtn.disabled = full;
    els.popBtn.disabled = empty;
    els.peekBtn.disabled = empty;
    els.clearBtn.disabled = empty;
    els.clearLogBtn.disabled = logs.length === 0;
  }

  function schedulePositionMarker() {
    cancelAnimationFrame(markerFrame);
    markerFrame = requestAnimationFrame(positionMarker);
  }

  function positionMarker() {
    if (plates.length === 0) {
      els.topMarker.hidden = true;
      return;
    }

    const topPlate = els.plateStack.querySelector('.plate[data-top="true"]');
    if (!topPlate) {
      els.topMarker.hidden = true;
      return;
    }

    const areaHeight = els.stackArea.clientHeight;
    const topCenterFromTop = topPlate.offsetTop + topPlate.offsetHeight / 2;
    const bottom = Math.max(10, Math.min(areaHeight - 10, areaHeight - topCenterFromTop));

    els.topMarker.style.bottom = `${bottom}px`;
    els.topMarker.hidden = false;
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }

  function renderLog(newId = null) {
    els.log.replaceChildren();

    if (logs.length === 0) {
      const empty = document.createElement("li");
      empty.className = "log-empty";
      empty.textContent = "No operations yet. Push a plate to begin.";
      els.log.append(empty);
      els.clearLogBtn.disabled = true;
      return;
    }

    els.clearLogBtn.disabled = false;

    logs.forEach((entry) => {
      const item = document.createElement("li");
      item.className = `log-item log-${entry.type}`;
      if (entry.id === newId) {
        item.classList.add("is-new");
      }

      const badge = document.createElement("span");
      badge.className = "log-badge";
      badge.textContent = entry.type;

      const text = document.createElement("span");
      text.className = "log-text";
      text.textContent = entry.text;

      const time = document.createElement("time");
      time.className = "log-time";
      time.dateTime = new Date(entry.time).toISOString();
      time.textContent = formatTime(entry.time);

      item.append(badge, text, time);
      els.log.append(item);
    });

    els.log.scrollTop = 0;
  }

  function addLog(type, text) {
    logs.unshift({ id: uid(), type, text, time: Date.now() });
    if (logs.length > 24) {
      logs.length = 24;
    }
    renderLog(logs[0].id);
  }

  function announce(message) {
    window.clearTimeout(announceTimer);
    els.live.textContent = "";
    announceTimer = window.setTimeout(() => {
      els.live.textContent = message;
    }, 30);
  }

  function showToast(message, actionLabel, action) {
    window.clearTimeout(toastTimer);
    els.toastMessage.textContent = message;
    toastAction = action;

    if (action && actionLabel) {
      els.toastAction.textContent = actionLabel;
      els.toastAction.hidden = false;
    } else {
      els.toastAction.textContent = "";
      els.toastAction.hidden = true;
    }

    els.toast.hidden = false;
    toastTimer = window.setTimeout(hideToast, 6000);
  }

  function hideToast() {
    window.clearTimeout(toastTimer);
    els.toast.hidden = true;
    els.toastAction.hidden = true;
    toastAction = null;
  }

  function handleToastAction() {
    const action = toastAction;
    hideToast();
    if (typeof action === "function") {
      action();
    }
  }

  function cancelUndo() {
    lastPopped = null;
    lastClear = null;
    hideToast();
  }

  function hidePeek() {
    window.clearTimeout(peekTimer);
    window.clearTimeout(peekHideTimer);
    els.peekBubble.classList.remove("is-visible");
    els.plateStack.querySelectorAll(".plate.is-peeked").forEach((plate) => {
      plate.classList.remove("is-peeked");
    });
    peekHideTimer = window.setTimeout(() => {
      els.peekBubble.hidden = true;
    }, 190);
  }

  function pushPlate() {
    if (plates.length >= MAX_PLATES) {
      announce("The stack is full. Pop a plate before pushing another.");
      return;
    }

    cancelUndo();
    hidePeek();

    const plate = makePlate(nextValue);
    nextValue += 1;
    plates.push(plate);

    addLog("push", `Plate ${plate.value} placed on top`);
    renderStack({ newId: plate.id });
    updateUI();
    announce(`Pushed plate ${plate.value}. The stack has ${plates.length} ${plateWord(plates.length)}. Top plate is ${plate.value}.`);
  }

  function popPlate() {
    if (plates.length === 0) {
      announce("The stack is empty. Push a plate first.");
      return;
    }

    hidePeek();

    const oldTop = els.plateStack.querySelector('.plate[data-top="true"]');
    let ghost = null;

    if (oldTop) {
      ghost = oldTop.cloneNode(true);
      ghost.removeAttribute("data-top");
      ghost.classList.remove("is-new", "is-intro", "is-peeked");
      ghost.classList.add("is-ghost");
      ghost.setAttribute("aria-hidden", "true");
    }

    const popped = plates.pop();
    lastClear = null;
    lastPopped = { plate: popped, index: plates.length };

    addLog("pop", `Plate ${popped.value} removed from top`);
    renderStack();

    if (ghost) {
      els.plateStack.append(ghost);
      els.emptyStack.hidden = true;
      window.setTimeout(() => {
        ghost.remove();
        els.emptyStack.hidden = plates.length > 0;
      }, 560);
    }

    updateUI();

    const newTop = plates[plates.length - 1];
    announce(
      newTop
        ? `Popped plate ${popped.value}. Top plate is now ${newTop.value}. Undo is available.`
        : `Popped plate ${popped.value}. The stack is now empty. Undo is available.`
    );

    showToast(`Popped plate ${popped.value}.`, "Undo", undoPop);
  }

  function undoPop() {
    if (!lastPopped || plates.length !== lastPopped.index) {
      return;
    }

    const { plate } = lastPopped;
    lastPopped = null;
    plates.push(plate);

    addLog("undo", `Plate ${plate.value} restored to top`);
    renderStack({ newId: plate.id });
    updateUI();
    announce(`Restored plate ${plate.value}. Top plate is ${plate.value}.`);
  }

  function clearStack() {
    if (plates.length === 0) {
      return;
    }

    hidePeek();

    const snapshot = {
      plates: plates.slice(),
      nextValue
    };

    lastPopped = null;
    lastClear = snapshot;

    plates = [];
    nextValue = 1;

    addLog("clear", `Removed all ${snapshot.plates.length} plates`);
    renderStack();
    updateUI();
    announce("Cleared the stack. 0 plates. Undo is available.");

    showToast("Stack cleared.", "Undo", undoClear);
  }

  function undoClear() {
    if (!lastClear || plates.length !== 0) {
      return;
    }

    const snapshot = lastClear;
    lastClear = null;
    plates = snapshot.plates;
    nextValue = snapshot.nextValue;

    addLog("undo", `Restored ${plates.length} ${plateWord(plates.length)}`);
    renderStack({ intro: true });
    updateUI();

    const top = plates[plates.length - 1];
    announce(`Restored ${plates.length} ${plateWord(plates.length)}. Top plate is ${top.value}.`);
  }

  function peekPlate() {
    if (plates.length === 0) {
      announce("The stack is empty. Push a plate first.");
      return;
    }

    const top = plates[plates.length - 1];
    const topPlate = els.plateStack.querySelector('.plate[data-top="true"]');

    window.clearTimeout(peekTimer);
    window.clearTimeout(peekHideTimer);

    els.plateStack.querySelectorAll(".plate.is-peeked").forEach((plate) => {
      plate.classList.remove("is-peeked");
    });

    if (topPlate) {
      void topPlate.offsetWidth;
      topPlate.classList.add("is-peeked");
    }

    els.peekValue.textContent = String(top.value);
    els.peekBubble.hidden = false;
    requestAnimationFrame(() => {
      els.peekBubble.classList.add("is-visible");
    });

    addLog("peek", `Read top plate ${top.value}`);
    announce(`Top plate is ${top.value}. Peek does not remove it.`);

    peekTimer = window.setTimeout(hidePeek, 1500);
  }

  function clearLog() {
    logs = [];
    renderLog();
    announce("Operation log cleared.");
  }

  function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  function handleKeyboard(event) {
    if (event.defaultPrevented || event.repeat || event.isComposing) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (isTypingTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "p") {
      event.preventDefault();
      pushPlate();
    } else if (key === "o") {
      event.preventDefault();
      popPlate();
    } else if (key === "k") {
      event.preventDefault();
      peekPlate();
    }
  }

  els.pushBtn.addEventListener("click", pushPlate);
  els.popBtn.addEventListener("click", popPlate);
  els.peekBtn.addEventListener("click", peekPlate);
  els.clearBtn.addEventListener("click", clearStack);
  els.clearLogBtn.addEventListener("click", clearLog);
  els.toastAction.addEventListener("click", handleToastAction);
  document.addEventListener("keydown", handleKeyboard);
  window.addEventListener("resize", schedulePositionMarker);

  for (let i = 0; i < INITIAL_COUNT; i += 1) {
    plates.push(makePlate(nextValue));
    nextValue += 1;
  }

  renderLog();
  renderStack({ intro: true });
  updateUI();
})();
