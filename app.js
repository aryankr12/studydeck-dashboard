(() => {
  'use strict';

  /* ==========================================================
     STORAGE + STATE
     ========================================================== */
  const KEY = 'studydeck.v1';

  let persisted = null;
  try { persisted = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}

  const state = {
    tasks: Array.isArray(persisted?.tasks) ? persisted.tasks : null,
    theme: persisted?.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
    view: persisted?.view || 'dashboard',
    filters: { subject: 'all', priority: 'all', search: '' }
  };

  const uid = () =>
    (crypto.randomUUID ? crypto.randomUUID() : 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

  /* ---- Seed demo data on first visit ---- */
  if (!state.tasks) state.tasks = seed();

  function seed() {
    const now = new Date();
    const at = (dayOffset, h, m = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };
    return [
      { id: uid(), title: 'Finish problem set 4 (integration by parts)', subject: 'Calculus II',       deadline: at(0, 18),  priority: 'high',   done: false },
      { id: uid(), title: 'Read chapters 7–8 and take notes',           subject: 'Organic Chemistry', deadline: at(0, 21),  priority: 'medium', done: true  },
      { id: uid(), title: 'Draft essay outline',                        subject: 'English Lit',       deadline: at(-1, 17), priority: 'high',   done: false },
      { id: uid(), title: 'Lab report data analysis',                   subject: 'Physics',           deadline: at(-2, 12), priority: 'medium', done: false },
      { id: uid(), title: 'Group project sync',                         subject: 'Software Eng',      deadline: at(1, 10),  priority: 'medium', done: false },
      { id: uid(), title: 'Flashcards: 50 new terms',                   subject: 'Spanish',           deadline: at(2, 20),  priority: 'low',    done: false },
      { id: uid(), title: 'Review lecture slides',                      subject: 'Calculus II',       deadline: at(3, 9),   priority: 'low',    done: false },
      { id: uid(), title: 'Submit scholarship application',             subject: 'Admin',             deadline: at(5, 23),  priority: 'high',   done: false }
    ];
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ tasks: state.tasks, theme: state.theme, view: state.view }));
    } catch (_) { /* storage full / blocked — app still works in memory */ }
  }

  /* ==========================================================
     HELPERS
     ========================================================== */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay   = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const PRIO_RANK  = { high: 0, medium: 1, low: 2 };

  /** Stable hue derived from a subject name, used to colour subject pills. */
  function subjectHue(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }

  function formatDue(iso) {
    const d = new Date(iso);
    const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 0)  return `Today · ${time}`;
    if (diff === 1)  return `Tomorrow · ${time}`;
    if (diff === -1) return `Yesterday · ${time}`;
    if (diff < 0)    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
    if (diff < 7)    return `${d.toLocaleDateString([], { weekday: 'short' })} · ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
  }

  function toLocalInput(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
  }

  /** Which dashboard bucket does this task belong to? */
  function bucketOf(t, now = new Date()) {
    const d = new Date(t.deadline);
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (!t.done) {
      if (d < todayStart) return 'overdue';
      if (d <= todayEnd)  return 'today';
      return 'upcoming';
    }
    // Completed: keep it visible only if it belongs to today or the future.
    if (d < todayStart) return 'archived';
    if (d <= todayEnd)  return 'today';
    return 'upcoming';
  }

  function cmpTasks(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const byDate = new Date(a.deadline) - new Date(b.deadline);
    if (byDate) return byDate;
    return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 1900);
  }

  /* ==========================================================
     FILTERING
     ========================================================== */
  function visibleTasks() {
    const { subject, priority, search } = state.filters;
    const q = search.trim().toLowerCase();
    return state.tasks.filter((t) => {
      if (priority !== 'all' && t.priority !== priority) return false;
      if (subject !== 'all' && t.subject !== subject) return false;
      if (q && !(t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))) return false;
      return true;
    });
  }

  /* ==========================================================
     MUTATIONS
     ========================================================== */
  function toggleTask(id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    render();
  }

  function deleteTask(id) {
    const t = state.tasks.find((x) => x.id === id);
    state.tasks = state.tasks.filter((x) => x.id !== id);
    render();
    toast(t ? `Deleted “${t.title.slice(0, 34)}”` : 'Task deleted');
  }

  function updateTask(id, patch) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    render();
  }

  /* ==========================================================
     RENDERING — TASK CARD
     ========================================================== */
  function taskCard(t) {
    const isLate = !t.done && new Date(t.deadline) < new Date();
    return `
      <article class="task${t.done ? ' done' : ''}" draggable="true"
               data-id="${t.id}" data-prio="${t.priority}"
               tabindex="0" role="button"
               aria-label="${esc(t.title)} — ${esc(t.subject)}, ${t.priority} priority">
        <button class="check" data-act="toggle"
                aria-label="${t.done ? 'Mark incomplete' : 'Mark complete'}"
                aria-pressed="${t.done}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        </button>
        <div class="task-main">
          <div class="task-title">${esc(t.title)}</div>
          <div class="task-meta">
            <span class="pill subject" style="--h:${subjectHue(t.subject)}">${esc(t.subject)}</span>
            <span class="due${isLate ? ' late' : ''}">${formatDue(t.deadline)}</span>
          </div>
        </div>
        <button class="del" data-act="delete" aria-label="Delete task">×</button>
      </article>`;
  }

  const emptyBlock = (msg, icon = '✓') =>
    `<div class="empty"><div class="big">${icon}</div><div>${msg}</div></div>`;

  /* ==========================================================
     RENDERING — DASHBOARD
     ========================================================== */
  function renderDashboard() {
    const now = new Date();
    const groups = { overdue: [], today: [], upcoming: [] };

    for (const t of visibleTasks()) {
      const b = bucketOf(t, now);
      if (groups[b]) groups[b].push(t);
    }
    for (const k in groups) groups[k].sort(cmpTasks);

    const put = (id, arr, emptyMsg, icon) => {
      const el = $('#' + id);
      el.innerHTML = arr.length ? arr.map(taskCard).join('') : emptyBlock(emptyMsg, icon);
    };

    put('overdue-list',  groups.overdue,  'Nothing overdue. Great work!', '🌤');
    put('today-list',    groups.today,    'No tasks due today.', '☕');
    put('upcoming-list', groups.upcoming, 'Nothing scheduled ahead.', '🗓');

    $('#count-overdue').textContent  = groups.overdue.length;
    $('#count-today').textContent    = groups.today.length;
    $('#count-upcoming').textContent = groups.upcoming.length;
  }

  /* ==========================================================
     RENDERING — BOARD
     ========================================================== */
  function renderBoard() {
    const tasks = visibleTasks();
    for (const p of ['high', 'medium', 'low']) {
      const items = tasks.filter((t) => t.priority === p).sort(cmpTasks);
      const col = $(`.board-col[data-priority="${p}"]`);
      col.querySelector('.list').innerHTML = items.length
        ? items.map(taskCard).join('')
        : emptyBlock('Drop tasks here', '↧');
      col.querySelector('.count').textContent = items.length;
    }
  }

  /* ==========================================================
     RENDERING — STATS + RING
     ========================================================== */
  function renderStats() {
    const now = new Date();
    const all = state.tasks;
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const todays = all.filter((t) => {
      const d = new Date(t.deadline);
      return d >= todayStart && d <= todayEnd;
    });
    const todayDone = todays.filter((t) => t.done).length;

    const overdue = all.filter((t) => !t.done && new Date(t.deadline) < todayStart);
    const upcoming = all.filter((t) => {
      const d = new Date(t.deadline);
      return !t.done && d > todayEnd;
    });
    const next7 = upcoming.filter((t) => new Date(t.deadline) - now < 7 * 86400000).length;

    $('#stat-today').textContent = todays.filter((t) => !t.done).length;
    $('#stat-today-sub').textContent = todays.length
      ? `${todayDone} of ${todays.length} done`
      : 'nothing scheduled';

    $('#stat-overdue').textContent = overdue.length;
    $('#stat-overdue-sub').textContent = overdue.length
      ? (overdue.length === 1 ? 'task needs attention' : 'tasks need attention')
      : 'all caught up';

    $('#stat-upcoming').textContent = upcoming.length;
    $('#stat-upcoming-sub').textContent = `${next7} in the next 7 days`;

    $('#stat-done').textContent = todayDone;
    $('#stat-done-sub').textContent = todays.length && todayDone === todays.length
      ? 'day complete 🎉'
      : 'keep going';

    /* ---- Progress ring ---- */
    const pct = todays.length ? Math.round((todayDone / todays.length) * 100) : 0;
    const C = 2 * Math.PI * 40; // r = 40 in the 100x100 viewBox
    $('#ring-fg').style.strokeDasharray = C;
    $('#ring-fg').style.strokeDashoffset = C * (1 - pct / 100);
    $('#ring-pct').textContent = pct + '%';

    if (todays.length === 0) {
      $('#ring-title').textContent = 'No tasks due today';
      $('#ring-sub').textContent = overdue.length
        ? `${overdue.length} overdue — clear those first.`
        : 'Enjoy the breathing room.';
    } else {
      $('#ring-title').textContent = `${todayDone} of ${todays.length} complete`;
      $('#ring-sub').textContent = pct === 100
        ? 'Today is fully done. 🎉'
        : `${todays.length - todayDone} task${todays.length - todayDone === 1 ? '' : 's'} left today.`;
    }
  }

  /* ==========================================================
     RENDERING — FILTER CHROME
     ========================================================== */
  function renderFilters() {
    const subjects = [...new Set(state.tasks.map((t) => t.subject))]
      .sort((a, b) => a.localeCompare(b));

    if (state.filters.subject !== 'all' && !subjects.includes(state.filters.subject)) {
      state.filters.subject = 'all';
    }

    const sel = $('#subject-filter');
    sel.innerHTML =
      `<option value="all">All subjects</option>` +
      subjects.map((s) =>
        `<option value="${esc(s)}"${state.filters.subject === s ? ' selected' : ''}>${esc(s)}</option>`
      ).join('');
    sel.classList.toggle('active', state.filters.subject !== 'all');

    $$('.chip[data-priority]').forEach((c) => {
      c.classList.toggle('active', c.dataset.priority === state.filters.priority);
    });

    // Keep the form datalist in sync
    $('#subject-options').innerHTML = subjects.map((s) => `<option value="${esc(s)}">`).join('');
  }

  /* ==========================================================
     MASTER RENDER
     ========================================================== */
  function render() {
    document.documentElement.dataset.theme = state.theme;
    $('#theme-btn').textContent = state.theme === 'dark' ? '☾' : '☀';
    $('#theme-btn').title = `Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme (T)`;

    $('#today-label').textContent = new Date().toLocaleDateString([], {
      weekday: 'long', month: 'long', day: 'numeric'
    });

    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === state.view));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + state.view));

    renderFilters();
    renderStats();
    renderDashboard();
    renderBoard();
    save();
  }

  /* ==========================================================
     TASK DIALOG
     ========================================================== */
  const taskDialog = $('#task-dialog');
  const taskForm = $('#task-form');
  let editingId = null;

  function defaultDeadline() {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d;
  }

  function openTaskDialog(task = null) {
    editingId = task ? task.id : null;
    $('#dlg-title').textContent = task ? 'Edit task' : 'New task';

    taskForm.elements.title.value = task ? task.title : '';
    taskForm.elements.subject.value = task ? task.subject : '';
    taskForm.elements.deadline.value = toLocalInput(
      task ? new Date(task.deadline) : defaultDeadline()
    );
    taskForm.elements.priority.value = task ? task.priority : 'medium';

    taskDialog.showModal();
    setTimeout(() => taskForm.elements.title.focus(), 20);
  }

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const fd = new FormData(taskForm);
    const title = String(fd.get('title') || '').trim();
    const subject = String(fd.get('subject') || '').trim();
    const deadline = String(fd.get('deadline') || '');
    const priority = String(fd.get('priority') || 'medium');

    if (!title || !subject || !deadline) {
      toast('Please fill in title, subject and deadline');
      return;
    }

    const iso = new Date(deadline).toISOString();

    if (editingId) {
      updateTask(editingId, { title, subject, deadline: iso, priority });
      toast('Task updated');
    } else {
      state.tasks.push({
        id: uid(), title, subject, deadline: iso,
        priority, done: false
      });
      render();
      toast('Task added');
    }

    taskDialog.close();
    editingId = null;
  });

  $('#dlg-cancel').addEventListener('click', () => taskDialog.close());
  $('#new-btn').addEventListener('click', () => openTaskDialog());

  /* ==========================================================
     CLICK DELEGATION
     ========================================================== */
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-act]');
    if (actionEl) {
      const card = actionEl.closest('.task');
      if (card) {
        if (actionEl.dataset.act === 'toggle') toggleTask(card.dataset.id);
        if (actionEl.dataset.act === 'delete') deleteTask(card.dataset.id);
      }
      return;
    }

    const card = e.target.closest('.task');
    if (card && !e.target.closest('button')) {
      const task = state.tasks.find((t) => t.id === card.dataset.id);
      if (task) openTaskDialog(task);
    }
  });

  // Keyboard activation for task cards (a11y)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest?.('.task');
    if (card && e.target === card) {
      e.preventDefault();
      const task = state.tasks.find((t) => t.id === card.dataset.id);
      if (task) openTaskDialog(task);
    }
  });

  /* ==========================================================
     DRAG & DROP — PRIORITY BOARD
     ========================================================== */
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest?.('.task');
    if (!card) return;
    e.dataTransfer.setData('text/plain', card.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => card.classList.add('dragging'));
  });

  document.addEventListener('dragend', () => {
    $$('.task.dragging').forEach((c) => c.classList.remove('dragging'));
    $$('.board-col.drop-hover').forEach((c) => c.classList.remove('drop-hover'));
  });

  document.addEventListener('dragover', (e) => {
    const col = e.target.closest?.('.board-col');
    if (!col) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.board-col.drop-hover').forEach((c) => { if (c !== col) c.classList.remove('drop-hover'); });
    col.classList.add('drop-hover');
  });

  document.addEventListener('dragleave', (e) => {
    const col = e.target.closest?.('.board-col');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drop-hover');
  });

  document.addEventListener('drop', (e) => {
    const col = e.target.closest?.('.board-col');
    if (!col) return;
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const next = col.dataset.priority;
    const task = state.tasks.find((t) => t.id === id);
    if (task && task.priority !== next) {
      updateTask(id, { priority: next });
      toast(`Moved to ${next} priority`);
    }
    $$('.board-col.drop-hover').forEach((c) => c.classList.remove('drop-hover'));
  });

  /* ==========================================================
     FILTER INTERACTIONS
     ========================================================== */
  $('#subject-filter').addEventListener('change', (e) => {
    state.filters.subject = e.target.value;
    render();
  });

  $$('.chip[data-priority]').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.filters.priority = chip.dataset.priority;
      render();
    });
  });

  $('#search').addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderDashboard();
    renderBoard();
  });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.view = tab.dataset.view;
      render();
    });
  });

  /* ==========================================================
     THEME
     ========================================================== */
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    render();
    toast(`${state.theme === 'dark' ? 'Dark' : 'Light'} theme`);
  }
  $('#theme-btn').addEventListener('click', toggleTheme);

  /* ==========================================================
     SHORTCUTS DIALOG
     ========================================================== */
  const helpDialog = $('#help-dialog');
  $('#help-btn').addEventListener('click', () => helpDialog.showModal());
  $('#help-close').addEventListener('click', () => helpDialog.close());

  /* ==========================================================
     GLOBAL KEYBOARD SHORTCUTS
     ========================================================== */
  const isTyping = (el) =>
    el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
           el.tagName === 'SELECT' || el.isContentEditable);

  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+Enter inside the task dialog saves
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && taskDialog.open) {
      e.preventDefault();
      taskForm.requestSubmit();
      return;
    }

    if (e.key === 'Escape') {
      if (taskDialog.open) taskDialog.close();
      if (helpDialog.open) helpDialog.close();
      return;
    }

    if (isTyping(document.activeElement)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (taskDialog.open || helpDialog.open) return;

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        openTaskDialog();
        break;
      case '/':
        e.preventDefault();
        $('#search').focus();
        $('#search').select();
        break;
      case 't':
        e.preventDefault();
        toggleTheme();
        break;
      case '1':
        state.view = 'dashboard'; render();
        break;
      case '2':
        state.view = 'board'; render();
        break;
      case '?':
        e.preventDefault();
        helpDialog.showModal();
        break;
    }
  });

  /* ==========================================================
     BOOT
     ========================================================== */
  render();

  // Refresh the "today" boundaries if the tab stays open across midnight
  setInterval(() => {
    const now = new Date();
    if (!render._lastDay) render._lastDay = now.toDateString();
    if (render._lastDay !== now.toDateString()) {
      render._lastDay = now.toDateString();
      render();
    }
  }, 60_000);
})();