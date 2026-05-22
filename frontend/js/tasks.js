// ============================================================
//  Tasks Dashboard View (Kanban + List)
// ============================================================

let currentUser = null;
let allTasks = [];
let activeFilters = { status: null, priority: null, category: null, search: '' };
let timerInterval = null;
let timeLeft = 25 * 60;
let isTimerRunning = false;
let viewMode = 'kanban'; // 'kanban' | 'list'
let editingTaskId = null;

const PRIORITY_META = {
  low:    { label: 'Low',    icon: '🟢', class: 'priority-low' },
  medium: { label: 'Medium', icon: '🟡', class: 'priority-medium' },
  high:   { label: 'High',   icon: '🔴', class: 'priority-high' },
  urgent: { label: 'Urgent', icon: '🚨', class: 'priority-urgent' }
};

const STATUS_META = {
  todo:        { label: 'To Do',       icon: '📋', class: 'col-todo' },
  in_progress: { label: 'In Progress', icon: '⚡', class: 'col-progress' },
  done:        { label: 'Done',        icon: '✅', class: 'col-done' }
};

async function renderDashboard(user) {
  currentUser = user;
  document.getElementById('app').innerHTML = buildDashboardHTML(user);
  attachSidebarEvents();
  await refreshDashboard();

  // Connect WebSocket
  API.connectWS({
    'task:created': (task) => {
      allTasks.unshift(task);
      renderTaskViews();
      showToast('✨ New task created', 'success');
      updateStats();
    },
    'task:updated': (task) => {
      const idx = allTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) allTasks[idx] = task;
      else allTasks.unshift(task);
      renderTaskViews();
      updateStats();
    },
    'task:deleted': ({ id }) => {
      allTasks = allTasks.filter(t => t.id !== id);
      renderTaskViews();
      showToast('🗑️ Task deleted', 'info');
      updateStats();
    }
  });
}

function buildDashboardHTML(user) {
  const initials = user.username.slice(0, 2).toUpperCase();
  return `
  <div class="dashboard">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">✓</div>
          <span class="sidebar-logo-text">TaskFlow</span>
        </div>
        <button class="sidebar-close" id="sidebar-close" onclick="toggleSidebar()">✕</button>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-item ${!activeFilters.status && !activeFilters.priority && !activeFilters.category ? 'active' : ''}" 
           href="#" onclick="clearFilters()">
          <span class="nav-icon">📊</span> ${I18N.t('dashboard')}
        </a>
        <a class="nav-item" href="#" onclick="showKanbanView()">
          <span class="nav-icon">📋</span> ${I18N.t('kanban')}
        </a>
        <div class="nav-label">FILTERS</div>
        <a class="nav-item" href="#" onclick="setFilter('status','todo')">
          <span class="nav-icon">📌</span> To Do
        </a>
        <a class="nav-item" href="#" onclick="setFilter('status','in_progress')">
          <span class="nav-icon">⚡</span> In Progress
        </a>
        <a class="nav-item" href="#" onclick="setFilter('status','done')">
          <span class="nav-icon">✅</span> Done
        </a>
        <a class="nav-item" href="#" onclick="setFilter('priority','urgent')">
          <span class="nav-icon">🚨</span> Urgent
        </a>
        <a class="nav-item" href="#" onclick="clearFilters()">
          <span class="nav-icon">🔄</span> All Tasks
        </a>
        
        <div id="sidebar-categories">
          <!-- Categories will be injected here -->
        </div>

        <div class="nav-label">${I18N.t('productivity')}</div>
        <div class="productivity-card">
          <div class="focus-timer">
            <div id="pomodoro-time">25:00</div>
            <div class="timer-controls">
              <button onclick="toggleTimer()" id="timer-toggle">▶️</button>
              <button onclick="resetTimer()">🔄</button>
            </div>
            <div class="timer-label">${I18N.t('focus_timer')}</div>
          </div>
        </div>

        <div class="nav-label">${I18N.t('settings')}</div>
        <a class="nav-item" href="#" onclick="openSettingsModal()">
          <span class="nav-icon">⚙️</span> User Settings
        </a>
      </nav>

      <div class="sidebar-user">
        <div class="user-avatar" style="background:${user.avatarColor || user.avatar_color || '#6c63ff'}">${initials}</div>
        <div class="user-info">
          <div class="user-name">${user.username}</div>
          <div class="user-email">${user.email}</div>
        </div>
        <button class="btn-logout" title="Logout" onclick="handleLogout()">⏻</button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Topbar -->
      <header class="topbar">
        <button class="hamburger" onclick="toggleSidebar()">☰</button>
        <div class="topbar-search">
          <span class="search-icon">🔍</span>
          <input type="text" id="global-search" placeholder="${I18N.t('search')}" 
                 oninput="handleSearch(this.value)"/>
        </div>
        <div class="topbar-actions">
          <div class="view-switch">
            <button class="switch-btn ${viewMode === 'kanban' ? 'active' : ''}" onclick="setView('kanban')" title="Kanban">🗂️</button>
            <button class="switch-btn ${viewMode === 'list' ? 'active' : ''}" onclick="setView('list')" title="List">📋</button>
          </div>
          <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" title="${I18N.t('theme')}">🌓</button>
          <div class="ws-indicator" id="ws-indicator" title="Real-time sync"></div>
          <button class="btn-primary btn-create" onclick="openTaskModal()">
            <span>+</span> ${I18N.t('add_task')}
          </button>
        </div>
      </header>

      <!-- Stats Bar -->
      <div class="stats-bar" id="stats-bar">
        <div class="stat-card" id="stat-total">
          <div class="stat-num">0</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card todo-card" id="stat-todo">
          <div class="stat-num">0</div>
          <div class="stat-label">To Do</div>
        </div>
        <div class="stat-card progress-card" id="stat-progress">
          <div class="stat-num">0</div>
          <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card done-card" id="stat-done">
          <div class="stat-num">0</div>
          <div class="stat-label">Done</div>
        </div>
        <div class="stat-card urgent-card" id="stat-urgent">
          <div class="stat-num">0</div>
          <div class="stat-label">Urgent</div>
        </div>
        <div class="stat-card overdue-card" id="stat-overdue">
          <div class="stat-num">0</div>
          <div class="stat-label">Overdue</div>
        </div>
      </div>

      <!-- Task View Area -->
      <div class="view-area" id="view-area">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
    </main>
  </div>

  <!-- Task Modal -->
  <div class="modal-overlay hidden" id="task-modal" onclick="closeModalOutside(event)">
    <div class="modal" id="modal-content">
      <div class="modal-header">
        <h2 id="modal-title">New Task</h2>
        <button class="modal-close" onclick="closeTaskModal()">✕</button>
      </div>
      <form id="task-form" onsubmit="handleTaskSubmit(event)">
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="task-title">Title *</label>
            <input type="text" id="task-title" placeholder="What needs to be done?" required maxlength="120"/>
          </div>
          <div class="form-group span-2">
            <label for="task-desc">Description</label>
            <textarea id="task-desc" placeholder="Add more details..." rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="task-status">Status</label>
            <select id="task-status">
              <option value="todo">📋 To Do</option>
              <option value="in_progress">⚡ In Progress</option>
              <option value="done">✅ Done</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-priority">Priority</label>
            <select id="task-priority">
              <option value="low">🟢 Low</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="high">🔴 High</option>
              <option value="urgent">🚨 Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-category">Category</label>
            <input type="text" id="task-category" placeholder="e.g. Work, Personal" value="General" maxlength="50"/>
          </div>
          <div class="form-group">
            <label for="task-due">Due Date</label>
            <input type="datetime-local" id="task-due"/>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeTaskModal()">Cancel</button>
          <button type="submit" class="btn-primary" id="modal-submit-btn">
            <span class="btn-text">Create Task</span>
            <span class="btn-loader hidden"></span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Confirm Modal -->
  <div class="modal-overlay hidden" id="delete-modal" onclick="closeDeleteModalOutside(event)">
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Delete Task?</h2>
        <button class="modal-close" onclick="closeDeleteModal()">✕</button>
      </div>
      <p class="delete-msg">This action cannot be undone.</p>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeDeleteModal()">Cancel</button>
        <button class="btn-danger" id="confirm-delete-btn" onclick="confirmDelete()">Delete Task</button>
      </div>
    </div>
  </div>

  <!-- User Settings Modal -->
  <div class="modal-overlay hidden" id="settings-modal" onclick="if(event.target===this)closeSettingsModal()">
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>${I18N.t('settings')}</h2>
        <button class="modal-close" onclick="closeSettingsModal()">✕</button>
      </div>
      <form id="settings-form" onsubmit="handleSettingsSubmit(event)">
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="set-username">${I18N.t('username')}</label>
            <input type="text" id="set-username" required/>
          </div>
          <div class="form-group span-2" id="lang-group">
            <!-- Language selector injected here -->
          </div>
          <div class="form-group span-2">
            <label for="set-avatar">${I18N.t('avatar_color')}</label>
            <div class="color-picker-wrap">
              <input type="color" id="set-avatar" oninput="document.getElementById('color-preview').style.background=this.value"/>
              <span class="color-preview" id="color-preview"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeSettingsModal()">Cancel</button>
          <button type="submit" class="btn-primary" id="settings-submit-btn">Save Changes</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toast-container"></div>
  `;
}

// --- Sidebar ---
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function attachSidebarEvents() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTaskModal();
  });
}

// --- Refresh ---
async function refreshDashboard() {
  try {
    const [tasks, stats] = await Promise.all([
      API.Tasks.list(activeFilters),
      API.Tasks.stats()
    ]);
    allTasks = tasks;
    renderTaskViews();
    applyStats(stats);
    renderSidebarCategories();
  } catch (err) {
    showToast('Failed to load tasks', 'error');
  }
}

async function updateStats() {
  try {
    const stats = await API.Tasks.stats();
    applyStats(stats);
  } catch {}
}

function applyStats(s) {
  if (!s) return;
  document.getElementById('stat-total').querySelector('.stat-num').textContent = s.total || 0;
  document.getElementById('stat-todo').querySelector('.stat-num').textContent = s.todo || 0;
  document.getElementById('stat-progress').querySelector('.stat-num').textContent = s.in_progress || 0;
  document.getElementById('stat-done').querySelector('.stat-num').textContent = s.done || 0;
  document.getElementById('stat-urgent').querySelector('.stat-num').textContent = s.urgent || 0;
  document.getElementById('stat-overdue').querySelector('.stat-num').textContent = s.overdue || 0;
}
function setFilter(key, val) {
  if (activeFilters[key] === val) activeFilters[key] = null;
  else activeFilters[key] = val;
  refreshDashboard();
}

function clearFilters() {
  activeFilters = { status: null, priority: null, category: null, search: '' };
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  refreshDashboard();
}

function handleSearch(val) {
  activeFilters.search = val;
  renderTaskViews(); // Local filter for speed
}

function setView(mode) {
  viewMode = mode;
  renderTaskViews();
  // Update buttons
  document.querySelectorAll('.switch-btn').forEach(b => b.classList.remove('active'));
  if (mode === 'kanban') document.querySelector('.switch-btn:first-child')?.classList.add('active');
  else document.querySelector('.switch-btn:last-child')?.classList.add('active');
}

// --- View Rendering ---
function renderTaskViews() {
  const area = document.getElementById('view-area');
  if (!area) return;

  let filtered = applyClientFilters(allTasks);

  if (viewMode === 'kanban') {
    area.innerHTML = buildKanbanHTML(filtered);
    initDragAndDrop();
  } else {
    area.innerHTML = buildListHTML(filtered);
  }
}

function renderSidebarCategories() {
  const container = document.getElementById('sidebar-categories');
  if (!container) return;

  const categories = [...new Set(allTasks.map(t => t.category || 'General'))].sort();
  if (categories.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="nav-label">${I18N.t('categories')}</div>
    ${categories.map(cat => `
      <a class="nav-item ${activeFilters.category === cat ? 'active' : ''}" 
         href="#" onclick="setFilter('category', '${cat}')">
        <span class="nav-icon">🏷️</span> ${escHtml(cat)}
      </a>
    `).join('')}
  `;
}

function applyClientFilters(tasks) {
  let result = [...tasks];
  const search = (activeFilters.search || '').toLowerCase();
  if (search) {
    result = result.filter(t =>
      t.title.toLowerCase().includes(search) ||
      (t.description || '').toLowerCase().includes(search)
    );
  }
  return result;
}

// --- Kanban Board ---
function buildKanbanHTML(tasks) {
  const columns = ['todo', 'in_progress', 'done'];
  return `
    <div class="kanban-board">
      ${columns.map(status => {
        const colTasks = tasks.filter(t => t.status === status);
        const meta = STATUS_META[status];
        return `
          <div class="kanban-col ${meta.class}" id="col-${status}">
            <div class="col-header">
              <span class="col-icon">${meta.icon}</span>
              <span class="col-title">${meta.label}</span>
              <span class="col-count">${colTasks.length}</span>
            </div>
            <div class="col-tasks" id="tasks-${status}">
              ${colTasks.length === 0
                ? `<div class="empty-col">Drop tasks here</div>`
                : colTasks.map(t => buildTaskCard(t)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function buildTaskCard(task) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const dueStr = task.due_date ? formatDueDate(task.due_date) : '';
  return `
    <div class="task-card ${isOverdue ? 'overdue' : ''}" 
         id="card-${task.id}" 
         data-id="${task.id}"
         draggable="true"
         ondragstart="handleDragStart(event)"
         ondragend="handleDragEnd(event)">
      <div class="card-top">
        <span class="priority-badge ${pm.class}">${pm.icon} ${pm.label}</span>
        <div class="card-actions">
          <button class="card-btn" title="Edit" onclick="openEditModal('${task.id}')">✏️</button>
          <button class="card-btn danger" title="Delete" onclick="openDeleteModal('${task.id}')">🗑️</button>
        </div>
      </div>
      <h3 class="card-title">${escHtml(task.title)}</h3>
      ${task.description ? `<p class="card-desc">${escHtml(task.description)}</p>` : ''}
      <div class="card-footer">
        <span class="card-category">${escHtml(task.category || 'General')}</span>
        ${dueStr ? `<span class="card-due ${isOverdue ? 'overdue-text' : ''}">${dueStr}</span>` : ''}
      </div>
      <div class="status-stepper">
        ${['todo','in_progress','done'].map(s => `
          <button class="step-btn ${task.status === s ? 'active' : ''}"
                  onclick="quickStatus('${task.id}', '${s}')"
                  title="${STATUS_META[s].label}">
            ${STATUS_META[s].icon}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// --- Drag & Drop ---
let draggedId = null;

function initDragAndDrop() {
  const cols = document.querySelectorAll('.col-tasks');
  cols.forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const taskId = draggedId;
      const newStatus = col.id.replace('tasks-', '');
      
      const task = allTasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        try {
          await API.Tasks.updateStatus(taskId, newStatus);
        } catch (err) {
          showToast('Failed to move task', 'error');
        }
      }
    });
  });
}

function handleDragStart(e) {
  draggedId = e.target.closest('.task-card').dataset.id;
  e.target.closest('.task-card').classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.closest('.task-card').classList.remove('dragging');
  draggedId = null;
}

// --- List View ---
function buildListHTML(tasks) {
  if (tasks.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>No tasks found</h3>
      <p>Create your first task to get started!</p>
      <button class="btn-primary" onclick="openTaskModal()">+ New Task</button>
    </div>`;
  }
  return `
    <div class="list-view">
      <table class="task-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Category</th>
            <th>Due Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => {
            const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
            const sm = STATUS_META[task.status] || STATUS_META.todo;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
            return `
              <tr class="task-row ${isOverdue ? 'overdue' : ''}" id="row-${task.id}">
                <td class="col-title-cell">
                  <span class="row-title">${escHtml(task.title)}</span>
                  ${task.description ? `<span class="row-desc">${escHtml(task.description.slice(0,60))}${task.description.length > 60 ? '...' : ''}</span>` : ''}
                </td>
                <td><span class="status-badge status-${task.status}">${sm.icon} ${sm.label}</span></td>
                <td><span class="priority-badge ${pm.class}">${pm.icon} ${pm.label}</span></td>
                <td><span class="cat-chip">${escHtml(task.category || 'General')}</span></td>
                <td class="${isOverdue ? 'overdue-text' : ''}">${task.due_date ? formatDueDate(task.due_date) : '—'}</td>
                <td class="row-actions">
                  <button class="card-btn" onclick="openEditModal('${task.id}')">✏️</button>
                  <button class="card-btn danger" onclick="openDeleteModal('${task.id}')">🗑️</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// --- View Toggle ---
function setView(mode) {
  viewMode = mode;
  document.getElementById('nav-board').classList.toggle('active', mode === 'kanban');
  document.getElementById('nav-list').classList.toggle('active', mode === 'list');
  renderTaskViews();
}

// --- Filters ---
function setFilter(key, value) {
  activeFilters = { [key]: value };
  refreshDashboard();
}

// --- Task Modal ---
function openTaskModal() {
  editingTaskId = null;
  document.getElementById('modal-title').textContent = 'New Task';
  document.getElementById('modal-submit-btn').querySelector('.btn-text').textContent = 'Create Task';
  document.getElementById('task-form').reset();
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-category').value = 'General';
  document.getElementById('task-modal').classList.remove('hidden');
  document.getElementById('task-title').focus();
}

async function openEditModal(taskId) {
  editingTaskId = taskId;
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('modal-submit-btn').querySelector('.btn-text').textContent = 'Save Changes';
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-desc').value = task.description || '';
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-category').value = task.category || 'General';
  document.getElementById('task-due').value = task.due_date
    ? task.due_date.slice(0, 16)
    : '';
  document.getElementById('task-modal').classList.remove('hidden');
  document.getElementById('task-title').focus();
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
  editingTaskId = null;
}

function closeModalOutside(e) {
  if (e.target.id === 'task-modal') closeTaskModal();
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('modal-submit-btn');
  setButtonLoading(btn, true);

  const payload = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    category: document.getElementById('task-category').value,
    due_date: document.getElementById('task-due').value || null
  };

  try {
    if (editingTaskId) {
      await API.Tasks.update(editingTaskId, payload);
      showToast('✅ Task updated!', 'success');
    } else {
      await API.Tasks.create(payload);
      showToast('✨ Task created!', 'success');
    }
    closeTaskModal();
    // WS will handle UI update
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

// --- Delete Modal ---
let pendingDeleteId = null;

function openDeleteModal(taskId) {
  pendingDeleteId = taskId;
  document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  pendingDeleteId = null;
}

function closeDeleteModalOutside(e) {
  if (e.target.id === 'delete-modal') closeDeleteModal();
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  try {
    await API.Tasks.delete(pendingDeleteId);
    closeDeleteModal();
    // WS handles removal
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

// --- Quick Status ---
async function quickStatus(taskId, status) {
  try {
    await API.Tasks.updateStatus(taskId, status);
    // WS will update UI
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Settings Modal ---
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  const user = currentUser;
  document.getElementById('set-username').value = user.username;
  document.getElementById('set-avatar').value = user.avatar_color || '#6c63ff';
  document.getElementById('color-preview').style.background = user.avatar_color || '#6c63ff';
  
  // Add language selector if not present
  let langGroup = document.getElementById('lang-group');
  if (!langGroup) {
    langGroup = document.createElement('div');
    langGroup.id = 'lang-group';
    langGroup.className = 'form-group span-2';
    langGroup.innerHTML = `
      <label>${I18N.t('language')}</label>
      <select id="set-lang" style="width:100%;padding:10px;border-radius:var(--radius-sm);background:var(--surface);border:1px solid var(--border);color:var(--text)">
        <option value="en" ${I18N.current === 'en' ? 'selected' : ''}>English</option>
        <option value="es" ${I18N.current === 'es' ? 'selected' : ''}>Español</option>
        <option value="fr" ${I18N.current === 'fr' ? 'selected' : ''}>Français</option>
        <option value="hi" ${I18N.current === 'hi' ? 'selected' : ''}>हिन्दी</option>
      </select>
    `;
    document.querySelector('.form-grid').appendChild(langGroup);
  }

  modal.classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('settings-submit-btn');
  btn.disabled = true;

  const payload = {
    username: document.getElementById('set-username').value,
    avatar_color: document.getElementById('set-avatar').value
  };
  const lang = document.getElementById('set-lang').value;

  try {
    await API.Auth.updateSettings(payload);
    I18N.setLang(lang); // This reloads the page
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

// --- Logout ---
function handleLogout() {
  API.Auth.logout();
  window.AppRouter.navigateTo('auth');
}

// --- Toast ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// --- Helpers ---
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDueDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) return `⚠️ ${Math.abs(days)}d overdue`;
  if (days === 0) return '🔥 Due today';
  if (days === 1) return '⏰ Due tomorrow';
  if (days <= 7) return `📅 ${days}d left`;
  return `📅 ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function setButtonLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (!text || !loader) return;
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}
function toggleTimer() {
  const btn = document.getElementById('timer-toggle');
  if (isTimerRunning) {
    clearInterval(timerInterval);
    btn.innerText = '▶️';
  } else {
    timerInterval = setInterval(updateTimer, 1000);
    btn.innerText = '⏸️';
  }
  isTimerRunning = !isTimerRunning;
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timeLeft = 25 * 60;
  document.getElementById('timer-toggle').innerText = '▶️';
  updateTimerDisplay();
}

function updateTimer() {
  if (timeLeft > 0) {
    timeLeft--;
    updateTimerDisplay();
  } else {
    clearInterval(timerInterval);
    isTimerRunning = false;
    document.getElementById('timer-toggle').innerText = '▶️';
    showToast('⏰ Focus session complete!', 'success');
    playSound('complete');
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  document.getElementById('pomodoro-time').innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function playSound(type) {
  // Sound logic can be added here if audio files are available
  console.log(`🎵 Playing sound: ${type}`);
}
async function quickStatus(id, status) {
  try {
    await API.Tasks.updateStatus(id, status);
  } catch (err) {
    showToast('Update failed', 'error');
  }
}
