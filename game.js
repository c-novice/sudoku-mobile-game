const PUZZLES = [
  {
    title: "关卡模式 · 5星 · 2关",
    puzzle:
      "000500090007060000806003005000005200034000000020000837500001002080790000002008700",
    solution:
      "241538796357269148896147325678315294934682571125974837563821492418793650792456713",
  },
  {
    title: "关卡模式 · 5星 · 3关",
    puzzle:
      "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution:
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
  },
];

const state = {
  puzzleIndex: 0,
  selected: 0,
  board: [],
  fixed: [],
  notes: Array.from({ length: 81 }, () => new Set()),
  noteMode: false,
  hintMode: false,
  hintDigit: null,
  mistakes: 0,
  history: [],
  future: [],
  timerId: null,
  elapsed: 0,
  finished: false,
};

const boardEl = document.getElementById("sudokuBoard");
const digitPadEl = document.getElementById("digitPad");
const notePadEl = document.getElementById("notePad");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");
const remainingEl = document.getElementById("remainingCount");
const mistakeEl = document.getElementById("mistakeCount");
const noteToggleEl = document.getElementById("noteToggle");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const hintBtn = document.getElementById("hintBtn");
const eraseBtn = document.getElementById("eraseBtn");
const newGameBtn = document.getElementById("newGameBtn");
const modeLabelEl = document.querySelector(".mode-label");
const STORAGE_KEY = "sudoku-like-save-v1";

function saveProgress() {
  const payload = {
    puzzleIndex: state.puzzleIndex,
    selected: state.selected,
    board: state.board,
    fixed: state.fixed,
    notes: state.notes.map((set) => [...set]),
    noteMode: state.noteMode,
    hintMode: state.hintMode,
    hintDigit: state.hintDigit,
    mistakes: state.mistakes,
    elapsed: state.elapsed,
    finished: state.finished,
    history: state.history,
    future: state.future,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    state.puzzleIndex = data.puzzleIndex ?? 0;
    state.selected = data.selected ?? 0;
    state.board = Array.isArray(data.board) ? data.board : [];
    state.fixed = Array.isArray(data.fixed) ? data.fixed : [];
    state.notes = Array.isArray(data.notes)
      ? data.notes.map((digits) => new Set(digits))
      : Array.from({ length: 81 }, () => new Set());
    state.noteMode = Boolean(data.noteMode);
    state.hintMode = Boolean(data.hintMode);
    state.hintDigit = data.hintDigit ?? null;
    state.mistakes = data.mistakes ?? 0;
    state.elapsed = data.elapsed ?? 0;
    state.finished = Boolean(data.finished);
    state.history = Array.isArray(data.history) ? data.history : [];
    state.future = Array.isArray(data.future) ? data.future : [];
    modeLabelEl.textContent = PUZZLES[state.puzzleIndex]?.title ?? PUZZLES[0].title;
    syncNoteToggle();
    render();
    if (!state.finished) {
      startTimer();
    }
    setMessage("已恢复上次进度。");
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function loadPuzzle(index = 0) {
  const { puzzle, title } = PUZZLES[index];
  state.puzzleIndex = index;
  state.board = puzzle.split("").map(Number);
  state.fixed = state.board.map((value) => value !== 0);
  state.notes = Array.from({ length: 81 }, () => new Set());
  state.selected = state.fixed.findIndex((fixed) => !fixed);
  state.noteMode = false;
  state.hintMode = false;
  state.hintDigit = null;
  state.mistakes = 0;
  state.history = [];
  state.future = [];
  state.elapsed = 0;
  state.finished = false;
  modeLabelEl.textContent = title;
  syncNoteToggle();
  setMessage("选中格子后输入数字，或开启笔记模式记录候选。");
  resetTimer();
  render();
  saveProgress();
}

function render() {
  renderBoard();
  renderPads();
  hintBtn.classList.toggle("active", state.hintMode);
  timerEl.textContent = formatTime(state.elapsed);
  remainingEl.textContent = String(state.board.filter((cell) => cell === 0).length);
  mistakeEl.textContent = `${state.mistakes} / 3`;
  undoBtn.disabled = state.history.length === 0;
  redoBtn.disabled = state.future.length === 0;
  hintBtn.disabled = state.finished;
  eraseBtn.disabled = state.finished;
  saveProgress();
}

function renderBoard() {
  boardEl.innerHTML = "";
  const selectedValue = state.board[state.selected];
  const autoNotes = buildAutoNotes();

  state.board.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell";
    button.setAttribute("aria-label", `第 ${Math.floor(index / 9) + 1} 行第 ${(index % 9) + 1} 列`);

    if (state.fixed[index]) button.classList.add("given");
    if (index === state.selected) button.classList.add("selected");
    if (isRelated(index, state.selected) && index !== state.selected) button.classList.add("related");
    if (selectedValue && value === selectedValue && index !== state.selected) button.classList.add("same-value");
    if (Math.floor(index / 9) % 3 === 2) button.classList.add("box-row");
    if (value && value !== currentSolution()[index]) button.classList.add("error");
    if (state.hintMode && state.hintDigit) {
      if (value === state.hintDigit) {
        button.classList.add("hint-value");
      } else if (value === 0 && Number(currentSolution()[index]) === state.hintDigit) {
        button.classList.add("hint-target");
      }
    }

    if (value) {
      button.textContent = String(value);
    } else {
      const notes = document.createElement("div");
      notes.className = "notes";
      const digitsToShow = state.hintMode ? autoNotes[index] : state.notes[index];
      for (let digit = 1; digit <= 9; digit += 1) {
        const dot = document.createElement("span");
        dot.className = "note-dot";
        if (digitsToShow.has(digit)) {
          dot.classList.add("active");
          dot.textContent = String(digit);
          if (state.hintMode && digit === state.hintDigit) {
            dot.classList.add("hint-match");
          }
        } else {
          dot.textContent = "";
        }
        notes.appendChild(dot);
      }
      button.appendChild(notes);
    }

    button.addEventListener("click", () => {
      state.selected = index;
      if (state.hintMode) {
        updateHintDigit();
      }
      render();
    });

    boardEl.appendChild(button);
  });
}

function renderPads() {
  if (!digitPadEl.children.length) {
    buildPad(digitPadEl, false);
    buildPad(notePadEl, true);
  }
}

function buildPad(container, noteStyle) {
  for (let digit = 1; digit <= 9; digit += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `digit-btn${noteStyle ? " note-style" : ""}`;
    button.textContent = String(digit);
    button.addEventListener("click", () => handleDigit(digit, noteStyle));
    container.appendChild(button);
  }
}

function handleDigit(digit, forceNote = false) {
  if (state.finished) return;
  const index = state.selected;
  if (index < 0 || state.fixed[index]) return;

  const noteMode = forceNote || state.noteMode;
  if (noteMode) {
    pushHistory();
    const notes = state.notes[index];
    if (notes.has(digit)) {
      notes.delete(digit);
    } else {
      notes.add(digit);
    }
    state.future = [];
    render();
    return;
  }

  state.hintMode = false;
  state.hintDigit = null;
  pushHistory();
  state.board[index] = digit;
  state.notes[index].clear();
  state.future = [];

  if (digit !== currentSolution()[index]) {
    state.mistakes += 1;
    setMessage(`数字 ${digit} 不正确，还可再错 ${Math.max(0, 3 - state.mistakes)} 次。`);
    if (state.mistakes >= 3) {
      state.finished = true;
      stopTimer();
      setMessage("本局失败，已达到错误上限。点击刷新开始新局。");
    }
  } else {
    clearPeerNotes(index, digit);
    if (isSolved()) {
      state.finished = true;
      stopTimer();
      setMessage("完成通关，棋盘已全部解开。");
    } else {
      setMessage("已填入数字。");
    }
  }

  render();
}

function eraseCell() {
  const index = state.selected;
  if (state.finished || index < 0 || state.fixed[index]) return;
  if (state.board[index] === 0 && state.notes[index].size === 0) return;

  pushHistory();
  state.hintMode = false;
  state.hintDigit = null;
  state.board[index] = 0;
  state.notes[index].clear();
  state.future = [];
  setMessage("已清空当前格。");
  render();
}

function toggleHintMode() {
  if (state.finished) return;
  state.hintMode = !state.hintMode;
  if (!state.hintMode) {
    state.hintDigit = null;
    setMessage("已关闭提示视图。");
    render();
    return;
  }

  updateHintDigit();
  if (!state.hintDigit) {
    state.hintMode = false;
    setMessage("当前没有可提示的空格。");
    render();
    return;
  }

  const index = state.selected;
  setMessage(`提示视图：优先观察数字 ${state.hintDigit} 的落点和候选。`);
  render();
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 200) {
    state.history.shift();
  }
}

function snapshot() {
  return {
    board: [...state.board],
    notes: state.notes.map((set) => [...set]),
    hintMode: state.hintMode,
    hintDigit: state.hintDigit,
    mistakes: state.mistakes,
    selected: state.selected,
    finished: state.finished,
    elapsed: state.elapsed,
  };
}

function restore(entry) {
  state.board = [...entry.board];
  state.notes = entry.notes.map((digits) => new Set(digits));
  state.hintMode = Boolean(entry.hintMode);
  state.hintDigit = entry.hintDigit ?? null;
  state.mistakes = entry.mistakes;
  state.selected = entry.selected;
  state.finished = entry.finished;
  state.elapsed = entry.elapsed;
  if (state.finished) {
    stopTimer();
  } else if (!state.timerId) {
    startTimer();
  }
  render();
}

function undo() {
  if (!state.history.length) return;
  state.future.push(snapshot());
  restore(state.history.pop());
  setMessage("已撤销上一步。");
}

function redo() {
  if (!state.future.length) return;
  state.history.push(snapshot());
  restore(state.future.pop());
  setMessage("已恢复上一步。");
}

function clearPeerNotes(index, digit) {
  for (let i = 0; i < 81; i += 1) {
    if (i !== index && isRelated(i, index)) {
      state.notes[i].delete(digit);
    }
  }
}

function isRelated(a, b) {
  if (a < 0 || b < 0) return false;
  const rowA = Math.floor(a / 9);
  const colA = a % 9;
  const rowB = Math.floor(b / 9);
  const colB = b % 9;
  const boxA = Math.floor(rowA / 3) * 3 + Math.floor(colA / 3);
  const boxB = Math.floor(rowB / 3) * 3 + Math.floor(colB / 3);
  return rowA === rowB || colA === colB || boxA === boxB;
}

function currentSolution() {
  return PUZZLES[state.puzzleIndex].solution;
}

function getCandidates(index) {
  if (state.board[index] !== 0) return new Set();
  const blocked = new Set();
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i += 1) {
    blocked.add(state.board[row * 9 + i]);
    blocked.add(state.board[i * 9 + col]);
  }

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      blocked.add(state.board[r * 9 + c]);
    }
  }

  const candidates = new Set();
  for (let digit = 1; digit <= 9; digit += 1) {
    if (!blocked.has(digit)) {
      candidates.add(digit);
    }
  }
  return candidates;
}

function buildAutoNotes() {
  return Array.from({ length: 81 }, (_, index) => {
    const merged = getCandidates(index);
    state.notes[index].forEach((digit) => merged.add(digit));
    return merged;
  });
}

function updateHintDigit() {
  const selectedValue = state.board[state.selected];
  if (selectedValue) {
    state.hintDigit = selectedValue;
    return;
  }

  const selectedSolutionDigit = Number(currentSolution()[state.selected]);
  if (selectedSolutionDigit) {
    state.hintDigit = selectedSolutionDigit;
    return;
  }

  const firstEmpty = state.board.findIndex((value) => value === 0);
  state.hintDigit = firstEmpty >= 0 ? Number(currentSolution()[firstEmpty]) : null;
}

function isSolved() {
  return state.board.join("") === currentSolution();
}

function syncNoteToggle() {
  noteToggleEl.classList.toggle("active", state.noteMode);
  noteToggleEl.setAttribute("aria-pressed", String(state.noteMode));
  noteToggleEl.textContent = state.noteMode ? "笔记开" : "笔记关";
}

function setMessage(text) {
  messageEl.textContent = text;
}

function startTimer() {
  stopTimer();
  state.timerId = window.setInterval(() => {
    state.elapsed += 1;
    timerEl.textContent = formatTime(state.elapsed);
    saveProgress();
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function resetTimer() {
  timerEl.textContent = "00:00";
  startTimer();
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

noteToggleEl.addEventListener("click", () => {
  state.noteMode = !state.noteMode;
  syncNoteToggle();
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
hintBtn.addEventListener("click", toggleHintMode);
eraseBtn.addEventListener("click", eraseCell);
newGameBtn.addEventListener("click", () => {
  loadPuzzle((state.puzzleIndex + 1) % PUZZLES.length);
});

window.addEventListener("keydown", (event) => {
  if (/^[1-9]$/.test(event.key)) {
    handleDigit(Number(event.key));
    return;
  }
  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    eraseCell();
    return;
  }
  if (event.key.toLowerCase() === "n") {
    state.noteMode = !state.noteMode;
    syncNoteToggle();
    return;
  }
  if (event.key.toLowerCase() === "h") {
    toggleHintMode();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  }
});

if (!loadProgress()) {
  loadPuzzle(0);
}

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
