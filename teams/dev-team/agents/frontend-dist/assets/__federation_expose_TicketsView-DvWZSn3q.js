import { importShared } from './__federation_fn_import-DZZsZxnh.js';

const {defineComponent:_defineComponent} = await importShared('vue');

const {vModelText:_vModelText,createElementVNode:_createElementVNode,withDirectives:_withDirectives,vModelSelect:_vModelSelect,toDisplayString:_toDisplayString,renderList:_renderList,Fragment:_Fragment,openBlock:_openBlock,createElementBlock:_createElementBlock,normalizeClass:_normalizeClass,createCommentVNode:_createCommentVNode,withKeys:_withKeys,createTextVNode:_createTextVNode,createStaticVNode:_createStaticVNode} = await importShared('vue');

const _hoisted_1 = { class: "tickets-root" };
const _hoisted_2 = { class: "layout" };
const _hoisted_3 = { class: "list-panel" };
const _hoisted_4 = { class: "toolbar" };
const _hoisted_5 = { class: "list-header" };
const _hoisted_6 = { class: "ticket-list" };
const _hoisted_7 = ["onClick"];
const _hoisted_8 = { class: "ti-header" };
const _hoisted_9 = { class: "ti-id" };
const _hoisted_10 = { class: "ti-title" };
const _hoisted_11 = { class: "ti-meta" };
const _hoisted_12 = { key: 0 };
const _hoisted_13 = {
  key: 1,
  class: "ti-date"
};
const _hoisted_14 = {
  key: 0,
  class: "new-ticket-form"
};
const _hoisted_15 = { class: "new-ticket-meta" };
const _hoisted_16 = { class: "new-ticket-actions" };
const _hoisted_17 = ["disabled"];
const _hoisted_18 = { class: "detail-panel" };
const _hoisted_19 = {
  key: 0,
  class: "detail-empty"
};
const _hoisted_20 = {
  key: 1,
  class: "detail-content"
};
const _hoisted_21 = { class: "detail-header" };
const _hoisted_22 = { class: "detail-id" };
const _hoisted_23 = { class: "detail-badges" };
const _hoisted_24 = { class: "detail-actions" };
const _hoisted_25 = ["value"];
const _hoisted_26 = { class: "detail-title" };
const _hoisted_27 = { class: "detail-meta" };
const _hoisted_28 = { key: 0 };
const _hoisted_29 = { key: 1 };
const _hoisted_30 = { key: 2 };
const _hoisted_31 = { key: 3 };
const _hoisted_32 = {
  key: 0,
  class: "detail-section"
};
const _hoisted_33 = ["innerHTML"];
const _hoisted_34 = { class: "pipeline-strip" };
const _hoisted_35 = {
  key: 0,
  class: "pipe-arrow"
};
const _hoisted_36 = { class: "detail-section" };
const _hoisted_37 = { class: "section-label" };
const _hoisted_38 = { class: "comment-header" };
const _hoisted_39 = { class: "comment-author" };
const _hoisted_40 = { class: "comment-time" };
const _hoisted_41 = { class: "comment-body" };
const _hoisted_42 = {
  key: 0,
  class: "no-comments"
};
const _hoisted_43 = { class: "comment-form" };
const _hoisted_44 = ["disabled"];
const {ref,computed,onMounted,onUnmounted,nextTick,watch} = await importShared('vue');

const {marked} = await importShared('marked');

const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "TicketsView",
  setup(__props) {
    const allStatuses = ["idea", "approved", "spec_ready", "in_progress", "review", "done", "verified", "rejected", "pending_input"];
    const pipelineStatuses = ["idea", "approved", "spec_ready", "in_progress", "review", "done", "verified"];
    const tickets = ref([]);
    const selected = ref(null);
    const selectedId = ref(null);
    const comments = ref([]);
    const newComment = ref("");
    const search = ref("");
    const filterStatus = ref("");
    const filterPriority = ref("");
    const editStatus = ref("");
    const showNewForm = ref(false);
    const newTitle = ref("");
    const newPriority = ref("MED");
    const newType = ref("task");
    const newTitleRef = ref(null);
    const urlQ = new URLSearchParams(window.location.search).get("q");
    if (urlQ) search.value = urlQ;
    const filteredTickets = computed(() => {
      let list = tickets.value;
      if (filterStatus.value) list = list.filter((t) => t.status === filterStatus.value);
      if (filterPriority.value) list = list.filter((t) => t.priority === filterPriority.value);
      if (search.value) {
        const q = search.value.toLowerCase();
        list = list.filter(
          (t) => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || (t.assigned_to?.toLowerCase().includes(q) ?? false)
        );
      }
      return list;
    });
    watch(selected, (t) => {
      editStatus.value = t?.status ?? "";
    });
    function relTime(dateStr) {
      if (!dateStr) return "";
      const now = Date.now();
      const then = new Date(dateStr).getTime();
      const diff = now - then;
      const s = Math.floor(diff / 1e3);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    }
    function renderMarkdown(md) {
      try {
        return marked.parse(md);
      } catch {
        return md;
      }
    }
    function getPipelineClass(step, current) {
      const idx = pipelineStatuses.indexOf(step);
      const cur = pipelineStatuses.indexOf(current);
      if (step === current) return "pipe-current";
      if (idx < cur) return "pipe-done";
      return "pipe-future";
    }
    async function loadTickets() {
      try {
        const res = await fetch("/api/tickets");
        tickets.value = await res.json();
        if (urlQ && !selected.value) {
          const found = tickets.value.find((t) => t.id.toLowerCase() === urlQ.toLowerCase());
          if (found) void selectTicket(found);
        }
      } catch (e) {
        console.error("loadTickets", e);
      }
    }
    async function selectTicket(t) {
      selected.value = t;
      selectedId.value = t.id;
      editStatus.value = t.status;
      await loadComments(t.id);
    }
    async function loadComments(ticketId) {
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/comments`);
        comments.value = res.ok ? await res.json() : [];
      } catch {
        comments.value = [];
      }
    }
    async function addComment() {
      if (!selected.value || !newComment.value.trim()) return;
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(selected.value.id)}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: newComment.value.trim() })
        });
        if (res.ok) {
          newComment.value = "";
          await loadComments(selected.value.id);
        }
      } catch (e) {
        console.error("addComment", e);
      }
    }
    async function createTicket() {
      if (!newTitle.value.trim()) return;
      try {
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle.value.trim(), priority: newPriority.value, type: newType.value, status: "idea" })
        });
        if (res.ok) {
          const ticket = await res.json();
          newTitle.value = "";
          showNewForm.value = false;
          await loadTickets();
          void selectTicket(ticket);
        }
      } catch (e) {
        console.error("createTicket", e);
      }
    }
    async function updateStatus() {
      if (!selected.value || editStatus.value === selected.value.status) return;
      try {
        const res = await fetch(`/api/tickets/${encodeURIComponent(selected.value.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: editStatus.value, changed_by: "dashboard" })
        });
        if (res.ok) {
          const updated = await res.json();
          selected.value = updated;
          await loadTickets();
        }
      } catch (e) {
        console.error("updateStatus", e);
      }
    }
    watch(showNewForm, async (v) => {
      if (v) {
        await nextTick();
        newTitleRef.value?.focus();
      }
    });
    let evtSource = null;
    function connectSSE() {
      evtSource = new EventSource("/api/events");
      evtSource.addEventListener("ticket:created", () => {
        void loadTickets();
      });
      evtSource.addEventListener("ticket:updated", async () => {
        await loadTickets();
        if (selected.value) {
          const fresh = tickets.value.find((t) => t.id === selected.value.id);
          if (fresh) selected.value = fresh;
        }
      });
      evtSource.onerror = () => {
        evtSource?.close();
        setTimeout(connectSSE, 5e3);
      };
    }
    let pollInterval;
    onMounted(() => {
      void loadTickets();
      pollInterval = setInterval(loadTickets, 3e4);
      connectSSE();
    });
    onUnmounted(() => {
      clearInterval(pollInterval);
      evtSource?.close();
    });
    return (_ctx, _cache) => {
      return _openBlock(), _createElementBlock("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createElementVNode("div", _hoisted_3, [
            _createElementVNode("div", _hoisted_4, [
              _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => search.value = $event),
                class: "search-input",
                placeholder: "🔍 Hledat...",
                autocomplete: "off"
              }, null, 512), [
                [_vModelText, search.value]
              ]),
              _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => filterStatus.value = $event),
                class: "filter-select"
              }, [..._cache[10] || (_cache[10] = [
                _createStaticVNode('<option value="" data-v-9dffffd4>Vše (status)</option><option value="idea" data-v-9dffffd4>idea</option><option value="approved" data-v-9dffffd4>approved</option><option value="spec_ready" data-v-9dffffd4>spec_ready</option><option value="in_progress" data-v-9dffffd4>in_progress</option><option value="review" data-v-9dffffd4>review</option><option value="done" data-v-9dffffd4>done</option><option value="verified" data-v-9dffffd4>verified</option><option value="rejected" data-v-9dffffd4>rejected</option><option value="pending_input" data-v-9dffffd4>pending_input</option>', 10)
              ])], 512), [
                [_vModelSelect, filterStatus.value]
              ]),
              _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => filterPriority.value = $event),
                class: "filter-select"
              }, [..._cache[11] || (_cache[11] = [
                _createStaticVNode('<option value="" data-v-9dffffd4>Vše (priorita)</option><option value="CRITICAL" data-v-9dffffd4>CRITICAL</option><option value="HIGH" data-v-9dffffd4>HIGH</option><option value="MED" data-v-9dffffd4>MED</option><option value="LOW" data-v-9dffffd4>LOW</option>', 5)
              ])], 512), [
                [_vModelSelect, filterPriority.value]
              ]),
              _createElementVNode("button", {
                class: "btn-new",
                onClick: _cache[3] || (_cache[3] = ($event) => showNewForm.value = !showNewForm.value)
              }, "+ Nový")
            ]),
            _createElementVNode("div", _hoisted_5, [
              _createElementVNode("span", null, _toDisplayString(filteredTickets.value.length) + " ticketů", 1),
              _createElementVNode("button", {
                class: "btn-refresh",
                onClick: loadTickets
              }, "↻")
            ]),
            _createElementVNode("ul", _hoisted_6, [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(filteredTickets.value, (t) => {
                return _openBlock(), _createElementBlock("li", {
                  key: t.id,
                  class: _normalizeClass(["ticket-item", selectedId.value === t.id ? "active" : ""]),
                  onClick: ($event) => selectTicket(t)
                }, [
                  _createElementVNode("div", _hoisted_8, [
                    _createElementVNode("span", _hoisted_9, _toDisplayString(t.id), 1),
                    _createElementVNode("span", {
                      class: _normalizeClass(`badge badge-${t.status}`)
                    }, _toDisplayString(t.status), 3),
                    t.priority ? (_openBlock(), _createElementBlock("span", {
                      key: 0,
                      class: _normalizeClass(`badge badge-pri-${t.priority}`)
                    }, _toDisplayString(t.priority), 3)) : _createCommentVNode("", true)
                  ]),
                  _createElementVNode("div", _hoisted_10, _toDisplayString(t.title), 1),
                  _createElementVNode("div", _hoisted_11, [
                    t.assigned_to ? (_openBlock(), _createElementBlock("span", _hoisted_12, _toDisplayString(t.assigned_to), 1)) : _createCommentVNode("", true),
                    t.updated_at ? (_openBlock(), _createElementBlock("span", _hoisted_13, _toDisplayString(relTime(t.updated_at)), 1)) : _createCommentVNode("", true)
                  ])
                ], 10, _hoisted_7);
              }), 128))
            ]),
            showNewForm.value ? (_openBlock(), _createElementBlock("div", _hoisted_14, [
              _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => newTitle.value = $event),
                class: "new-ticket-input",
                placeholder: "Název ticketu...",
                onKeyup: _withKeys(createTicket, ["enter"]),
                ref_key: "newTitleRef",
                ref: newTitleRef,
                autofocus: ""
              }, null, 544), [
                [_vModelText, newTitle.value]
              ]),
              _createElementVNode("div", _hoisted_15, [
                _withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => newPriority.value = $event),
                  class: "filter-select"
                }, [..._cache[12] || (_cache[12] = [
                  _createElementVNode("option", { value: "MED" }, "MED", -1),
                  _createElementVNode("option", { value: "HIGH" }, "HIGH", -1),
                  _createElementVNode("option", { value: "CRITICAL" }, "CRITICAL", -1),
                  _createElementVNode("option", { value: "LOW" }, "LOW", -1)
                ])], 512), [
                  [_vModelSelect, newPriority.value]
                ]),
                _withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => newType.value = $event),
                  class: "filter-select"
                }, [..._cache[13] || (_cache[13] = [
                  _createStaticVNode('<option value="task" data-v-9dffffd4>task</option><option value="story" data-v-9dffffd4>story</option><option value="bug" data-v-9dffffd4>bug</option><option value="epic" data-v-9dffffd4>epic</option><option value="idea" data-v-9dffffd4>idea</option>', 5)
                ])], 512), [
                  [_vModelSelect, newType.value]
                ])
              ]),
              _createElementVNode("div", _hoisted_16, [
                _createElementVNode("button", {
                  class: "btn-create",
                  disabled: !newTitle.value.trim(),
                  onClick: createTicket
                }, "Vytvořit", 8, _hoisted_17),
                _createElementVNode("button", {
                  class: "btn-cancel",
                  onClick: _cache[7] || (_cache[7] = ($event) => showNewForm.value = false)
                }, "Zrušit")
              ])
            ])) : _createCommentVNode("", true)
          ]),
          _createElementVNode("div", _hoisted_18, [
            !selected.value ? (_openBlock(), _createElementBlock("div", _hoisted_19, [..._cache[14] || (_cache[14] = [
              _createElementVNode("div", { style: { "font-size": "40px", "opacity": "0.2" } }, "📋", -1),
              _createElementVNode("div", null, "Vyberte ticket ze seznamu", -1)
            ])])) : (_openBlock(), _createElementBlock("div", _hoisted_20, [
              _createElementVNode("div", _hoisted_21, [
                _createElementVNode("div", _hoisted_22, _toDisplayString(selected.value.id), 1),
                _createElementVNode("div", _hoisted_23, [
                  _createElementVNode("span", {
                    class: _normalizeClass(`badge badge-${selected.value.status}`)
                  }, _toDisplayString(selected.value.status), 3),
                  selected.value.priority ? (_openBlock(), _createElementBlock("span", {
                    key: 0,
                    class: _normalizeClass(`badge badge-pri-${selected.value.priority}`)
                  }, _toDisplayString(selected.value.priority), 3)) : _createCommentVNode("", true)
                ]),
                _createElementVNode("div", _hoisted_24, [
                  _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => editStatus.value = $event),
                    class: "filter-select",
                    onChange: updateStatus,
                    title: "Změnit status"
                  }, [
                    (_openBlock(), _createElementBlock(_Fragment, null, _renderList(allStatuses, (s) => {
                      return _createElementVNode("option", {
                        key: s,
                        value: s
                      }, _toDisplayString(s), 9, _hoisted_25);
                    }), 64))
                  ], 544), [
                    [_vModelSelect, editStatus.value]
                  ])
                ])
              ]),
              _createElementVNode("h2", _hoisted_26, _toDisplayString(selected.value.title), 1),
              _createElementVNode("div", _hoisted_27, [
                selected.value.assigned_to ? (_openBlock(), _createElementBlock("span", _hoisted_28, "👤 " + _toDisplayString(selected.value.assigned_to), 1)) : _createCommentVNode("", true),
                selected.value.type ? (_openBlock(), _createElementBlock("span", _hoisted_29, "🏷 " + _toDisplayString(selected.value.type), 1)) : _createCommentVNode("", true),
                selected.value.created_at ? (_openBlock(), _createElementBlock("span", _hoisted_30, "📅 " + _toDisplayString(relTime(selected.value.created_at)), 1)) : _createCommentVNode("", true),
                selected.value.updated_at ? (_openBlock(), _createElementBlock("span", _hoisted_31, "🔄 " + _toDisplayString(relTime(selected.value.updated_at)), 1)) : _createCommentVNode("", true)
              ]),
              selected.value.body ? (_openBlock(), _createElementBlock("div", _hoisted_32, [
                _cache[15] || (_cache[15] = _createElementVNode("div", { class: "section-label" }, "POPIS / SPEC", -1)),
                _createElementVNode("div", {
                  class: "markdown-body",
                  innerHTML: renderMarkdown(selected.value.body)
                }, null, 8, _hoisted_33)
              ])) : _createCommentVNode("", true),
              _createElementVNode("div", _hoisted_34, [
                (_openBlock(), _createElementBlock(_Fragment, null, _renderList(pipelineStatuses, (s, i) => {
                  return _createElementVNode("span", {
                    key: s,
                    class: _normalizeClass(["pipe-step", getPipelineClass(s, selected.value.status)])
                  }, [
                    i > 0 ? (_openBlock(), _createElementBlock("span", _hoisted_35, "→")) : _createCommentVNode("", true),
                    _createTextVNode(" " + _toDisplayString(s), 1)
                  ], 2);
                }), 64))
              ]),
              _createElementVNode("div", _hoisted_36, [
                _createElementVNode("div", _hoisted_37, "KOMENTÁŘE (" + _toDisplayString(comments.value.length) + ")", 1),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(comments.value, (c) => {
                  return _openBlock(), _createElementBlock("div", {
                    key: c.id,
                    class: "comment"
                  }, [
                    _createElementVNode("div", _hoisted_38, [
                      _createElementVNode("span", _hoisted_39, _toDisplayString(c.author || "Agent"), 1),
                      _createElementVNode("span", _hoisted_40, _toDisplayString(relTime(c.created_at)), 1)
                    ]),
                    _createElementVNode("div", _hoisted_41, _toDisplayString(c.body), 1)
                  ]);
                }), 128)),
                comments.value.length === 0 ? (_openBlock(), _createElementBlock("div", _hoisted_42, "Žádné komentáře")) : _createCommentVNode("", true)
              ]),
              _createElementVNode("div", _hoisted_43, [
                _withDirectives(_createElementVNode("textarea", {
                  "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => newComment.value = $event),
                  placeholder: "Přidat komentář...",
                  class: "comment-textarea",
                  rows: "3"
                }, null, 512), [
                  [_vModelText, newComment.value]
                ]),
                _createElementVNode("button", {
                  class: "btn-comment",
                  disabled: !newComment.value.trim(),
                  onClick: addComment
                }, "Přidat komentář", 8, _hoisted_44)
              ])
            ]))
          ])
        ])
      ]);
    };
  }
});

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

const TicketsView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9dffffd4"]]);

export { TicketsView as default };
