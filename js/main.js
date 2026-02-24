const FORTALEZA_URL = "https://www.google.com/maps/place/Fortaleza+-+Ceará,+Brazil/@-3.7931394,-38.6020174,12z/";

document.addEventListener("DOMContentLoaded", () => {
  // —— Slider (single-page panels) ——
  const page = document.getElementById("page");
  const panels = page && page.classList.contains("slider-page")
    ? Array.from(page.querySelectorAll(".panel"))
    : [];
  const panelLinks = document.querySelectorAll(".nav-link");

  const key2idx = {};
  const idx2key = {};
  panelLinks.forEach(el => {
    key2idx[el.dataset.panelLabel] = el.dataset.panelIndex;
    idx2key[el.dataset.panelIndex] = el.dataset.panelLabel;
  });

  let active = 0;
  let activeKey = "home";
  let lock = false;
  const duration = 650;

  const setNavActive = (index) => {
    panelLinks.forEach((link, i) => {
      link.classList.toggle("opacity-sel", i === index);
      if (i !== index) link.classList.add(`opacity-${Math.min(i, 6)}`);
    });
  };

  const highlightAndGo = (index) => {
    if (lock || index === active) return;
    if (index > 0) {
      setDetail(idx2key[index]);
      go(index);
    } else {
      clearDetail();
      go(0);
    }
  };

  const go = (index) => {
    if (lock || index === active) return;
    const next = Math.max(0, Math.min(index, panels.length - 1));
    lock = true;
    active = next;
    // Reset scroll position of the target panel so we don't land mid-scroll
    panels[next].scrollTop = 0;
    page.style.transform = `translateX(-${active * 100}vw)`;
    window.location.hash = active > 0 ? `/${idx2key[active]}` : "";
    setNavActive(active);
    setTimeout(() => (lock = false), duration);
  };

  page.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) <= 6) return;
      e.preventDefault();
      if (e.deltaX > 0) highlightAndGo(active + 1);
      else highlightAndGo(active - 1);
    },
    { passive: false }
  );

  // Touch swipe (mobile): horizontal swipe between sections
  let touchStartX = 0;
  let touchStartY = 0;

  page.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    },
    { passive: true }
  );

  page.addEventListener(
    "touchend",
    (e) => {
      if (e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      // Require a clear, deliberate horizontal swipe:
      // - at least 40px in X
      // - and significantly more horizontal than vertical (to avoid \"half\" moves)
      if (adx < 40 || adx <= ady * 1.4) return;

      if (dx < 0) {
        // swipe left → next panel
        highlightAndGo(active + 1);
      } else {
        // swipe right → previous panel
        highlightAndGo(active - 1);
      }
    },
    { passive: true }
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      highlightAndGo(active - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      highlightAndGo(active + 1);
    }
  });

  panelLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = parseInt(link.dataset.panelIndex);
      if (!isNaN(idx)) highlightAndGo(idx);
    });
  });

  setNavActive(0);

  // —— Shade text (home panel highlights) ——
  const text = document.getElementById("shade-text");
  if (!text) return;

  const clearDetail = () => {
    document.body.classList.remove("detail-open");
    document.querySelectorAll(".sentence.active").forEach((node) => node.classList.remove("active"));
    activeKey = null;
  };

  const setDetail = (key) => {
    if (!key) return;
    if (activeKey === key && document.body.classList.contains("detail-open")) {
      clearDetail();
      go(0);
      return;
    }

    document.querySelectorAll(".sentence.active").forEach((node) => node.classList.remove("active"));
    const activeSentence = text.querySelector(`.sentence[data-key="${key}"]`);
    if (activeSentence) activeSentence.classList.add("active");
    activeKey = key;
    document.body.classList.add("detail-open");

    if (key === "fortaleza") {
      window.open(FORTALEZA_URL, "_blank", "noopener, noreferrer");
    } else {
      go(key2idx[key]);
    }
  };

  text.addEventListener("click", (event) => {
    const trigger = event.target.closest(".highlight");
    if (!trigger) return;
    setDetail(trigger.getAttribute("data-key"));
  });

  if (window.location.hash) {
    const hash = window.location.hash.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (hash in key2idx) {
      setDetail(hash);
      go(key2idx[hash]);
    } else {
      window.location.hash = "";
    }
  }
});
