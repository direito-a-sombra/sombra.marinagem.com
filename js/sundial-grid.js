function getLineEndpoints(q, p, ta, tb) {
  const u = 1 - p;

  const n = 300;

  // Light segment 0->q
  const xi1 = [];
  const etaL = [];
  let ky1 = 0;

  for (let i = 0; i < n; i++) {
    const xi = (q * i) / (n - 1);
    let eta = ta * (q - xi) + 0.5 * (1 + p);
    eta = clamp(eta, 0, 1);
    xi1.push(xi);
    etaL.push(eta);

    if (Math.abs(1.0 - eta) < 1e-12) {
      ky1 = i;
    }
  }

  // Shadow segment q->xiMax
  let xiMax = 1.0;
  if (u < 2 * tb * (1 - q)) {
    xiMax = Math.min(1.0, q + u / (2 * (tb + EPS)));
  }

  const xi2 = [];
  const etaS = [];
  for (let i = 0; i < n; i++) {
    const xi = q + (xiMax - q) * (i / (n - 1));
    let eta = tb * (q - xi) + 0.5 * (1 - p);
    eta = clamp(eta, 0, 1);
    xi2.push(xi);
    etaS.push(eta);
  }

  const L0 = { x: xi1[ky1], y: etaL[ky1] };
  const Ln = { x: xi1[n - 1], y: etaL[n - 1] };

  const Sn = { x: xi2[0], y: etaS[0]} ;
  const S1 = { x: xi2[n - 1], y: etaS[n - 1] };

  return { L0, Ln, Sn, S1 };
}

function shadeClipPath(q, p, ta, tb) {
  const { L0, Ln, Sn, S1 } = getLineEndpoints(q, p, ta, tb);

  // Left shape
  const Lclip = [];

  if (L0.x > 1e-12) {
    Lclip.push("0% calc(100% - 100%)");
  }

  Lclip.push(`${(L0.x * 100).toFixed(3)}% ${(100 - L0.y * 100).toFixed(3)}%`);
  Lclip.push(`${(Ln.x * 100).toFixed(3)}% ${(100 - Ln.y * 100).toFixed(3)}%`);
  Lclip.push(`${(Sn.x * 100).toFixed(3)}% ${(100 - Sn.y * 100).toFixed(3)}%`);
  Lclip.push(`${(S1.x * 100).toFixed(3)}% ${(100 - S1.y * 100).toFixed(3)}%`);

  if (S1.y > 1e-12) {
    Lclip.push("100% calc(100% - 0%)");
  }

  Lclip.push("0% calc(100% - 0%)");

  return Lclip.join(",");
}

function calculateLeftArea(q, p, ta, tb) {
  const { L0, Ln, Sn, S1 } = getLineEndpoints(q, p, ta, tb);

  // left + bottom
  if (L0.x < 1e-9 && S1.x < 1.0) {
    const larea =
      Ln.x * Ln.y +
      0.5 * Ln.x * (L0.y - Ln.y) +
      0.5 * (S1.x - Sn.x) * Sn.y;
    return larea;
  }
  // top + right
  else if (L0.x > 0 && S1.y > 1e-9) {
    const larea =
      Ln.x * Ln.y +
      0.5 * (Ln.x - L0.x) * (L0.y - Ln.y) +
      0.5 * (S1.x - Sn.x) * (Sn.y - S1.y) +
      L0.x * (L0.y - Ln.y) +
      (S1.x - Sn.x) * S1.y;
    return larea;
  }
  // left + right
  else if (L0.x < 1e-9 && S1.y > 1e-9) {
    const larea =
      Ln.x * Ln.y +
      0.5 * Ln.x * (L0.y - Ln.y) +
      0.5 * (S1.x - Sn.x) * (Sn.y - S1.y) +
      (S1.x - Sn.x) * S1.y;
    return larea;
  }
  // top + bottom
  else {
    const larea =
      Ln.x * Ln.y +
      0.5 * (S1.x - Sn.x) * Sn.y +
      0.5 * (Ln.x - L0.x) * (L0.y - Ln.y) +
      L0.x * (L0.y - Ln.y);
    return larea;
  }
}

const elSundialGrid = document.getElementById("sundial-grid-container");

const elSundialCity = document.getElementById("sundial-grid-city");
const elSundialMonthMin = document.getElementById("sundial-grid-month-min");
const elSundialMonthMax = document.getElementById("sundial-grid-month-max");
const elSundialMonthStep = document.getElementById("sundial-grid-month-step");

const elSundialHourMin = document.getElementById("sundial-grid-hour-min");
const elSundialHourMax = document.getElementById("sundial-grid-hour-max");
const elSundialHourStep = document.getElementById("sundial-grid-hour-step");

const elPselMin = document.getElementById("psel-min");
const elPselMax = document.getElementById("psel-max");

const elPole = document.getElementById("sundial-grid-pole");
const elAbar = document.getElementById("a_bar");

const elColorL = document.getElementById("l_color");
const elColorS = document.getElementById("s_color");

const elUpdateBtn  = document.getElementById("sundial-grid-update-button");

// NOTE: this can be improved with binary search on ordered arrays
function findClosestIdx(vals, val) {
  let minIdx = 0;
  let minDiff = Math.abs(vals[0] - val);

  for (let i = 0; i < vals.length; i++) {
    let diff = Math.abs(vals[i] - val);
    if (diff < minDiff) {
      minIdx = i;
      minDiff = diff;
    }
  }
  return minIdx;
}

const [HHMIN, HHMAX] = [6, 17];
const [MMIN, MMAX] = [1, 12];
const [STEPMIN, STEPMAX] = [1, 12];
const [PMIN, PMAX] = [0.0, 1.0];
const MONTHS = ["", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

async function renderGrid() {
  const [y, d, mm] = [2026, 1, 0];
  const { cityName, latDeg, lonDeg, tzOffHr } = await getCityLatLon(elSundialCity.value);
  elSundialCity.value = cityName;

  const poleH = Number(elPole.value);
  const abar = clamp(Number(elAbar.value), 0.0, 1.0);

  const pSelMin = clamp(Number(elPselMin.value), PMIN, PMAX);
  const pSelMax = clamp(Number(elPselMax.value), PMIN, PMAX);
  const pSelRange = pSelMax - pSelMin;

  const hhMin = clamp(Number(elSundialHourMin.value), HHMIN, HHMAX);
  const hhMax = clamp(Number(elSundialHourMax.value), HHMIN, HHMAX);
  const hhStep = clamp(Number(elSundialHourStep.value), STEPMIN, STEPMAX);

  const mMin = clamp(Number(elSundialMonthMin.value), MMIN, MMAX);
  const mMax = clamp(Number(elSundialMonthMax.value), MMIN, MMAX);
  const mStep = clamp(Number(elSundialMonthStep.value), STEPMIN, STEPMAX);

  const mCnt = parseInt((hhMax - hhMin + 1) / hhStep);

  elSundialGrid.innerHTML = "";
  const elGridRow = document.createElement("div");
  elGridRow.classList.add("grid-row");
  elSundialGrid.appendChild(elGridRow);
  for (let hh = hhMin; hh <= hhMax; hh += hhStep) {
    const elColumnLabel = document.createElement("div");
    elColumnLabel.classList.add("grid-column-label");
    elColumnLabel.style.width = `${100 / mCnt}%`;
    elGridRow.appendChild(elColumnLabel);
    elColumnLabel.innerHTML = `000${hh}:00`.slice(-5);
  }

  for (let m = mMin; m <= mMax; m+=mStep) {
    const elGridRow = document.createElement("div");
    elGridRow.classList.add("grid-row");
    elSundialGrid.appendChild(elGridRow);

    const elRowLabel = document.createElement("div");
    elRowLabel.classList.add("grid-row-label");
    elGridRow.appendChild(elRowLabel);
    elRowLabel.innerHTML = `${MONTHS[m]}`;

    for (let hh = hhMin; hh <= hhMax; hh += hhStep) {
      const hh01 = (hh - hhMin) / (hhMax - hhMin);
      const pSel = hh01 * pSelRange + pSelMin;

      const elGridPlot = document.createElement("div");
      elGridPlot.classList.add("grid-plot");
      elGridPlot.style.width = `${100 / mCnt}%`;
      elGridRow.appendChild(elGridPlot);

      const out = computeAlphaBeta(y, m, d, hh, mm, poleH, latDeg, lonDeg, tzOffHr);
      if (!isFinite(out.alpha_rad) || !isFinite(out.beta_rad)) continue;

      const ta = Math.tan(out.alpha_rad);
      const tb = Math.tan(out.beta_rad);

      const nq = 180;
      const qVals = Array.from({ length: nq }, (_, i) => 0.001 + (0.998 * i) / (nq - 1));
      const zp = abarGrid(qVals, [pSel], ta, tb)[0];
      const qIdx = findClosestIdx(zp, abar);
      const qSel = qVals[qIdx];

      const clipPath = shadeClipPath(qSel, pSel, ta, tb);
      const leftArea = calculateLeftArea(qSel, pSel, ta, tb);
      const abarV = abarValue(qSel, pSel, ta, tb);

      if (Math.abs(leftArea - abarV) > 0.01) {
        console.log("OOPS. left area and abar value are DIFFERENT!");
      }

      if (Math.abs(leftArea - abar) > 0.05) {
        console.log(`Oops. Wanted ${abar}, but got ${leftArea}.`, y, m, d, hh, mm, poleH);
      }

      const elShape = document.createElement("div");
      elShape.classList.add("plot-shape");
      elShape.style.clipPath = `polygon(${clipPath})`;
      elShape.style.backgroundColor = elColorS.value;
      elGridPlot.style.backgroundColor = elColorL.value;

      if (hh > 11) {
        elShape.style.transform = "scaleX(-1)";
        // elShape.style.backgroundColor = elColorL.value;
        // elGridPlot.style.backgroundColor = elColorS.value;
      }
      elGridPlot.appendChild(elShape);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initial colors
  const styles = window.getComputedStyle(elSundialGrid);
  elColorL.value = styles.getPropertyValue("--color-light");
  elColorS.value = styles.getPropertyValue("--color-shade");

  elUpdateBtn.addEventListener("click", renderGrid);

  [
    elSundialCity,
    elSundialMonthMin,
    elSundialMonthMax,
    elSundialMonthStep,
    elSundialHourMin,
    elSundialHourMax,
    elSundialHourStep,
    elPselMin,
    elPselMax,
    elPole,
    elAbar,
  ].forEach(el => el.addEventListener("keydown", (evt) => evt.stopPropagation()));

  // Initial render
  setTimeout(renderGrid, 5);
});
