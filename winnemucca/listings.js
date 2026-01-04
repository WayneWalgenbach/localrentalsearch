document.getElementById("yr").textContent = new Date().getFullYear();

const HOURS = 60 * 60 * 1000;

const listings = [
  // Demo listing (not verified)
  {
    id: "demo-apt-12",
    status: "demo", // demo | available | pending | waitlist | filled
    unit: "#12",
    beds: 1,
    baths: 1,
    rent: 1400,
    address: "Example Apartment — Winnemucca, NV",
    notes: ["Demo listing", "Policies: Demo", "Deposit: Demo"],
    verifiedAt: null,          // ISO string when verified (e.g. "2026-01-04T20:15:00Z")
    expiresHours: 72,
    photos: [
      "https://picsum.photos/seed/winn1/1200/800",
      "https://picsum.photos/seed/winn2/1200/800",
      "https://picsum.photos/seed/winn3/1200/800"
    ]
  },

  // Example of what a verified listing looks like (keep or remove)
  {
    id: "verified-sample",
    status: "available",
    unit: "—",
    beds: 2,
    baths: 1,
    rent: 1600,
    address: "Sample Verified Listing — Winnemucca (Example)",
    notes: ["Verified example entry", "Pets: Ask", "Utilities: Varies"],
    verifiedAt: new Date(Date.now() - (18 * HOURS)).toISOString(), // verified ~18 hours ago
    expiresHours: 72,
    photos: [
      "https://picsum.photos/seed/winnv1/1200/800",
      "https://picsum.photos/seed/winnv2/1200/800"
    ]
  }
];

const cards = document.getElementById("cards");
const resultsMeta = document.getElementById("resultsMeta");

const qEl = document.getElementById("q");
const bedsEl = document.getElementById("beds");
const maxPriceEl = document.getElementById("maxPrice");
const statusEl = document.getElementById("status");
const clearBtn = document.getElementById("clearBtn");

/* ---------------------------
   Gallery (your existing UX)
----------------------------*/
let currentPhotos = [];
let currentIndex = 0;

const modal = document.getElementById("galleryModal");
const modalImg = document.getElementById("modalImg");
const modalCounter = document.getElementById("modalCounter");
const modalTitle = document.getElementById("modalTitle");

function openGallery(listing){
  currentPhotos = listing.photos || [];
  currentIndex = 0;
  modalTitle.textContent = listing.address || "Photos";
  modal.classList.add("open");
  renderModal();
}

function closeGallery(){
  modal.classList.remove("open");
}

function renderModal(){
  if (!currentPhotos.length) return;
  modalImg.src = currentPhotos[currentIndex];
  modalCounter.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
}

document.getElementById("prevBtn").onclick = () => {
  if (!currentPhotos.length) return;
  currentIndex = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length;
  renderModal();
};
document.getElementById("nextBtn").onclick = () => {
  if (!currentPhotos.length) return;
  currentIndex = (currentIndex + 1) % currentPhotos.length;
  renderModal();
};
document.getElementById("modalClose").onclick = closeGallery;
modal.onclick = (e) => { if (e.target === modal) closeGallery(); };

/* ---------------------------
   Verification / Recency
----------------------------*/
function hoursSince(iso){
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / HOURS;
}

function computeRecency(listing){
  const h = hoursSince(listing.verifiedAt);
  if (h === null) return { label: "Not verified", expired: false, hours: null };
  const windowH = Number(listing.expiresHours || 72);
  const expired = h > windowH;
  const label = expired ? `Expired (${Math.floor(h)}h ago)` : `Verified within ${Math.floor(h)}h`;
  return { label, expired, hours: h };
}

// Non-destructive: if a listing is "available" but expired, treat as "pending" in UI
function effectiveStatus(listing){
  if (listing.status === "available") {
    const rec = computeRecency(listing);
    if (rec.expired) return "pending";
  }
  return listing.status;
}

function statusLabel(s){
  const map = {
    demo: "Demo",
    available: "Available",
    pending: "Pending",
    waitlist: "Waitlist",
    filled: "Filled"
  };
  return map[s] || "—";
}

function fmtPrice(n){
  if (typeof n !== "number") return "—";
  return `$${n.toLocaleString()}/mo`;
}

function bedsLabel(n){
  if (n === 0) return "Studio";
  if (n === 1) return "1 bed";
  return `${n} beds`;
}

/* ---------------------------
   Filtering
----------------------------*/
function matchesFilters(listing, filters){
  const q = (filters.q || "").trim().toLowerCase();
  if (q) {
    const hay = [
      listing.address,
      listing.unit,
      String(listing.rent),
      String(listing.beds),
      String(listing.baths),
      (listing.notes || []).join(" "),
      statusLabel(listing.status)
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (filters.beds !== "") {
    const minBeds = Number(filters.beds);
    if (listing.beds < minBeds) return false;
  }

  if (filters.maxPrice !== "") {
    const maxP = Number(filters.maxPrice);
    if (listing.rent > maxP) return false;
  }

  if (filters.status !== "") {
    if (filters.status === "available") {
      // Available filter should respect effective status (expired "available" becomes "pending")
      if (effectiveStatus(listing) !== "available") return false;
    } else {
      if (listing.status !== filters.status) return false;
    }
  }

  return true;
}

function getFilters(){
  return {
    q: qEl.value || "",
    beds: bedsEl.value || "",
    maxPrice: maxPriceEl.value || "",
    status: statusEl.value || ""
  };
}

/* ---------------------------
   Render
----------------------------*/
function renderCards(list){
  cards.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "card pad";
    empty.innerHTML = `
      <div class="strong">No matches</div>
      <p class="muted">Try clearing filters or using a broader keyword.</p>
    `;
    cards.appendChild(empty);
    resultsMeta.textContent = "0 listings shown.";
    return;
  }

  resultsMeta.textContent = `${list.length} listing${list.length === 1 ? "" : "s"} shown.`;

  list.forEach(listing => {
    const rec = computeRecency(listing);
    const effStatus = effectiveStatus(listing);

    const statusClass = effStatus || "demo";
    const statusText = statusLabel(effStatus);

    const verifiedBadge = listing.status === "demo"
      ? `<span class="badge">Not verified</span>`
      : `<span class="badge">${rec.label}</span>`;

    const div = document.createElement("div");
    div.className = "card pad";
    div.innerHTML = `
      <div class="listing-meta">
        <span class="badge status ${statusClass}">${statusText}</span>
        <span class="badge">${fmtPrice(listing.rent)}</span>
      </div>

      <div class="strong">${listing.address}</div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
        <span class="badge">${bedsLabel(listing.beds)} • ${listing.baths} bath</span>
        ${verifiedBadge}
        ${listing.unit && listing.unit !== "—" ? `<span class="badge">Unit ${listing.unit}</span>` : ``}
      </div>

      <div class="photo-preview">
        <button type="button" aria-label="Open photos for ${escapeHtml(listing.address)}">
          <img src="${listing.photos && listing.photos[0] ? listing.photos[0] : ""}" alt="Listing photo preview" loading="lazy" />
        </button>
      </div>

      <div style="display:grid;gap:6px;margin-top:12px;">
        ${(listing.notes || []).slice(0, 4).map(n => `<div class="small">• ${escapeHtml(n)}</div>`).join("")}
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button class="btn" type="button" data-open="${escapeAttr(listing.id)}">View photos</button>
        <button class="btn" type="button" data-copy="${escapeAttr(listing.id)}">Copy details</button>
      </div>

      <div class="small" style="margin-top:10px;">
        ${listing.status === "demo"
          ? "Demo: shown for UX only. Do not rely on availability."
          : (rec.expired
            ? "This entry is past the verification window; treat as unconfirmed until re-verified."
            : "Verified entry: status reflects recent confirmation within the window shown.")
        }
      </div>
    `;

    div.querySelector("[data-open]").onclick = () => openGallery(listing);

    cards.appendChild(div);
  });
}

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function escapeAttr(str){ return escapeHtml(str); }

/* ---------------------------
   Copy details
----------------------------*/
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const id = btn.getAttribute("data-copy");
  const listing = listings.find(x => x.id === id);
  if (!listing) return;

  const rec = computeRecency(listing);
  const effStatus = effectiveStatus(listing);

  const lines = [
    listing.address,
    `Rent: ${fmtPrice(listing.rent)}`,
    `Beds/Baths: ${bedsLabel(listing.beds)}, ${listing.baths} bath`,
    `Status: ${statusLabel(effStatus)}`,
    listing.status === "demo" ? `Verification: Not verified (demo)` : `Verification: ${rec.label}`,
    `Notes: ${(listing.notes || []).join(" | ")}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(lines);
    btn.textContent = "Copied";
    setTimeout(() => btn.textContent = "Copy details", 900);
  } catch {
    alert("Copy failed on this device. You can manually select and copy.");
  }
});

/* ---------------------------
   Apply filters
----------------------------*/
function apply(){
  const f = getFilters();
  const filtered = listings.filter(l => matchesFilters(l, f));
  renderCards(filtered);
}

qEl.addEventListener("input", apply);
bedsEl.addEventListener("change", apply);
maxPriceEl.addEventListener("change", apply);
statusEl.addEventListener("change", apply);

clearBtn.addEventListener("click", () => {
  qEl.value = "";
  bedsEl.value = "";
  maxPriceEl.value = "";
  statusEl.value = "";
  apply();
});

/* init */
apply();