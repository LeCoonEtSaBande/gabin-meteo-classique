const DATA_URL = "data/processed/quotidien.json";
const META_URL = "data/processed/last_update.json";
const CACHE_KEY = "gabin-classique-quotidien";
const UPDATE_KEY = "gabin-classique-last-update";
const PARIS_TZ = "Europe/Paris";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const PAGE = document.body.dataset.page || "sauze";
const MULTISITE_ZONES = ["lyon", "hyeres", "meribel"];
const HIDE_REQUIREMENTS = PAGE === "multisite";

let dataset = null;
let dayKeys = [];
let dayIndex = 0;
let viewMode = "daily";
let selectedZone = PAGE === "multisite" ? "lyon" : "sauze";

function todayKey(timeZone = PARIS_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDayLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = JOURS[(utc.getUTCDay() + 6) % 7];
  return `${weekday} ${day} ${MOIS[month - 1]}`;
}

function status(message) {
  const empty = document.getElementById("detail-empty");
  if (empty) {
    empty.hidden = false;
    empty.textContent = message;
  }
}

function renderDayChrome() {
  const iso = dayKeys[dayIndex];
  document.getElementById("day-label").textContent = iso ? formatDayLabel(iso) : "—";
  const maj = document.getElementById("maj-label");
  maj.textContent = dataset?.last_update_label
    ? `MAJ ${dataset.last_update_label.replace(" ", " · ")}`
    : "";
  document.getElementById("prev-day").classList.toggle("is-disabled", dayIndex <= 0);
  document.getElementById("next-day").classList.toggle("is-disabled", !dayKeys.length || dayIndex >= dayKeys.length - 1);
}

function renderDetail() {
  renderZoneDetail({
    selectedZone,
    dayKey: dayKeys[dayIndex],
    fallbackLabel: PAGE === "multisite" ? "Lyon" : "Ferme de Sauze",
    viewMode,
    hideRequirements: HIDE_REQUIREMENTS,
  });
}

function setMode(mode) {
  viewMode = mode;
  document.getElementById("mode-daily")?.classList.toggle("is-active", mode === "daily");
  document.getElementById("mode-buoys")?.classList.toggle("is-active", mode === "buoys");
  renderDetail();
}

function setSite(zoneKey) {
  selectedZone = zoneKey;
  viewMode = "daily";
  document.querySelectorAll(".mode[data-zone]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.zone === zoneKey);
  });
  renderDetail();
}

function renderAll() {
  renderDayChrome();
  renderDetail();
}

function bindUi() {
  document.getElementById("prev-day").addEventListener("click", () => {
    if (dayIndex <= 0) return;
    dayIndex -= 1;
    renderAll();
  });
  document.getElementById("next-day").addEventListener("click", () => {
    if (dayIndex >= dayKeys.length - 1) return;
    dayIndex += 1;
    renderAll();
  });
  document.getElementById("mode-daily")?.addEventListener("click", () => setMode("daily"));
  document.getElementById("mode-buoys")?.addEventListener("click", () => setMode("buoys"));
  document.querySelectorAll(".mode[data-zone]").forEach((btn) => {
    btn.addEventListener("click", () => setSite(btn.dataset.zone));
  });
}

function usableDays(data) {
  const today = todayKey();
  return (data.days || []).filter((day) => day >= today);
}

async function loadDataset() {
  let remoteStamp = null;
  try {
    const metaRes = await fetch(META_URL, { cache: "no-store" });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      remoteStamp = meta.last_update_at || null;
    }
  } catch {
    remoteStamp = null;
  }

  const previous = localStorage.getItem(UPDATE_KEY);
  if (remoteStamp && previous === remoteStamp) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }

  const dataRes = await fetch(DATA_URL, { cache: "no-store" });
  if (!dataRes.ok) throw new Error(`Données introuvables (${dataRes.status})`);
  const data = await dataRes.json();
  const stamp = data.last_update_at || remoteStamp || "";
  try {
    localStorage.setItem(UPDATE_KEY, stamp);
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Quota téléphone : on affiche quand même le JSON frais.
  }
  return data;
}

async function boot() {
  try {
    const [, data] = await Promise.all([loadDetailAssets(), loadDataset()]);
    dataset = data;
    if (PAGE === "multisite") {
      const available = MULTISITE_ZONES.filter((zone) =>
        Object.values(dataset.spots || {}).some((spot) => spot.zone_key === zone)
      );
      selectedZone = available[0] || "lyon";
    } else {
      selectedZone = "sauze";
    }
    dayKeys = usableDays(dataset);
    if (!dayKeys.length) throw new Error("Aucun jour disponible à partir d'aujourd'hui");
    const today = todayKey();
    dayIndex = Math.max(0, dayKeys.indexOf(today));
    bindUi();
    if (PAGE === "multisite") {
      setSite(selectedZone);
    } else {
      setMode("daily");
    }
    renderAll();
  } catch (error) {
    status(error.message || String(error));
  }
}

boot();
