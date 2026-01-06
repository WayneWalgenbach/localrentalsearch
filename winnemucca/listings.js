document.getElementById("yr").textContent = new Date().getFullYear();

const cards = document.getElementById("cards");
const FILTER = window.LRS_FILTER || {};

let listings = [];
let currentPhotos = [];
let currentIndex = 0;

const modal = document.getElementById("galleryModal");
const modalImg = document.getElementById("modalImg");
const modalCounter = document.getElementById("modalCounter");
const modalTitle = document.getElementById("modalTitle");

function openGallery(listing){
  currentPhotos = (listing.photos || []).slice();
  currentIndex = 0;
  if (modalTitle) modalTitle.textContent = listing.address || "Photos";
  modal.classList.add("open");
  renderModal();
}
function closeGallery(){ modal.classList.remove("open"); }

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

// Swipe support
let touchStartX = 0;
modal.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, {passive:true});
modal.addEventListener("touchend", (e) => {
  if (!currentPhotos.length) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) < 40) return;
  if (dx < 0) document.getElementById("nextBtn").click();
  else document.getElementById("prevBtn").click();
}, {passive:true});

function parseVerifiedAt(v){
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function withinHours(d, hours){
  if (!d) return false;
  return (Date.now() - d.getTime()) <= (hours * 3600000);
}
function normalizeStatus(s){
  const v = String(s || "").toLowerCase().trim();
  if (v === "available" || v === "pending" || v === "filled") return v;
  return "unknown";
}
function statusRank(status){
  if (status === "available") return 0;
  if (status === "pending") return 1;
  if (status === "filled") return 2;
  return 3;
}
function applyFilter(list){
  return list.filter(l => {
    if (FILTER.propertyType && String(l.propertyType || "").toLowerCase() !== String(FILTER.propertyType).toLowerCase()) return false;
    if (typeof FILTER.beds === "number" && Number(l.beds) !== FILTER.beds) return false;
    if (typeof FILTER.maxRent === "number" && Number(l.rent) > FILTER.maxRent) return false;
    if (typeof FILTER.verifiedWithinHours === "number") {
      const d = parseVerifiedAt(l.verifiedAt);
      if (!withinHours(d, FILTER.verifiedWithinHours)) return false;
    }
    return true;
  });
}
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function renderCards(list){
  cards.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "card pad";
    empty.innerHTML = `
      <span class="badge">No matches</span>
      <h2 style="margin-top:10px">Nothing to show yet</h2>
      <p class="lead">This page is live and ready. Listings will appear as they’re added and verified.</p>
    `;
    cards.appendChild(empty);
    return;
  }

  list.forEach(listing => {
    const status = normalizeStatus(listing.status);
    const verifiedDate = parseVerifiedAt(listing.verifiedAt);

    const statusLabel =
      status === "available" ? "Available" :
      status === "pending" ? "Pending" :
      status === "filled" ? "Filled" : "Unverified";

    const verifiedLabel = verifiedDate ? `Verified ${verifiedDate.toLocaleString()}` : "Not recently verified";

    const photos = Array.isArray(listing.photos) ? listing.photos : [];
    const firstPhoto = photos[0] || "https://picsum.photos/seed/lrsfallback/1200/800";

    const div = document.createElement("div");
    div.className = "card pad";
    div.innerHTML = `
      <div class="listing-meta">
        <span class="badge">${statusLabel}</span>
        <span class="badge">$${Number(listing.rent || 0).toLocaleString()}/mo</span>
      </div>

      <div class="strong">${escapeHtml(listing.address || "")}</div>

      <div class="listing-meta" style="margin-top:8px">
        <span class="badge">${Number(listing.beds || 0)} bd • ${Number(listing.baths || 0)} ba</span>
        <span class="badge">${escapeHtml(listing.propertyType || "Rental")}</span>
      </div>

      <div class="listing-meta" style="margin-top:8px">
        <span class="badge">Unit: ${escapeHtml(listing.unit || "—")}</span>
        <span class="badge">${escapeHtml(listing.leaseTerm || "Lease: —")}</span>
      </div>

      <div class="listing-meta" style="margin-top:8px">
        <span class="badge">${escapeHtml(listing.pets || "Pets: —")}</span>
        <span class="badge">${escapeHtml(verifiedLabel)}</span>
      </div>

      <div class="photo-preview">
        <button aria-label="Open photo gallery">
          <img src="${firstPhoto}" alt="Rental photo" loading="lazy" />
        </button>
      </div>

      <span class="badge">${photos.length || 1} photo(s)</span>
    `;

    div.querySelector("button").onclick = () => openGallery(listing);
    cards.appendChild(div);
  });
}

async function loadListings(){
  // Absolute path so subpages always work:
  const jsonPath = "/winnemucca/listings.json";

  try{
    const res = await fetch(jsonPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${jsonPath} (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("listings.json is not an array");
    listings = data;
  }catch(err){
    listings = [];
  }

  listings = listings.map(l => ({
    ...l,
    _status: normalizeStatus(l.status),
    _verified: parseVerifiedAt(l.verifiedAt)
  })).sort((a,b) => {
    const av = a._verified ? a._verified.getTime() : 0;
    const bv = b._verified ? b._verified.getTime() : 0;
    if (av !== bv) return bv - av;
    const sr = statusRank(a._status) - statusRank(b._status);
    if (sr !== 0) return sr;
    return Number(a.rent || 0) - Number(b.rent || 0);
  });

  renderCards(applyFilter(listings));
}

loadListings();