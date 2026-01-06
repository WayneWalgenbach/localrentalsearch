document.getElementById("yr").textContent = new Date().getFullYear();

const listings = [
  {
    id: "demo-a",
    status: "available",
    unit: "#12",
    beds: "1",
    rent: 1400,
    address: "Demo Apartment A — Winnemucca, NV",
    lastVerified: "2026-01-06",
    photos: [
      "https://picsum.photos/seed/winn1/1200/800"
    ]
  },
  {
    id: "demo-b",
    status: "pending",
    unit: "#3B",
    beds: "2",
    rent: 1650,
    address: "Demo Apartment B — Winnemucca, NV",
    lastVerified: "2026-01-04",
    photos: [
      "https://picsum.photos/seed/winn2/1200/800"
    ]
  }
];

const cards = document.getElementById("cards");

function daysSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function renderCards() {
  cards.innerHTML = "";

  listings.forEach(listing => {
    const days = daysSince(listing.lastVerified);

    let verifiedText =
      days === 0
        ? "Verified today"
        : days === 1
        ? "Verified yesterday"
        : `Verified ${days} days ago`;

    const div = document.createElement("div");
    div.className = "card pad";

    div.innerHTML = `
      <div class="listing-meta">
        <span class="status ${listing.status}">
          ${listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
        </span>
        <span class="badge">$${listing.rent}/mo</span>
      </div>

      <div class="strong">${listing.address}</div>

      <div class="verified">${verifiedText}</div>

      <div class="photo-preview">
        <button>
          <img src="${listing.photos[0]}" alt="Apartment photo" />
        </button>
      </div>
    `;

    cards.appendChild(div);
  });
}

renderCards();