/* =========================================================
   Day Board — interactive task board
   Task 4, Lime Light internship. Author: Karim Hussein.

   No framework and no build step. The whole app is one state
   array plus a render function: every change updates `tasks`,
   saves it, and redraws the board from scratch. That is slower
   than patching individual nodes, but with a board this size it
   is instant, and it removes the class of bug where the screen
   and the data quietly disagree.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- constants ------------------------------- */

  var STORAGE_TASKS = "dayboard.tasks";
  var STORAGE_THEME = "dayboard.theme";

  // The three columns, in order. Moving a task left or right is
  // just a step through this array, so adding a fourth column
  // later would only mean adding it here and in the markup.
  var COLUMNS = ["todo", "progress", "done"];

  var PRIORITY_LABELS = {
    low: "Low",
    medium: "Medium",
    high: "High"
  };


  /* ---------- state ----------------------------------- */

  var tasks = [];

  var filters = {
    search: "",
    category: "all"
  };


  /* ---------- elements -------------------------------- */

  var form = document.getElementById("taskForm");
  var titleInput = document.getElementById("taskTitle");
  var titleError = document.getElementById("titleError");
  var categoryInput = document.getElementById("taskCategory");
  var priorityInput = document.getElementById("taskPriority");
  var notesInput = document.getElementById("taskNotes");

  var searchInput = document.getElementById("search");
  var filterSelect = document.getElementById("filterCategory");
  var clearButton = document.getElementById("clearFilters");

  var counter = document.getElementById("counter");
  var themeButton = document.getElementById("themeToggle");
  var themeLabel = document.getElementById("themeLabel");
  var cardTemplate = document.getElementById("cardTemplate");


  /* ---------- storage --------------------------------- */

  /* Browser storage can throw — private windows, blocked site
     data, a full quota — so every read and write is guarded and
     the app carries on working in memory if it fails. */

  function loadTasks() {
    try {
      var raw = window.localStorage.getItem(STORAGE_TASKS);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
    } catch (error) {
      return [];
    }
  }

  function saveTasks() {
    try {
      window.localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
    } catch (error) {
      /* Storage unavailable. The board still works for this visit. */
    }
  }

  // Anything read back from storage is treated as untrusted: a
  // hand-edited or half-written entry should not break the board.
  function isValidTask(task) {
    return (
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      COLUMNS.indexOf(task.column) !== -1 &&
      Object.prototype.hasOwnProperty.call(PRIORITY_LABELS, task.priority)
    );
  }


  /* ---------- helpers --------------------------------- */

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "t-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function findTask(id) {
    for (var i = 0; i < tasks.length; i += 1) {
      if (tasks[i].id === id) {
        return tasks[i];
      }
    }
    return null;
  }

  // A task is shown when its title matches the search box and its
  // category matches the dropdown. Both filters are applied at
  // render time, so the underlying data is never altered by them.
  function matchesFilters(task) {
    var needle = filters.search.trim().toLowerCase();
    var titleMatches = needle === "" || task.title.toLowerCase().indexOf(needle) !== -1;
    var categoryMatches = filters.category === "all" || task.category === filters.category;
    return titleMatches && categoryMatches;
  }


  /* ---------- actions --------------------------------- */

  function addTask(title, notes, category, priority) {
    tasks.push({
      id: makeId(),
      title: title,
      notes: notes,
      category: category,
      priority: priority,
      column: "todo",
      createdAt: Date.now()
    });

    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(function (task) {
      return task.id !== id;
    });

    saveTasks();
    render();
  }

  // Step a task one column left or right. `direction` is -1 or 1.
  function nudgeTask(id, direction) {
    var task = findTask(id);
    if (!task) {
      return;
    }

    var next = COLUMNS.indexOf(task.column) + direction;
    if (next < 0 || next >= COLUMNS.length) {
      return;
    }

    task.column = COLUMNS[next];
    saveTasks();
    render();
  }

  // Used by drag and drop, where the destination is named outright
  // rather than reached one step at a time.
  function moveTaskTo(id, column) {
    var task = findTask(id);
    if (!task || COLUMNS.indexOf(column) === -1 || task.column === column) {
      return;
    }

    task.column = column;
    saveTasks();
    render();
  }


  /* ---------- rendering ------------------------------- */

  function buildCard(task) {
    var card = cardTemplate.content.firstElementChild.cloneNode(true);

    card.dataset.id = task.id;
    card.dataset.priority = task.priority;

    if (task.column === "done") {
      card.classList.add("card--done");
    }

    card.querySelector('[data-role="priority"]').textContent = PRIORITY_LABELS[task.priority];
    card.querySelector('[data-role="category"]').textContent = task.category;

    // textContent rather than innerHTML, so a title containing
    // angle brackets is shown as typed instead of being parsed.
    card.querySelector('[data-role="title"]').textContent = task.title;

    var notes = card.querySelector('[data-role="notes"]');
    if (task.notes) {
      notes.textContent = task.notes;
    } else {
      notes.hidden = true;
    }

    // The arrows at the ends of the board have nowhere to go.
    var index = COLUMNS.indexOf(task.column);
    card.querySelector('[data-action="back"]').disabled = index === 0;
    card.querySelector('[data-action="forward"]').disabled = index === COLUMNS.length - 1;

    return card;
  }

  function render() {
    var visible = tasks.filter(matchesFilters);

    COLUMNS.forEach(function (column) {
      var list = document.querySelector('[data-dropzone="' + column + '"]');
      var empty = document.querySelector('[data-empty="' + column + '"]');
      var tally = document.querySelector('[data-tally="' + column + '"]');

      var inColumn = visible.filter(function (task) {
        return task.column === column;
      });

      // One fragment per column means a single reflow rather than
      // one for every card appended.
      var fragment = document.createDocumentFragment();
      inColumn.forEach(function (task) {
        fragment.appendChild(buildCard(task));
      });

      list.textContent = "";
      list.appendChild(fragment);

      tally.textContent = String(inColumn.length);
      empty.hidden = inColumn.length > 0;
    });

    renderCounter();
  }

  function renderCounter() {
    var done = tasks.filter(function (task) {
      return task.column === "done";
    }).length;

    var active = tasks.length - done;

    if (tasks.length === 0) {
      counter.textContent = "No tasks yet";
      return;
    }

    counter.textContent =
      active + (active === 1 ? " active task" : " active tasks") + " · " + done + " completed";
  }


  /* ---------- form ------------------------------------ */

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var title = titleInput.value.trim();

    // A task with no title would render as an empty card, so the
    // form refuses it and says why rather than failing silently.
    if (title === "") {
      titleError.hidden = false;
      titleInput.setAttribute("aria-invalid", "true");
      titleInput.focus();
      return;
    }

    titleError.hidden = true;
    titleInput.removeAttribute("aria-invalid");

    addTask(title, notesInput.value.trim(), categoryInput.value, priorityInput.value);

    form.reset();
    priorityInput.value = "medium";
    titleInput.focus();
  });

  titleInput.addEventListener("input", function () {
    if (!titleError.hidden) {
      titleError.hidden = true;
      titleInput.removeAttribute("aria-invalid");
    }
  });


  /* ---------- search and filter ----------------------- */

  searchInput.addEventListener("input", function () {
    filters.search = searchInput.value;
    render();
  });

  filterSelect.addEventListener("change", function () {
    filters.category = filterSelect.value;
    render();
  });

  clearButton.addEventListener("click", function () {
    searchInput.value = "";
    filterSelect.value = "all";
    filters.search = "";
    filters.category = "all";
    render();
  });


  /* ---------- card buttons ---------------------------- */

  /* Cards are rebuilt on every render, so listeners are attached
     once to the board instead of to each button. Clicks bubble up
     and are identified by the data-action they came from. */

  document.getElementById("board").addEventListener("click", function (event) {
    var button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    var card = button.closest(".card");
    if (!card) {
      return;
    }

    var id = card.dataset.id;

    if (button.dataset.action === "delete") {
      deleteTask(id);
    } else if (button.dataset.action === "forward") {
      nudgeTask(id, 1);
    } else if (button.dataset.action === "back") {
      nudgeTask(id, -1);
    }
  });


  /* ---------- drag and drop --------------------------- */

  /* The native HTML5 drag and drop API. Touch screens do not fire
     these events, which is why every card also carries arrow
     buttons — dragging is the shortcut, not the only way. */

  var draggedId = null;

  document.addEventListener("dragstart", function (event) {
    var card = event.target.closest(".card");
    if (!card) {
      return;
    }

    draggedId = card.dataset.id;
    card.classList.add("card--dragging");

    event.dataTransfer.effectAllowed = "move";
    // Firefox will not start a drag unless something is set here.
    event.dataTransfer.setData("text/plain", draggedId);
  });

  document.addEventListener("dragend", function (event) {
    var card = event.target.closest(".card");
    if (card) {
      card.classList.remove("card--dragging");
    }

    draggedId = null;
    clearDropHighlights();
  });

  COLUMNS.forEach(function (column) {
    var list = document.querySelector('[data-dropzone="' + column + '"]');

    // Without preventDefault on dragover the browser refuses the
    // drop outright — this is the step most often missed.
    list.addEventListener("dragover", function (event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      list.classList.add("column__list--over");
    });

    list.addEventListener("dragleave", function (event) {
      // Moving across a child element fires dragleave too, so the
      // highlight is only dropped when the pointer truly left.
      if (!list.contains(event.relatedTarget)) {
        list.classList.remove("column__list--over");
      }
    });

    list.addEventListener("drop", function (event) {
      event.preventDefault();
      list.classList.remove("column__list--over");

      var id = draggedId || event.dataTransfer.getData("text/plain");
      if (id) {
        moveTaskTo(id, column);
      }
    });
  });

  function clearDropHighlights() {
    var zones = document.querySelectorAll(".column__list--over");
    Array.prototype.forEach.call(zones, function (zone) {
      zone.classList.remove("column__list--over");
    });
  }


  /* ---------- theme ----------------------------------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    var isDark = theme === "dark";
    themeLabel.textContent = isDark ? "Light" : "Dark";
    themeButton.setAttribute("aria-pressed", String(isDark));

    try {
      window.localStorage.setItem(STORAGE_THEME, theme);
    } catch (error) {
      /* Nothing to do — the theme simply will not be remembered. */
    }
  }

  function startingTheme() {
    try {
      var saved = window.localStorage.getItem(STORAGE_THEME);
      if (saved === "dark" || saved === "light") {
        return saved;
      }
    } catch (error) {
      /* Fall through to the system preference. */
    }

    // No stored choice, so follow whatever the operating system is set to.
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  themeButton.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });


  /* ---------- start ----------------------------------- */

  applyTheme(startingTheme());
  tasks = loadTasks();
  render();
})();
