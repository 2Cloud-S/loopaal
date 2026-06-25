const $ = selector => document.querySelector(selector);
const api = async (path, options = {}) => { const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Request failed"); return data; };
const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
let state;

function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(el.timer); el.timer = setTimeout(() => el.classList.remove("show"), 4500); }
function empty(message) { return `<p class="empty">${esc(message)}</p>`; }
function row(title, detail, tail = "", actions = "") { return `<div class="row"><div class="row-line"><strong>${esc(title)}</strong>${tail}</div><small>${esc(detail)}</small>${actions ? `<div class="row-actions">${actions}</div>` : ""}</div>`; }

function render() {
  const pending = state.approvals.filter(x => x.status === "pending").length;
  $("#metrics").innerHTML = [[state.campaigns.length, "campaigns"], [state.prospects.length, "prospects"], [pending, "awaiting approval"], [state.memories.length, "memory items"]].map(([n, label]) => `<div class="metric"><b>${n}</b><span>${label}</span></div>`).join("");
  $("#campaigns").innerHTML = state.campaigns.length ? state.campaigns.map(c => row(c.name, `${c.criteria.businessNames.length} named businesses · ${c.criteria.countries.join(", ") || "any country"}`, `<span class="status">${esc(c.status)}</span>`, c.status === "draft" ? `<button class="btn" data-run="${c.id}">Run research</button>` : "")).join("") : empty("No campaigns yet. Create one with a list of business names.");
  $("#prospects").innerHTML = state.prospects.length ? state.prospects.map(p => row(p.businessName, `${p.contactName || "contact unverified"} · ${Math.round(p.confidence * 100)}% confidence`, `<span class="status">${p.sources.length} sources</span>`, `<button class="btn" data-draft="${p.id}" data-channel="gmail">Draft email</button><button class="btn" data-draft="${p.id}" data-channel="whatsapp">Draft WhatsApp</button>`)).join("") : empty("Prospects appear after a research run.");
  $("#approvals").innerHTML = state.approvals.length ? state.approvals.slice(0, 8).map(a => row(a.title, String(a.payload.subject || a.payload.body || "Review payload"), `<span class="status">${a.status}</span>`, a.status === "pending" ? `<button class="btn" data-approve="${a.id}">Approve</button><button class="btn" data-reject="${a.id}">Reject</button>` : "")).join("") : empty("No actions are waiting.");
  $("#activity").innerHTML = state.audit.length ? state.audit.slice(0, 12).map(a => row(a.action, a.detail, `<time>${new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>`)).join("") : empty("Activity will be recorded here.");
  const live = Object.entries(state.integrations).filter(([, value]) => value).map(([key]) => key);
  $("#mode-label").textContent = live.length ? `${live.length} live` : "demo mode"; $(".signal").classList.toggle("live", live.length > 0);
  $("#integration-line").textContent = live.length ? `live · ${live.join(" · ")}` : "demo adapters · no external writes";
}

async function refresh() { state = await api("/api/state"); render(); }
function openCampaign() { $("#campaign-dialog").showModal(); $("#campaign-dialog input").focus(); }
document.addEventListener("click", async event => {
  const el = event.target.closest("button"); if (!el) return;
  try {
    if (el.dataset.action === "new-campaign") openCampaign();
    if (el.dataset.close !== undefined) el.closest("dialog").close();
    if (el.id === "refresh" || el.dataset.command === "refresh") { $("#cmdk").close(); await refresh(); }
    if (el.dataset.command === "new-campaign") { $("#cmdk").close(); openCampaign(); }
    if (el.dataset.run) { el.disabled = true; el.textContent = "Researching"; await api(`/api/campaigns/${el.dataset.run}/run`, { method: "POST" }); await refresh(); toast("Research run completed."); }
    if (el.dataset.draft) { await api("/api/drafts", { method: "POST", body: JSON.stringify({ prospectId: el.dataset.draft, channel: el.dataset.channel }) }); await refresh(); toast("Draft added to approvals."); }
    if (el.dataset.approve || el.dataset.reject) { const id = el.dataset.approve || el.dataset.reject; const action = el.dataset.approve ? "approve" : "reject"; await api(`/api/approvals/${id}/${action}`, { method: "POST", body: "{}" }); await refresh(); }
  } catch (error) { toast(error.message); }
});
$("#campaign-form").addEventListener("submit", async event => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const data = Object.fromEntries(form); try { await api("/api/campaigns", { method: "POST", body: JSON.stringify(data) }); formElement.reset(); $("#campaign-status").textContent = ""; $("#campaign-dialog").close(); await refresh(); } catch (error) { $("#campaign-status").textContent = error.message; } });
function openCmdk() { $("#cmdk").showModal(); $("#cmdk-input").focus(); }
$("#search-open").addEventListener("click", openCmdk);
$("#cmdk-input").addEventListener("input", event => { const query = event.target.value.toLowerCase(); document.querySelectorAll("[data-command]").forEach(button => { button.hidden = !button.textContent.toLowerCase().includes(query); }); });
$("#cmdk-input").addEventListener("keydown", event => { if (!["ArrowDown", "ArrowUp"].includes(event.key)) return; event.preventDefault(); const commands = [...document.querySelectorAll("[data-command]:not([hidden])")]; const target = event.key === "ArrowDown" ? commands[0] : commands.at(-1); target?.focus({ preventScroll: true }); });
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (!$("#cmdk").open) openCmdk(); }
  if (event.key === "Escape") document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
});
refresh().catch(error => toast(error.message));
