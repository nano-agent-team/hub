<template>
  <div class="tickets-root">
    <div class="layout">
      <!-- List panel -->
      <div class="list-panel">
        <div class="toolbar">
          <input v-model="search" class="search-input" placeholder="🔍 Hledat..." autocomplete="off" />
          <select v-model="filterStatus" class="filter-select">
            <option value="">Vše (status)</option>
            <option value="idea">idea</option>
            <option value="approved">approved</option>
            <option value="spec_ready">spec_ready</option>
            <option value="in_progress">in_progress</option>
            <option value="review">review</option>
            <option value="done">done</option>
            <option value="verified">verified</option>
            <option value="rejected">rejected</option>
            <option value="pending_input">pending_input</option>
          </select>
          <select v-model="filterPriority" class="filter-select">
            <option value="">Vše (priorita)</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MED">MED</option>
            <option value="LOW">LOW</option>
          </select>
          <button class="btn-new" @click="showNewForm = !showNewForm">+ Nový</button>
        </div>

        <div class="list-header">
          <span>{{ filteredTickets.length }} ticketů</span>
          <button class="btn-refresh" @click="loadTickets">↻</button>
        </div>

        <ul class="ticket-list">
          <li
            v-for="t in filteredTickets"
            :key="t.id"
            :class="['ticket-item', selectedId === t.id ? 'active' : '']"
            @click="selectTicket(t)"
          >
            <div class="ti-header">
              <span class="ti-id">{{ t.id }}</span>
              <span :class="`badge badge-${t.status}`">{{ t.status }}</span>
              <span v-if="t.priority" :class="`badge badge-pri-${t.priority}`">{{ t.priority }}</span>
            </div>
            <div class="ti-title">{{ t.title }}</div>
            <div class="ti-meta">
              <span v-if="t.assigned_to">{{ t.assigned_to }}</span>
              <span v-if="t.updated_at" class="ti-date">{{ relTime(t.updated_at) }}</span>
            </div>
          </li>
        </ul>

        <!-- New ticket form (collapsible) -->
        <div v-if="showNewForm" class="new-ticket-form">
          <input
            v-model="newTitle"
            class="new-ticket-input"
            placeholder="Název ticketu..."
            @keyup.enter="createTicket"
            ref="newTitleRef"
            autofocus
          />
          <div class="new-ticket-meta">
            <select v-model="newPriority" class="filter-select">
              <option value="MED">MED</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="LOW">LOW</option>
            </select>
            <select v-model="newType" class="filter-select">
              <option value="task">task</option>
              <option value="story">story</option>
              <option value="bug">bug</option>
              <option value="epic">epic</option>
              <option value="idea">idea</option>
            </select>
          </div>
          <div class="new-ticket-actions">
            <button class="btn-create" :disabled="!newTitle.trim()" @click="createTicket">Vytvořit</button>
            <button class="btn-cancel" @click="showNewForm = false">Zrušit</button>
          </div>
        </div>
      </div>

      <!-- Detail panel -->
      <div class="detail-panel">
        <div v-if="!selected" class="detail-empty">
          <div style="font-size:40px;opacity:0.2">📋</div>
          <div>Vyberte ticket ze seznamu</div>
        </div>

        <div v-else class="detail-content">
          <div class="detail-header">
            <div class="detail-id">{{ selected.id }}</div>
            <div class="detail-badges">
              <span :class="`badge badge-${selected.status}`">{{ selected.status }}</span>
              <span v-if="selected.priority" :class="`badge badge-pri-${selected.priority}`">{{ selected.priority }}</span>
            </div>
            <div class="detail-actions">
              <select
                v-model="editStatus"
                class="filter-select"
                @change="updateStatus"
                title="Změnit status"
              >
                <option v-for="s in allStatuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>

          <h2 class="detail-title">{{ selected.title }}</h2>

          <div class="detail-meta">
            <span v-if="selected.assigned_to">👤 {{ selected.assigned_to }}</span>
            <span v-if="selected.type">🏷 {{ selected.type }}</span>
            <span v-if="selected.created_at">📅 {{ relTime(selected.created_at) }}</span>
            <span v-if="selected.updated_at">🔄 {{ relTime(selected.updated_at) }}</span>
          </div>

          <div v-if="selected.body" class="detail-section">
            <div class="section-label">POPIS / SPEC</div>
            <div class="markdown-body" v-html="renderMarkdown(selected.body)"></div>
          </div>

          <!-- Pipeline indicator -->
          <div class="pipeline-strip">
            <span
              v-for="(s, i) in pipelineStatuses"
              :key="s"
              :class="['pipe-step', getPipelineClass(s, selected.status)]"
            >
              <span v-if="i > 0" class="pipe-arrow">→</span>
              {{ s }}
            </span>
          </div>

          <!-- Comments -->
          <div class="detail-section">
            <div class="section-label">KOMENTÁŘE ({{ comments.length }})</div>
            <div v-for="c in comments" :key="c.id" class="comment">
              <div class="comment-header">
                <span class="comment-author">{{ c.author || 'Agent' }}</span>
                <span class="comment-time">{{ relTime(c.created_at) }}</span>
              </div>
              <div class="comment-body">{{ c.body }}</div>
            </div>
            <div v-if="comments.length === 0" class="no-comments">Žádné komentáře</div>
          </div>

          <!-- Add comment -->
          <div class="comment-form">
            <textarea
              v-model="newComment"
              placeholder="Přidat komentář..."
              class="comment-textarea"
              rows="3"
            ></textarea>
            <button class="btn-comment" :disabled="!newComment.trim()" @click="addComment">Přidat komentář</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { marked } from 'marked'

interface Ticket {
  id: string
  title: string
  status: string
  priority?: string
  type?: string
  assigned_to?: string
  body?: string
  created_at?: string
  updated_at?: string
}

interface Comment {
  id: number
  author?: string
  body: string
  created_at?: string
}

const allStatuses = ['idea', 'approved', 'spec_ready', 'in_progress', 'review', 'done', 'verified', 'rejected', 'pending_input']
const pipelineStatuses = ['idea', 'approved', 'spec_ready', 'in_progress', 'review', 'done', 'verified']

const tickets = ref<Ticket[]>([])
const selected = ref<Ticket | null>(null)
const selectedId = ref<string | null>(null)
const comments = ref<Comment[]>([])
const newComment = ref('')
const search = ref('')
const filterStatus = ref('')
const filterPriority = ref('')
const editStatus = ref('')
const showNewForm = ref(false)
const newTitle = ref('')
const newPriority = ref('MED')
const newType = ref('task')
const newTitleRef = ref<HTMLInputElement | null>(null)

// URL param ?q=
const urlQ = new URLSearchParams(window.location.search).get('q')
if (urlQ) search.value = urlQ

const filteredTickets = computed(() => {
  let list = tickets.value
  if (filterStatus.value) list = list.filter((t) => t.status === filterStatus.value)
  if (filterPriority.value) list = list.filter((t) => t.priority === filterPriority.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.assigned_to?.toLowerCase().includes(q) ?? false),
    )
  }
  return list
})

watch(selected, (t) => {
  editStatus.value = t?.status ?? ''
})

function relTime(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function renderMarkdown(md: string): string {
  try { return marked.parse(md) as string } catch { return md }
}

function getPipelineClass(step: string, current: string): string {
  const idx = pipelineStatuses.indexOf(step)
  const cur = pipelineStatuses.indexOf(current)
  if (step === current) return 'pipe-current'
  if (idx < cur) return 'pipe-done'
  return 'pipe-future'
}

async function loadTickets() {
  try {
    const res = await fetch('/api/tickets')
    tickets.value = await res.json()
    if (urlQ && !selected.value) {
      const found = tickets.value.find((t) => t.id.toLowerCase() === urlQ.toLowerCase())
      if (found) void selectTicket(found)
    }
  } catch (e) { console.error('loadTickets', e) }
}

async function selectTicket(t: Ticket) {
  selected.value = t
  selectedId.value = t.id
  editStatus.value = t.status
  await loadComments(t.id)
}

async function loadComments(ticketId: string) {
  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/comments`)
    comments.value = res.ok ? await res.json() : []
  } catch { comments.value = [] }
}

async function addComment() {
  if (!selected.value || !newComment.value.trim()) return
  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(selected.value.id)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newComment.value.trim() }),
    })
    if (res.ok) {
      newComment.value = ''
      await loadComments(selected.value.id)
    }
  } catch (e) { console.error('addComment', e) }
}

async function createTicket() {
  if (!newTitle.value.trim()) return
  try {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.value.trim(), priority: newPriority.value, type: newType.value, status: 'idea' }),
    })
    if (res.ok) {
      const ticket = await res.json()
      newTitle.value = ''
      showNewForm.value = false
      await loadTickets()
      void selectTicket(ticket)
    }
  } catch (e) { console.error('createTicket', e) }
}

async function updateStatus() {
  if (!selected.value || editStatus.value === selected.value.status) return
  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(selected.value.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: editStatus.value, changed_by: 'dashboard' }),
    })
    if (res.ok) {
      const updated = await res.json()
      selected.value = updated
      await loadTickets()
    }
  } catch (e) { console.error('updateStatus', e) }
}

watch(showNewForm, async (v) => {
  if (v) {
    await nextTick()
    newTitleRef.value?.focus()
  }
})

// SSE for live updates
let evtSource: EventSource | null = null

function connectSSE() {
  evtSource = new EventSource('/api/events')
  evtSource.addEventListener('ticket:created', () => { void loadTickets() })
  evtSource.addEventListener('ticket:updated', async () => {
    await loadTickets()
    if (selected.value) {
      const fresh = tickets.value.find((t) => t.id === selected.value!.id)
      if (fresh) selected.value = fresh
    }
  })
  evtSource.onerror = () => { evtSource?.close(); setTimeout(connectSSE, 5000) }
}

let pollInterval: ReturnType<typeof setInterval>

onMounted(() => {
  void loadTickets()
  pollInterval = setInterval(loadTickets, 30_000)
  connectSSE()
})

onUnmounted(() => {
  clearInterval(pollInterval)
  evtSource?.close()
})
</script>

<style scoped>
.tickets-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.layout { display: flex; flex: 1; overflow: hidden; }

/* ── List panel ─────────────────────────────────────────────────────────── */
.list-panel {
  width: 55%;
  border-right: 1px solid var(--border, #30363d);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  background: var(--surface, #161b22);
  border-bottom: 1px solid var(--border, #30363d);
  flex-wrap: wrap;
}

.search-input, .filter-select {
  background: var(--surface2, #21262d);
  border: 1px solid var(--border, #30363d);
  color: var(--text, #e6edf3);
  padding: 4px 7px;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.search-input { flex: 1; min-width: 100px; }
.search-input:focus, .filter-select:focus { border-color: var(--accent, #58a6ff); }

.btn-new {
  background: var(--accent, #58a6ff);
  border: none;
  color: #000;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  font-weight: 700;
  white-space: nowrap;
}
.btn-new:hover { opacity: 0.85; }

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  font-size: 11px;
  color: var(--text-muted, #8b949e);
  border-bottom: 1px solid var(--border, #30363d);
  background: var(--surface, #161b22);
}
.btn-refresh {
  background: none; border: none;
  color: var(--text-muted, #8b949e);
  cursor: pointer; font-size: 15px; padding: 0 4px;
}
.btn-refresh:hover { color: var(--text, #e6edf3); }

.ticket-list { list-style: none; overflow-y: auto; flex: 1; }

.ticket-item {
  padding: 9px 12px;
  border-bottom: 1px solid var(--border, #30363d);
  cursor: pointer;
  transition: background 0.1s;
}
.ticket-item:hover { background: var(--surface, #161b22); }
.ticket-item.active {
  background: #1f3a5e;
  border-left: 3px solid var(--accent, #58a6ff);
}

.ti-header { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
.ti-id { font-size: 11px; color: var(--accent, #58a6ff); font-weight: 600; }
.ti-title { font-size: 13px; color: var(--text, #e6edf3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ti-meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted, #8b949e); margin-top: 3px; }

/* ── New ticket form ──────────────────────────────────────────────────────── */
.new-ticket-form {
  padding: 8px 10px;
  border-top: 1px solid var(--border, #30363d);
  background: var(--surface, #161b22);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.new-ticket-input {
  background: var(--surface2, #21262d);
  border: 1px solid var(--accent, #58a6ff);
  color: var(--text, #e6edf3);
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.new-ticket-meta { display: flex; gap: 6px; }
.new-ticket-actions { display: flex; gap: 6px; }
.btn-create {
  background: var(--accent, #58a6ff); border: none; color: #000;
  padding: 4px 12px; border-radius: 4px; cursor: pointer;
  font-size: 12px; font-family: inherit; font-weight: 600;
}
.btn-create:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-cancel {
  background: var(--surface2, #21262d);
  border: 1px solid var(--border, #30363d);
  color: var(--text-muted, #8b949e);
  padding: 4px 10px; border-radius: 4px; cursor: pointer;
  font-size: 12px; font-family: inherit;
}

/* ── Detail panel ─────────────────────────────────────────────────────────── */
.detail-panel { flex: 1; overflow-y: auto; padding: 16px 20px; }

.detail-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 200px; color: var(--text-muted, #8b949e);
  gap: 10px; font-size: 13px;
}

.detail-header {
  display: flex; align-items: center;
  gap: 8px; margin-bottom: 6px; flex-wrap: wrap;
}
.detail-id { font-size: 13px; color: var(--accent, #58a6ff); font-weight: 700; }
.detail-actions { margin-left: auto; }

.detail-title { font-size: 17px; color: var(--text, #e6edf3); margin-bottom: 8px; line-height: 1.4; }
.detail-meta {
  display: flex; gap: 14px;
  font-size: 11px; color: var(--text-muted, #8b949e);
  margin-bottom: 14px; flex-wrap: wrap;
}
.detail-section { margin-bottom: 18px; }
.section-label {
  font-size: 10px; letter-spacing: 2px;
  text-transform: uppercase; color: var(--text-muted, #8b949e);
  margin-bottom: 6px;
}

/* ── Pipeline strip ─────────────────────────────────────────────────────── */
.pipeline-strip {
  display: flex; align-items: center;
  gap: 0; font-size: 10px; margin-bottom: 16px;
  overflow-x: auto; flex-wrap: nowrap;
  padding: 6px 0;
}
.pipe-step { white-space: nowrap; padding: 2px 6px; border-radius: 3px; }
.pipe-arrow { color: var(--text-muted, #8b949e); margin: 0 2px; }
.pipe-done { color: var(--accent2, #3fb950); opacity: 0.6; }
.pipe-current { color: var(--accent, #58a6ff); font-weight: 700; background: rgba(88,166,255,0.1); }
.pipe-future { color: var(--text-muted, #8b949e); opacity: 0.4; }

/* ── Markdown ─────────────────────────────────────────────────────────────── */
.markdown-body { font-size: 13px; color: var(--text, #e6edf3); line-height: 1.6; }
:deep(.markdown-body) h1, :deep(.markdown-body) h2, :deep(.markdown-body) h3 { color: var(--text, #e6edf3); margin: 10px 0 5px; }
:deep(.markdown-body) p { margin-bottom: 7px; }
:deep(.markdown-body) code { background: var(--surface2, #21262d); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
:deep(.markdown-body) pre { background: var(--surface2, #21262d); padding: 10px; border-radius: 4px; overflow-x: auto; margin-bottom: 7px; }
:deep(.markdown-body) ul, :deep(.markdown-body) ol { margin-left: 18px; margin-bottom: 7px; }
:deep(.markdown-body) li { margin-bottom: 2px; }

/* ── Comments ─────────────────────────────────────────────────────────────── */
.no-comments { color: var(--text-muted, #8b949e); font-size: 12px; }
.comment {
  background: var(--surface, #161b22);
  border: 1px solid var(--border, #30363d);
  border-radius: 5px; padding: 9px 11px; margin-bottom: 7px;
}
.comment-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
.comment-author { font-size: 12px; color: var(--accent, #58a6ff); font-weight: 600; }
.comment-time { font-size: 11px; color: var(--text-muted, #8b949e); }
.comment-body { font-size: 12px; color: var(--text, #e6edf3); white-space: pre-wrap; }

.comment-form { margin-top: 14px; }
.comment-textarea {
  width: 100%;
  background: var(--surface2, #21262d);
  border: 1px solid var(--border, #30363d);
  color: var(--text, #e6edf3);
  padding: 7px; border-radius: 4px;
  font-family: inherit; font-size: 12px;
  resize: vertical; outline: none;
}
.comment-textarea:focus { border-color: var(--accent, #58a6ff); }
.btn-comment {
  margin-top: 5px;
  background: var(--surface2, #21262d);
  border: 1px solid var(--border, #30363d);
  color: var(--text, #e6edf3);
  padding: 4px 11px; border-radius: 4px;
  cursor: pointer; font-size: 12px; font-family: inherit;
}
.btn-comment:hover { background: var(--border, #30363d); }
.btn-comment:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Badges ─────────────────────────────────────────────────────────────── */
.badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.badge-idea { background: rgba(188,140,255,0.15); color: #bc8cff; }
.badge-approved { background: rgba(88,166,255,0.15); color: #58a6ff; }
.badge-spec_ready { background: rgba(88,200,255,0.15); color: #58c8ff; }
.badge-in_progress { background: rgba(63,185,80,0.15); color: #3fb950; }
.badge-review { background: rgba(210,153,34,0.15); color: #d29922; }
.badge-done { background: rgba(63,185,80,0.1); color: #3fb950; }
.badge-verified { background: rgba(63,185,80,0.2); color: #4fd66a; font-weight: 700; }
.badge-rejected { background: rgba(248,81,73,0.15); color: #f85149; }
.badge-pending_input { background: rgba(210,100,34,0.15); color: #e08030; }
.badge-pri-CRITICAL { background: rgba(248,81,73,0.15); color: #f85149; }
.badge-pri-HIGH { background: rgba(240,136,62,0.15); color: #f0883e; }
.badge-pri-MED { background: rgba(88,166,255,0.12); color: #58a6ff; }
.badge-pri-LOW { background: rgba(139,148,158,0.1); color: #8b949e; }
</style>
