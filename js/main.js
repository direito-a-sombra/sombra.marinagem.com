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
  const duration = 250;

  const setNavActive = (index) => {
    panelLinks.forEach((link, i) => {
      link.classList.toggle("opacity-sel", i === index);
      if (i !== index) link.classList.add(`opacity-${Math.min(i, 6)}`);
    });
  };

  const hideTextFrame = (delta) => {
    const cPanel = panels.filter(el => el.dataset.panelIndex == active)[0];
    const textFrame = document.getElementById("text-nav-frame");

    if (delta < 0 && cPanel.scrollTop < 8) {
      textFrame.classList.remove("hide");
    } else if (delta > 0) {
      textFrame.classList.add("hide");
    }
  }

  const showTextFrame = () => {
    const textFrame = document.getElementById("text-nav-frame");
    textFrame.classList.remove("hide");
  }

  const resetScroll = () => {
    const cPanel = panels.filter(el => el.dataset.panelIndex == active)[0];
    cPanel.scrollTop = 1;
  }

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
    page.style.transform = `translateX(-${active * 100}vw)`;
    window.location.hash = active > 0 ? `/${idx2key[active]}` : "";
    setNavActive(active);
    showTextFrame();
    resetScroll();
    setTimeout(() => (lock = false), duration);
  };

  page.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) < 8 && Math.abs(e.deltaY) < 8) return;

      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 8 && active > 0) {
        hideTextFrame(e.deltaY);
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 8) {
        e.preventDefault();
        if (e.deltaX > 0) highlightAndGo(active + 1);
        else highlightAndGo(active - 1);
      }
    },
    { passive: false }
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
