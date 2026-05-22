const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.broadcast = null;
function broadcastToUser(userId, event, data) {
  if (typeof router.broadcast === 'function') router.broadcast(userId, { event, data });
}

// GET /api/tasks
router.get('/', (req, res) => {
  const { status, priority, category, search, sort = 'created_at', order = 'desc' } = req.query;
  const allowedSorts = ['created_at','updated_at','due_date','priority','title'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

  let query = 'SELECT * FROM tasks WHERE user_id=?';
  const params = [req.user.id];

  if (status)   { query += ' AND status=?';   params.push(status); }
  if (priority) { query += ' AND priority=?'; params.push(priority); }
  if (category) { query += ' AND category=?'; params.push(category); }
  if (search)   { query += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ` ORDER BY ${safeSort} ${safeOrder}`;
  const tasks = all(query, params);
  res.json({ tasks });
});

// GET /api/tasks/stats
router.get('/stats', (req, res) => {
  const tasks = all('SELECT status,priority,due_date FROM tasks WHERE user_id=?', [req.user.id]);
  const now = new Date().toISOString();
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    overdue: tasks.filter(t => t.due_date && t.due_date < now && t.status !== 'done').length
  };
  res.json({ stats });
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const task = get('SELECT * FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

// POST /api/tasks
router.post('/', (req, res) => {
  const { title, description='', status='todo', priority='medium', category='General', due_date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Task title is required' });

  const id = uuidv4();
  const now = new Date().toISOString();
  run(
    'INSERT INTO tasks (id,user_id,title,description,status,priority,category,due_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, req.user.id, title.trim(), description, status, priority, category, due_date||null, now, now]
  );

  const task = get('SELECT * FROM tasks WHERE id=?', [id]);
  broadcastToUser(req.user.id, 'task:created', task);
  res.status(201).json({ task });
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const existing = get('SELECT * FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, category, due_date } = req.body;
  const u = {
    title:       title       !== undefined ? title.trim() : existing.title,
    description: description !== undefined ? description  : existing.description,
    status:      status      !== undefined ? status       : existing.status,
    priority:    priority    !== undefined ? priority     : existing.priority,
    category:    category    !== undefined ? category     : existing.category,
    due_date:    due_date    !== undefined ? due_date     : existing.due_date,
    updated_at:  new Date().toISOString()
  };

  run(
    'UPDATE tasks SET title=?,description=?,status=?,priority=?,category=?,due_date=?,updated_at=? WHERE id=? AND user_id=?',
    [u.title, u.description, u.status, u.priority, u.category, u.due_date, u.updated_at, req.params.id, req.user.id]
  );

  const task = get('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  broadcastToUser(req.user.id, 'task:updated', task);
  res.json({ task });
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['todo','in_progress','done'].includes(status))
    return res.status(400).json({ error: 'Invalid status value' });

  const existing = get('SELECT id FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const now = new Date().toISOString();
  run('UPDATE tasks SET status=?,updated_at=? WHERE id=? AND user_id=?', [status, now, req.params.id, req.user.id]);

  const task = get('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  broadcastToUser(req.user.id, 'task:updated', task);
  res.json({ task });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const existing = get('SELECT id FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  run('DELETE FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  broadcastToUser(req.user.id, 'task:deleted', { id: req.params.id });
  res.json({ message: 'Task deleted successfully' });
});

module.exports = router;
