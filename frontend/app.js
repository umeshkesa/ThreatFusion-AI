/* ========================================
   ThreatFusion AI — Application Logic
   ======================================== */

const API_BASE =
  ["3000", "3001", "3002", "3003"].includes(window.location.port)
    ? "http://127.0.0.1:5000"
    : window.location.origin;
// COMPANY_ID is now dynamic from state.companyId

// ==================== API SERVICE ====================

const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  async delete(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  healthCheck() { return this.get("/api/health"); },
  fetchFeeds() { return this.get("/fetch-feeds"); },
  getAlerts() { return this.get(`/alerts/${state.companyId}`); },
  runAlerts() { return this.get(`/run-alerts/${state.companyId}`); },
  seedAssets() { return this.get(`/seed-assets/${state.companyId}`); },
  getAssets() { return this.get(`/api/assets/${state.companyId}`); },
  addAsset(data) { return this.post("/api/assets/add", data); },
  deleteAsset(id) { return this.delete(`/api/assets/delete/${id}`); },
  deleteSoftware(assetId, softwareId) { return this.delete(`/api/assets/${assetId}/software/${softwareId}`); },
  getFeeds() { return this.get("/api/feeds"); },
  
  // Auth
  login(name, password) { return this.post("/api/auth/login", { name, password }); },
  register(name, password) { return this.post("/api/auth/register", { name, password }); }
};

// ==================== STATE ====================

let state = {
  currentPage: "dashboard",
  alerts: [],
  assets: [],
  feeds: [],
  companyId: localStorage.getItem("company_id"),
  companyName: localStorage.getItem("company_name"),
  isRegistering: false
};

// ==================== ROUTER ====================

function initRouter() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  state.currentPage = page;

  // Update active nav
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add("active");

  // Update title
  const titles = {
    dashboard: ["Dashboard", "Threat intelligence overview"],
    alerts: ["Alerts", "High & critical threat alerts"],
    assets: ["Assets", "Manage your organization's IT assets"],
    feeds: ["Feeds", "Ingested threat intelligence data"],
    controls: ["Controls", "Feed ingestion & alert controls"]
  };

  const [title, subtitle] = titles[page] || ["", ""];
  document.getElementById("page-title").textContent = title;
  document.getElementById("page-subtitle").textContent = subtitle;

  // Render page
  renderPage(page);
}

function renderPage(page) {
  const container = document.getElementById("page-container");
  container.style.animation = "none";
  container.offsetHeight; // force reflow
  container.style.animation = "fade-in 0.3s ease";

  switch (page) {
    case "dashboard": renderDashboard(container); break;
    case "alerts": renderAlerts(container); break;
    case "assets": renderAssets(container); break;
    case "feeds": renderFeeds(container); break;
    case "controls": renderControls(container); break;
  }
}

// ==================== FEEDS PAGE ====================

async function renderFeeds(container) {
  container.innerHTML = `
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📡 Threat Intelligence History</span>
        <button class="btn btn-secondary" id="btn-refresh-feeds">Refresh Feeds</button>
      </div>
      <div class="section-body" id="feeds-table-body">
        <div class="empty-state"><p>Loading feeds...</p></div>
      </div>
    </div>
  `;

  document.getElementById("btn-refresh-feeds").addEventListener("click", () => renderFeeds(container));

  try {
    const feeds = await api.getFeeds();
    const body = document.getElementById("feeds-table-body");

    if (feeds.length === 0) {
      body.innerHTML = `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
        <h3>No intelligence feeds found</h3>
        <p>Go to Controls to start ingestion</p>
      </div>`;
      return;
    }

    body.innerHTML = `
      <div class="feeds-list">
        ${feeds.map((f, i) => `
          <div class="section-card feed-item" style="margin-bottom: 12px; border-left: 4px solid var(--accent-blue);">
            <div class="feed-summary" style="padding: 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="toggleFeedDetails('${i}')">
              <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                <span class="badge" style="background:var(--accent-blue-dim); color:var(--accent-blue); padding: 4px 12px;">${escapeHtml(f.source || "RSS")}</span>
                <div style="flex: 1;">
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(f.title)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px;">Published: ${new Date(f.publishedAt || f.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                ${(f.extracted?.cveIds || []).length > 0 ? `<span class="badge badge-critical">${f.extracted.cveIds.length} CVEs</span>` : ''}
                <svg id="icon-${i}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.3s;"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            
            <div id="details-${i}" class="feed-details" style="display: none; padding: 0 20px 20px 20px; border-top: 1px solid var(--border-subtle); background: rgba(0,0,0,0.05);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-top: 20px;">
                
                <div>
                  <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-cyan); margin-bottom: 12px; letter-spacing: 0.05em;">Intelligence Content</h4>
                  <p style="font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary); margin-bottom: 15px;">${escapeHtml(f.content || "No content summary available.")}</p>
                  <a href="${f.url}" target="_blank" class="btn btn-secondary" style="font-size: 0.75rem;">View Original Source ↗</a>
                </div>

                <div>
                  <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-purple); margin-bottom: 12px; letter-spacing: 0.05em;">AI Extraction Results</h4>
                  <div style="background: var(--bg-primary); padding: 15px; border-radius: 8px; border: 1px solid var(--border-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.82rem;">
                    <div style="margin-bottom: 8px;"><span style="color: var(--text-muted);">Products:</span> ${f.extracted?.products?.length ? f.extracted.products.map(p => `<span style="color:var(--accent-purple);">${escapeHtml(p)}</span>`).join(", ") : "None Detected"}</div>
                    <div style="margin-bottom: 8px;"><span style="color: var(--text-muted);">Versions:</span> ${f.extracted?.version ? `<span style="color:var(--accent-cyan);">${f.extracted.operator || ''} ${f.extracted.version}</span>` : "Any"}</div>
                    ${f.extracted?.versionRange ? `
                      <div style="margin-bottom: 8px; font-size: 0.75rem; padding-left: 10px; border-left: 2px solid var(--border-primary);">
                        Range: ${f.extracted.versionRange.min_operator || ''} ${f.extracted.versionRange.min_version || '0'} 
                        AND ${f.extracted.versionRange.max_operator || ''} ${f.extracted.versionRange.max_version || '∞'}
                      </div>
                    ` : ''}
                    <div style="margin-bottom: 8px;"><span style="color: var(--text-muted);">CVEs:</span> ${f.extracted?.cveIds?.length ? f.extracted.cveIds.map(c => `<span style="color:var(--accent-red);">${escapeHtml(c)}</span>`).join(", ") : "None"}</div>
                    <div><span style="color: var(--text-muted);">Keywords:</span> ${f.extracted?.keywords?.join(", ") || "None"}</div>
                  </div>
                </div>

              </div>
              
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed var(--border-subtle); font-size: 0.7rem; color: var(--text-muted);">
                Internal ID: ${f._id} | Processed: ${f.processed} | DB Ingested: ${new Date(f.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    // 🔥 Auto-expand deep-linked feed
    if (state.autoExpandFeedId) {
      const idx = feeds.findIndex(f => String(f._id) === String(state.autoExpandFeedId));
      if (idx !== -1) {
        setTimeout(() => {
          toggleFeedDetails(idx.toString());
          const el = document.getElementById(`details-${idx}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      state.autoExpandFeedId = null; // reset
    }

  } catch (err) {
    document.getElementById("feeds-table-body").innerHTML = 
      `<div class="empty-state"><h3>Failed to load feeds</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

// Global toggle for feed details
window.toggleFeedDetails = (index) => {
  const details = document.getElementById(`details-${index}`);
  const icon = document.getElementById(`icon-${index}`);
  if (details.style.display === "none") {
    details.style.display = "block";
    icon.style.transform = "rotate(180deg)";
  } else {
    details.style.display = "none";
    icon.style.transform = "rotate(0deg)";
  }
};

// ==================== DASHBOARD ====================

async function renderDashboard(container) {
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-label">Total Alerts</div>
        <div class="stat-value" id="stat-total">—</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Critical</div>
        <div class="stat-value" id="stat-critical">—</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-label">High</div>
        <div class="stat-value" id="stat-high">—</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Assets Monitored</div>
        <div class="stat-value" id="stat-assets">—</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">Avg Risk Score</div>
        <div class="stat-value" id="stat-risk">—</div>
      </div>
    </div>

    <div class="two-col">
      <div class="section-card">
        <div class="section-header">
          <span class="section-title">🚨 Recent Critical Alerts</span>
        </div>
        <div class="section-body" id="recent-alerts-body">
          <div class="empty-state"><p>Loading alerts...</p></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-title">🛡️ Asset Overview</span>
        </div>
        <div class="section-body" id="asset-overview-body">
          <div class="empty-state"><p>Loading assets...</p></div>
        </div>
      </div>
    </div>

    <!-- Feed section -->
    <div class="section-card" style="margin-top: 24px;">
      <div class="section-header">
        <span class="section-title">📡 Latest Threat Intelligence Feeds</span>
      </div>
      <div class="section-body" id="recent-feeds-body">
        <div class="empty-state"><p>Loading feeds...</p></div>
      </div>
    </div>
  `;

  try {
    const [alerts, assets, feeds] = await Promise.all([
      api.getAlerts().catch(() => []),
      api.getAssets().catch(() => []),
      api.getFeeds().catch(() => [])
    ]);

    state.alerts = alerts;
    state.assets = assets;
    state.feeds = feeds;

    const critical = alerts.filter(a => a.priority === "CRITICAL").length;
    const high = alerts.filter(a => a.priority === "HIGH").length;
    const avgRisk = alerts.length > 0
      ? Math.round(alerts.reduce((s, a) => s + (a.riskScore || 0), 0) / alerts.length)
      : 0;

    animateCounter("stat-total", alerts.length);
    animateCounter("stat-critical", critical);
    animateCounter("stat-high", high);
    animateCounter("stat-assets", assets.length);
    animateCounter("stat-risk", avgRisk);

    // Update alert badge
    if (alerts.length > 0) {
      const badge = document.getElementById("alert-badge");
      badge.textContent = alerts.length;
      badge.style.display = "inline";
    }

    // Recent alerts table
    const alertsBody = document.getElementById("recent-alerts-body");
    if (alerts.length === 0) {
      alertsBody.innerHTML = `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <h3>No alerts yet</h3>
        <p>Use Controls → Fetch Feeds to start</p>
      </div>`;
    } else {
      alertsBody.innerHTML = `
        <table class="data-table">
          <thead><tr>
            <th>Priority</th>
            <th>Risk</th>
            <th>Asset</th>
            <th>Product</th>
            <th>CVEs</th>
          </tr></thead>
          <tbody>
            ${alerts.slice(0, 8).map(a => `
              <tr>
                <td>${priorityBadge(a.priority)}</td>
                <td>${riskBar(a.riskScore)}</td>
                <td style="font-weight:600;color:var(--text-primary);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.assetName || "—")}</td>
                <td><span class="badge badge-medium" style="border:none;background:var(--accent-purple-dim);color:var(--accent-purple);">${escapeHtml(a.product || "—")}</span></td>
                <td>${(a.cveIds && a.cveIds.length > 0) ? a.cveIds.slice(0, 2).map(c => `<span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:0.7rem;background:var(--accent-red-dim);color:var(--accent-red);padding:2px 5px;border-radius:4px;margin:1px;">${escapeHtml(c)}</span>`).join("") : "<span class='bool-false'>—</span>"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    // Asset overview
    const assetBody = document.getElementById("asset-overview-body");
    if (assets.length === 0) {
      assetBody.innerHTML = `<div class="empty-state">
        <h3>No assets registered</h3>
        <p>Use Assets page to add or seed assets</p>
      </div>`;
    } else {
      assetBody.innerHTML = assets.map(a => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
          <div>
            <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(a.assetName)}</span>
            <span style="margin-left:8px;font-size:0.78rem;color:var(--text-muted);">${a.software?.length || 0} software</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
            <span style="font-size:0.6rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Criticality</span>
            ${priorityBadge(a.criticality)}
          </div>
        </div>
      `).join("");
    }
    
    // Recent feeds
    const feedBody = document.getElementById("recent-feeds-body");
    if (state.feeds.length === 0) {
      feedBody.innerHTML = `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
        <h3>No feeds ingested</h3>
        <p>Use Controls → Fetch Feeds to start</p>
      </div>`;
    } else {
      feedBody.innerHTML = `
        <table class="data-table">
          <thead><tr>
            <th>Source</th>
            <th>Title</th>
            <th>Keywords</th>
            <th>Date</th>
          </tr></thead>
          <tbody>
            ${state.feeds.slice(0, 10).map(f => `
              <tr>
                <td><span class="badge badge-medium" style="background:var(--accent-blue-dim);color:var(--accent-blue);border:none;">${escapeHtml(f.source || "RSS")}</span></td>
                <td>
                  <a href="${f.url}" target="_blank" style="color:var(--text-primary);text-decoration:none;font-weight:600;display:block;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.title)}</a>
                </td>
                <td>
                  ${(f.extracted?.keywords || []).slice(0, 3).map(k => `<span style="font-size:0.7rem;background:var(--bg-input);padding:2px 6px;border-radius:4px;margin-right:4px;">${escapeHtml(k)}</span>`).join("")}
                </td>
                <td style="font-size:0.75rem;color:var(--text-muted);">${new Date(f.publishedAt || f.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

  } catch (err) {
    showToast("Failed to load dashboard data", "error");
  }
}

// ==================== ALERTS PAGE ====================

async function renderAlerts(container) {
  container.innerHTML = `
    <div class="filter-bar" id="alert-filters">
      <button class="filter-chip active" data-filter="ALL">All</button>
      <button class="filter-chip" data-filter="CRITICAL">Critical</button>
      <button class="filter-chip" data-filter="HIGH">High</button>
      <button class="filter-chip" data-filter="MEDIUM">Medium</button>
      <button class="filter-chip" data-filter="LOW">Low</button>
    </div>
    <div class="section-card">
      <div class="section-body" id="alerts-table-body">
        <div class="empty-state"><p>Loading alerts...</p></div>
      </div>
    </div>
  `;

  // Bind filter chips
  document.querySelectorAll("#alert-filters .filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#alert-filters .filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderAlertTable(chip.dataset.filter);
    });
  });

  try {
    state.alerts = await api.getAlerts();
    renderAlertTable("ALL");
  } catch (err) {
    document.getElementById("alerts-table-body").innerHTML =
      `<div class="empty-state"><h3>Failed to load alerts</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderAlertTable(filter) {
  const body = document.getElementById("alerts-table-body");
  let alerts = state.alerts;

  if (filter !== "ALL") {
    alerts = alerts.filter(a => a.priority === filter);
  }

  if (alerts.length === 0) {
    body.innerHTML = `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <h3>No ${filter === "ALL" ? "" : filter.toLowerCase()} alerts found</h3>
      <p>Try fetching feeds from the Controls page</p>
    </div>`;
    return;
  }

  body.innerHTML = `
    <div class="alerts-list">
      ${alerts.map((a, i) => `
        <div class="section-card alert-item" style="margin-bottom: 12px; border-left: 4px solid ${a.priority === 'CRITICAL' ? 'var(--critical)' : (a.priority === 'HIGH' ? 'var(--high)' : (a.priority === 'MEDIUM' ? 'var(--medium)' : 'var(--low)'))};">
          <div class="alert-summary" style="padding: 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="toggleAlertDetails('${i}')">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
              ${priorityBadge(a.priority)}
              <div style="flex: 1;">
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(a.assetName)} — ${escapeHtml(a.product)} ${a.asset_version ? 'v' + a.asset_version : ''}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px;">Detected: ${new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div style="width: 100px;">
                ${riskBar(a.riskScore)}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; margin-left: 20px;">
               <span class="badge ${a.status === 'OPEN' ? 'badge-high' : 'badge-low'}">${a.status || "OPEN"}</span>
               <svg id="alert-icon-${i}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.3s;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          
          <div id="alert-details-${i}" class="alert-details" style="display: none; padding: 0 20px 20px 20px; border-top: 1px solid var(--border-subtle); background: rgba(0,0,0,0.03);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-top: 20px;">
              
              <div>
                <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; letter-spacing: 0.05em;">Vulnerability Context</h4>
                <p style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary); margin-bottom: 15px;">${escapeHtml(a.message || "Threat detected on asset.")}</p>
                
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                  <div style="background: var(--bg-primary); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-primary);">
                    <div style="font-size:0.6rem; color:var(--text-muted); text-transform:uppercase;">CVSS Severity</div>
                    <div style="font-family:'JetBrains Mono'; font-weight:700; color:var(--accent-red);">${a.cvss != null ? a.cvss.toFixed(1) : "—"}</div>
                  </div>
                  <div style="background: var(--bg-primary); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-primary);">
                    <div style="font-size:0.6rem; color:var(--text-muted); text-transform:uppercase;">EPSS Probability</div>
                    <div style="font-family:'JetBrains Mono'; font-weight:700; color:var(--accent-amber);">${a.epss != null ? (a.epss * 100).toFixed(1) + "%" : "—"}</div>
                  </div>
                  <div style="background: var(--bg-primary); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-primary);">
                    <div style="font-size:0.6rem; color:var(--text-muted); text-transform:uppercase;">Asset Criticality</div>
                    <div style="font-weight:700;">${a.severity || "MEDIUM"}</div>
                  </div>
                </div>

                <div style="font-size: 0.82rem; color: var(--text-secondary);">
                  <div style="margin-bottom:6px;"><strong>CVEs:</strong> ${a.cveIds?.length ? a.cveIds.map(c => `<span style="font-family:'JetBrains Mono';background:var(--accent-red-dim);color:var(--accent-red);padding:2px 5px;border-radius:4px;margin-right:4px;">${c}</span>`).join("") : "None"}</div>
                </div>
              </div>

              <div>
                <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; letter-spacing: 0.05em;">Threat Intelligence Indicators</h4>
                <div style="background: var(--bg-primary); padding: 15px; border-radius: 8px; border: 1px solid var(--border-primary); display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                   <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:0.8rem; color:var(--text-secondary);">KEV (Known Active):</span>
                      ${boolIcon(a.kev)}
                   </div>
                   <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:0.8rem; color:var(--text-secondary);">Public Exploit:</span>
                      ${boolIcon(a.exploitAvailable)}
                   </div>
                   <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:0.8rem; color:var(--text-secondary);">Malware Activity:</span>
                      ${boolIcon(a.malwareDetected)}
                   </div>
                   <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:0.8rem; color:var(--text-secondary);">Remediation Status:</span>
                      <span style="font-size:0.8rem; font-weight:600;">Open</span>
                   </div>
                </div>
                <div style="margin-top: 15px;">
                   <button class="btn btn-primary" style="font-size:0.75rem; padding: 6px 12px;" onclick="viewSourceFeed('${a.feedId?._id || a.feedId}')">View Source Feed</button>
                   <button class="btn btn-secondary" style="font-size:0.75rem; padding: 6px 12px; margin-left:8px;">Mark as Resolved</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

window.toggleAlertDetails = (index) => {
  const details = document.getElementById(`alert-details-${index}`);
  const icon = document.getElementById(`alert-icon-${index}`);
  if (details.style.display === "none") {
    details.style.display = "block";
    icon.style.transform = "rotate(180deg)";
  } else {
    details.style.display = "none";
    icon.style.transform = "rotate(0deg)";
  }
};

window.viewSourceFeed = (feedId) => {
  state.autoExpandFeedId = feedId;
  navigateTo('feeds');
};

// ==================== ASSETS PAGE ====================

async function renderAssets(container) {
  container.innerHTML = `
    <!-- Add Asset Form -->
    <div class="section-card add-asset-section">
      <div class="section-header">
        <span class="section-title">➕ Add New Asset</span>
        <button class="btn btn-success" id="btn-seed-assets">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Seed Test Assets
        </button>
      </div>
      <div class="section-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Asset Name</label>
            <input class="form-input" id="asset-name" placeholder="e.g. Web Server" />
          </div>
          <div class="form-group">
            <label class="form-label">Criticality</label>
            <select class="form-select" id="asset-criticality">
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM" selected>MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Company</label>
            <input class="form-input" value="${state.companyName || state.companyId}" readonly style="opacity:0.7; cursor:not-allowed;" />
          </div>
        </div>

        <div class="form-label">Software (name → version)</div>
        <div id="software-rows">
          <div class="software-row">
            <div class="form-group"><input class="form-input sw-name" placeholder="Software name" /></div>
            <div class="form-group"><input class="form-input sw-version" placeholder="Version" /></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="btn btn-secondary" id="btn-add-sw-row">+ Add Software</button>
          <button class="btn btn-primary" id="btn-create-asset">Create Asset</button>
        </div>
      </div>
    </div>

    <!-- Asset Cards -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📦 Registered Assets</span>
        <button class="btn btn-secondary" id="btn-refresh-assets">Refresh</button>
      </div>
      <div class="section-body">
        <div class="assets-grid" id="assets-grid">
          <div class="empty-state"><p>Loading assets...</p></div>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById("btn-add-sw-row").addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "software-row";
    row.innerHTML = `
      <div class="form-group"><input class="form-input sw-name" placeholder="Software name" /></div>
      <div class="form-group"><input class="form-input sw-version" placeholder="Version" /></div>
    `;
    document.getElementById("software-rows").appendChild(row);
  });

  document.getElementById("btn-create-asset").addEventListener("click", async () => {
    const name = document.getElementById("asset-name").value.trim();
    const criticality = document.getElementById("asset-criticality").value;
    const company_id = state.companyId; // ✅ always use logged-in company

    if (!name) { showToast("Asset name required", "error"); return; }

    const software = [];
    document.querySelectorAll(".software-row").forEach(row => {
      const n = row.querySelector(".sw-name").value.trim();
      const v = row.querySelector(".sw-version").value.trim();
      if (n) software.push({ name: n.toLowerCase(), version: v });
    });

    try {
      const btn = document.getElementById("btn-create-asset");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creating...';

      await api.addAsset({ assetName: name, software, criticality, company_id });
      showToast(`Asset "${name}" created successfully`, "success");
      loadAssets();

      // Clear form
      document.getElementById("asset-name").value = "";
      document.querySelectorAll(".sw-name, .sw-version").forEach(i => i.value = "");
    } catch (err) {
      showToast("Failed to create asset: " + err.message, "error");
    } finally {
      const btn = document.getElementById("btn-create-asset");
      btn.disabled = false;
      btn.textContent = "Create Asset";
    }
  });

  document.getElementById("btn-seed-assets").addEventListener("click", async () => {
    const btn = document.getElementById("btn-seed-assets");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Seeding...';
    try {
      await api.seedAssets();
      showToast("Test assets seeded successfully!", "success");
      loadAssets();
    } catch (err) {
      showToast("Seed failed: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Seed Test Assets`;
    }
  });

  document.getElementById("btn-refresh-assets").addEventListener("click", loadAssets);

  loadAssets();
}

async function loadAssets() {
  const grid = document.getElementById("assets-grid");
  if (!grid) return;

  try {
    state.assets = await api.getAssets();

    if (state.assets.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
        <h3>No assets found</h3>
        <p>Add assets manually or click "Seed Test Assets"</p>
      </div>`;
      return;
    }

    grid.innerHTML = state.assets.map(a => `
      <div class="asset-card">
        <div class="asset-card-header">
          <div style="flex:1;">
            <div class="asset-name" style="display:flex; align-items:center; gap:10px;">
              ${escapeHtml(a.assetName)}
              <button class="btn-icon-delete" onclick="handleDeleteAsset('${a._id}')" title="Delete Asset">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">Criticality</span>
            ${priorityBadge(a.criticality)}
          </div>
        </div>
        <ul class="asset-software-list">
          ${(a.software || []).map(s => `
            <li class="asset-software-item" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="software-name">${escapeHtml(s.name)}</span>
                <span class="software-version">v${escapeHtml(s.version)}</span>
              </div>
              <button class="sw-delete-btn" onclick="handleDeleteSoftware('${a._id}', '${s._id}')" title="Remove software">×</button>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("");

  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <h3>Failed to load assets</h3><p>${escapeHtml(err.message)}</p>
    </div>`;
  }
}

async function handleDeleteAsset(id) {
  if (!confirm("Are you sure you want to delete this asset? This cannot be undone.")) return;
  try {
    await api.deleteAsset(id);
    showToast("Asset deleted successfully", "success");
    loadAssets();
  } catch (err) {
    showToast("Failed to delete asset: " + err.message, "error");
  }
}

async function handleDeleteSoftware(assetId, softwareId) {
  try {
    await api.deleteSoftware(assetId, softwareId);
    showToast("Software removed", "success");
    loadAssets();
  } catch (err) {
    showToast("Failed to remove software: " + err.message, "error");
  }
}

// ==================== CONTROLS PAGE ====================

function renderControls(container) {
  container.innerHTML = `
    <div class="control-grid">
      <!-- Fetch Feeds -->
      <div class="control-panel">
        <div class="control-icon cyan">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
        </div>
        <div class="control-title">Fetch Feeds</div>
        <div class="control-desc">Fetch from OPML sources, extract threats, enrich with intelligence data, and generate alerts.</div>
        <button class="btn btn-primary" id="btn-fetch-feeds" style="width:100%;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Start Feed Ingestion
        </button>
        <div class="control-result" id="result-fetch"></div>
      </div>

      <!-- Run Alerts -->
      <div class="control-panel">
        <div class="control-icon amber">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="control-title">Run Alerts</div>
        <div class="control-desc">Re-process existing feeds and generate new alerts using the latest threat intelligence data.</div>
        <button class="btn btn-primary" id="btn-run-alerts" style="width:100%;background:linear-gradient(135deg,var(--accent-amber),#cc7a00);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Generate Alerts
        </button>
        <div class="control-result" id="result-alerts"></div>
      </div>

      <!-- Seed Assets -->
      <div class="control-panel">
        <div class="control-icon green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        </div>
        <div class="control-title">Seed Assets</div>
        <div class="control-desc">Load test IT assets (Web Server, Corp Laptops, Network, Mobile Fleet) into the database.</div>
        <button class="btn btn-success" id="btn-seed-ctrl" style="width:100%;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Seed Test Assets
        </button>
        <div class="control-result" id="result-seed"></div>
      </div>

      <!-- System Status -->
      <div class="control-panel">
        <div class="control-icon purple">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div class="control-title">System Status</div>
        <div class="control-desc">Check backend server health and connectivity status.</div>
        <button class="btn btn-secondary" id="btn-health" style="width:100%;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Check Health
        </button>
        <div class="control-result" id="result-health"></div>
      </div>
    </div>
  `;

  // Fetch Feeds
  document.getElementById("btn-fetch-feeds").addEventListener("click", async () => {
    const btn = document.getElementById("btn-fetch-feeds");
    const result = document.getElementById("result-fetch");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Fetching feeds... (this may take a few minutes)';
    result.style.display = "none";

    try {
      const data = await api.fetchFeeds();
      result.className = "control-result";
      result.style.display = "block";
      result.textContent = JSON.stringify(data, null, 2);
      showToast(`Feeds fetched! ${data.newSaved || 0} new items saved.`, "success");
    } catch (err) {
      result.className = "control-result error";
      result.style.display = "block";
      result.textContent = "Error: " + err.message;
      showToast("Feed fetch failed", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Start Feed Ingestion`;
    }
  });

  // Run Alerts
  document.getElementById("btn-run-alerts").addEventListener("click", async () => {
    const btn = document.getElementById("btn-run-alerts");
    const result = document.getElementById("result-alerts");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating alerts...';
    result.style.display = "none";

    try {
      const data = await api.runAlerts();
      result.className = "control-result";
      result.style.display = "block";
      result.textContent = JSON.stringify(data, null, 2);
      showToast(`Alerts generated! Total: ${data.total || 0}`, "success");
    } catch (err) {
      result.className = "control-result error";
      result.style.display = "block";
      result.textContent = "Error: " + err.message;
      showToast("Alert generation failed", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Generate Alerts`;
    }
  });

  // Seed Assets
  document.getElementById("btn-seed-ctrl").addEventListener("click", async () => {
    const btn = document.getElementById("btn-seed-ctrl");
    const result = document.getElementById("result-seed");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Seeding...';
    result.style.display = "none";

    try {
      const data = await api.seedAssets();
      result.className = "control-result";
      result.style.display = "block";
      result.textContent = JSON.stringify(data, null, 2);
      showToast("Test assets seeded!", "success");
    } catch (err) {
      result.className = "control-result error";
      result.style.display = "block";
      result.textContent = "Error: " + err.message;
      showToast("Seed failed", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Seed Test Assets`;
    }
  });

  // Health Check
  document.getElementById("btn-health").addEventListener("click", async () => {
    const btn = document.getElementById("btn-health");
    const result = document.getElementById("result-health");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Checking...';

    try {
      const start = Date.now();
      const res = await fetch(API_BASE + "/api/health");
      const text = await res.text();
      const latency = Date.now() - start;
      result.className = "control-result";
      result.style.display = "block";
      result.textContent = `Status: ${res.status} OK\nResponse: ${text}\nLatency: ${latency}ms`;
    } catch (err) {
      result.className = "control-result error";
      result.style.display = "block";
      result.textContent = "Server unreachable: " + err.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Check Health`;
    }
  });
}

// ==================== HELPERS ====================

function priorityBadge(priority) {
  const cls = {
    CRITICAL: "badge-critical",
    HIGH: "badge-high",
    MEDIUM: "badge-medium",
    LOW: "badge-low"
  };
  return `<span class="badge ${cls[priority] || 'badge-low'}">${priority || "—"}</span>`;
}

function riskBar(score) {
  const s = score || 0;
  let color = "var(--low)";
  if (s >= 80) color = "var(--critical)";
  else if (s >= 50) color = "var(--high)";
  else if (s >= 30) color = "var(--medium)";

  return `
    <div class="risk-bar-wrap">
      <span class="risk-score" style="color:${color};">${s}</span>
      <div class="risk-bar">
        <div class="risk-bar-fill" style="width:${s}%;background:${color};"></div>
      </div>
    </div>
  `;
}

function boolIcon(val) {
  return val
    ? `<span class="bool-true">✔</span>`
    : `<span class="bool-false">—</span>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 30);
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ==================== CLOCK ====================

function startClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;

  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  }
  update();
  setInterval(update, 1000);
}

// ==================== SERVER STATUS CHECK ====================

async function checkServerStatus() {
  const dot = document.querySelector(".status-dot");
  const text = document.querySelector(".status-text");

  try {
    await fetch(API_BASE + "/api/health", { signal: AbortSignal.timeout(3000) });
    dot.className = "status-dot online";
    text.textContent = "Server Online";
  } catch {
    dot.className = "status-dot offline";
    text.textContent = "Server Offline";
  }
}

// ==================== THEME TOGGLE ====================

function initTheme() {
  const saved = localStorage.getItem("tf-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tf-theme", next);
    showToast(`Switched to ${next} mode`, "info");
  });
}

// ==================== AUTHENTICATION ====================

function initAuth() {
  const overlay = document.getElementById("auth-overlay");
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");
  const toggleLink = document.getElementById("toggle-auth");
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");

  // Check initial state
  if (state.companyId) {
    document.body.classList.remove("login-hidden");
    overlay.style.display = "none";
  }

  toggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    state.isRegistering = !state.isRegistering;
    authTitle.textContent = state.isRegistering ? "Create Account" : "Welcome Back";
    authSubtitle.textContent = state.isRegistering ? "Register your company to start monitoring threats" : "Login to access your Threat Intelligence";
    loginBtn.textContent = state.isRegistering ? "Register Content" : "Login";
    toggleLink.textContent = state.isRegistering ? "Back to Login" : "Register here";
  });

  loginBtn.addEventListener("click", async () => {
    const name = document.getElementById("login-name").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!name || !password) {
      showToast("Please fill all fields", "error");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
      let res;
      if (state.isRegistering) {
        res = await api.register(name, password);
        showToast("Registration successful! Logging you in...", "success");
      }
      
      // Auto-login after registration or direct login
      res = await api.login(name, password);
      
      localStorage.setItem("company_id", res.company_id);
      localStorage.setItem("company_name", res.name);
      state.companyId = res.company_id;
      state.companyName = res.name;

      showToast(`Welcome, ${res.name}`, "success");
      document.body.classList.remove("login-hidden");
      overlay.style.display = "none";
      navigateTo("dashboard");

    } catch (err) {
      showToast(err.message.includes("401") ? "Invalid credentials" : "Auth failed: " + err.message, "error");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = state.isRegistering ? "Register" : "Login";
    }
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("company_id");
    localStorage.removeItem("company_name");
    location.reload();
  });
}

// ==================== INIT ====================

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initRouter();
  initAuth();
  startClock();
  checkServerStatus();
  setInterval(checkServerStatus, 15000);
  
  if (state.companyId) {
    navigateTo("dashboard");
  }
});
