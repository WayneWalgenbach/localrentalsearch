const DATA_URL = "https://localrentalsearch.com/winnemucca/listings.json";

const emailInput = document.getElementById("emailInput");
const webAppInput = document.getElementById("webAppInput");
const loadBtn = document.getElementById("loadBtn");
const cards = document.getElementById("cards");
const summary = document.getElementById("summary");
const toast = document.getElementById("toast");

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("open");
  setTimeout(()=>toast.classList.remove("open"), 2200);
}

function norm(v){ return String(v || "").trim().toLowerCase(); }

async function fetchData(){
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if(!res.ok) throw new Error("Failed to load listings");
  return await res.json();
}

function buildActionUrl(base, id, action){
  const b = String(base || "").trim().replace(/\/$/, "");
  return `${b}?id=${encodeURIComponent(id)}&action=${encodeURIComponent(action)}`;
}

async function sendUpdate(url){
  const res = await fetch(url, { method:"GET", cache:"no-store" });
  if(!res.ok) throw new Error("Update failed");
}

function render(listings, managerEmail, webApp){
  cards.innerHTML = "";

  const mine = listings.filter(l => norm(l.managerEmail) === norm(managerEmail));

  summary.textContent = mine.length
    ? `${mine.length} listing(s)`
    : "No listings found for this email";

  mine.forEach(l => {
    const div = document.createElement("div");
    div.className = "card pad";

    div.innerHTML = `
      <div class="listing-meta">
        <span class="badge">${String(l.status || "").toUpperCase()}</span>
        <span class="badge">${l.rent ? `$${l.rent}/mo` : "—"}</span>
      </div>

      <div class="strong">${l.title || l.address || l.id}</div>
      <div class="small">
        Unit <b>${l.unit || "—"}</b> • ${l.beds || "—"} bd • ${l.baths || "—"} ba
      </div>

      <div class="hr"></div>

      <div class="row">
        <button class="btn btn-wide btn-good" data-action="available">AVAILABLE</button>
        <button class="btn btn-wide btn-warn" data-action="pending">PENDING</button>
        <button class="btn btn-wide btn-bad" data-action="filled">FILLED</button>
      </div>
    `;

    div.querySelectorAll("button").forEach(btn=>{
      btn.onclick = async ()=>{
        if(!webApp || !webApp.includes("/exec")){
          showToast("Missing /exec URL");
          return;
        }

        const action = btn.dataset.action;
        const url = buildActionUrl(webApp, l.id, action);

        btn.disabled = true;
        const label = btn.textContent;
        btn.textContent = "UPDATING…";

        try{
          await sendUpdate(url);
          showToast(`${l.id} → ${action.toUpperCase()}`);
          const data = await fetchData();
          render(data.listings || [], managerEmail, webApp);
        }catch{
          showToast("Update failed");
        }finally{
          btn.disabled = false;
          btn.textContent = label;
        }
      };
    });

    cards.appendChild(div);
  });
}

loadBtn.onclick = async ()=>{
  const email = emailInput.value.trim();
  const webApp = webAppInput.value.trim();

  if(!email){ showToast("Enter email"); return; }
  if(!webApp){ showToast("Enter /exec URL"); return; }

  try{
    summary.textContent = "Loading…";
    const data = await fetchData();
    render(data.listings || [], email, webApp);
  }catch{
    summary.textContent = "Failed to load listings";
  }
};