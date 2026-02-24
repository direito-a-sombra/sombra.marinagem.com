document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("page");
  const hasSlider = page && page.classList.contains("slider-page");
  const panelLinks = Array.from(document.querySelectorAll(".nav-link"));

  if (!hasSlider || panelLinks.length === 0) return;

  let inactivityTimer = null;
  const INACTIVITY_MS = 8000;

  const clearPulse = () => {
    panelLinks.forEach((link) => link.classList.remove("nav-pulse"));
  };

  const schedulePulse = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      clearPulse();

      const currentIdx = panelLinks.findIndex((link) =>
        link.classList.contains("opacity-sel")
      );

      const nextIndex =
        currentIdx >= 0
          ? Math.min(currentIdx + 1, panelLinks.length - 1)
          : 0;

      if (nextIndex !== currentIdx) {
        panelLinks[nextIndex].classList.add("nav-pulse");
      }
    }, INACTIVITY_MS);
  };

  const resetInactivity = () => {
    clearPulse();
    schedulePulse();
  };

  // Any of these interactions counts as activity:
  // - wheel / trackpad swipes on the slider
  // - touchstart on the slider (mobile swipe)
  // - clicking nav dots
  // - arrow keys (left/right)
  // - clicking shade text highlights

  page.addEventListener(
    "wheel",
    () => {
      resetInactivity();
    },
    { passive: true }
  );

  page.addEventListener(
    "touchstart",
    () => {
      resetInactivity();
    },
    { passive: true }
  );

  panelLinks.forEach((link) => {
    link.addEventListener("click", resetInactivity);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      resetInactivity();
    }
  });

  const shadeText = document.getElementById("shade-text");
  if (shadeText) {
    shadeText.addEventListener("click", resetInactivity);
  }

  // Start the first inactivity timer
  schedulePulse();
});

