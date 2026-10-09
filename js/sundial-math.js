// ----------------------------
// Fixed location: Fortaleza
// ----------------------------
const FORTALEZA = {
  NAME: "Fortaleza",
  IANA: "America/Fortaleza",
  LAT_DEG: -3.731862,  //  -3° 43' 54.70"
  LON_DEG: -38.526669, // -38° 31' 36.01"
  TZ_OFFSET_HOURS: -3.0, // Fortaleza (UTC-3)
};

const D_OBS = 3.0; // observer distance to pole (m)
const EYE_H = 1.5; // eye height (m)

const EPS = 1e-15;
const deg2rad = (d) => d * Math.PI / 180.0;
const rad2deg = (r) => r * 180.0 / Math.PI;

function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }

// ----------------------------
// Julian day (UTC Date -> float)
// ----------------------------
function julianDayUTC(dtUtc) {
  // dtUtc is a Date, interpreted in UTC via getUTC* getters.
  let year = dtUtc.getUTCFullYear();
  let month = dtUtc.getUTCMonth() + 1;
  const day = dtUtc.getUTCDate();
  const hour =
    dtUtc.getUTCHours() +
    dtUtc.getUTCMinutes() / 60 +
    dtUtc.getUTCSeconds() / 3600 +
    dtUtc.getUTCMilliseconds() / 3.6e6;

  if (month <= 2) { year -= 1; month += 12; }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  const JD0 = Math.floor(365.25 * (year + 4716))
            + Math.floor(30.6001 * (month + 1))
            + day + B - 1524.5;

  return JD0 + hour / 24.0;
}

// ----------------------------
// Solar azimuth/elevation (NOAA-style)
// Returns azimuth_deg (0=N,90=E,180=S,270=W) and elevation_deg
// ----------------------------
function solarAzElNoaa(localY, localM, localD, localHH, localMM, localSS, latDeg, lonDeg, tzOffsetHours) {
  // Build a UTC Date corresponding to the provided local time with fixed tz offset.
  // UTC = local - tzOffsetHours (since tzOffsetHours is negative for UTC-3, this adds 3h).
  const utcHour = localHH - tzOffsetHours;
  const dtUtc = new Date(Date.UTC(localY, localM - 1, localD, utcHour, localMM, localSS || 0, 0));

  const jd = julianDayUTC(dtUtc);
  const T = (jd - 2451545.0) / 36525.0;

  const L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360.0;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  const Mrad = deg2rad(M);
  const C =
    Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mrad) * 0.000289;

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambdaApp = trueLong - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));

  const eps0 = 23.0 + (26.0 + (21.448 - T * (46.815 + T * (0.00059 - 0.001813 * T))) / 60.0) / 60.0;
  const eps = eps0 + 0.00256 * Math.cos(deg2rad(omega));

  const epsRad = deg2rad(eps);
  const lamRad = deg2rad(lambdaApp);
  const decl = Math.asin(Math.sin(epsRad) * Math.sin(lamRad));

  const y = Math.pow(Math.tan(epsRad / 2.0), 2);
  const L0rad = deg2rad(L0);
  const eqTime = 4.0 * rad2deg(
    y * Math.sin(2 * L0rad) -
    2 * e * Math.sin(Mrad) +
    4 * e * y * Math.sin(Mrad) * Math.cos(2 * L0rad) -
    0.5 * y * y * Math.sin(4 * L0rad) -
    1.25 * e * e * Math.sin(2 * Mrad)
  );

  const minutes = localHH * 60.0 + localMM + (localSS || 0) / 60.0;
  const timeOffset = eqTime + 4.0 * lonDeg - 60.0 * tzOffsetHours;
  const tst = (minutes + timeOffset) % 1440.0;

  let ha = tst / 4.0 - 180.0;
  if (ha < -180.0) ha += 360.0;

  const latRad = deg2rad(latDeg);
  const haRad = deg2rad(ha);

  let cosZenith = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);
  cosZenith = clamp(cosZenith, -1.0, 1.0);
  const zenith = Math.acos(cosZenith);
  const elevation = 90.0 - rad2deg(zenith);

  const az = (rad2deg(Math.atan2(
    Math.sin(haRad),
    Math.cos(haRad) * Math.sin(latRad) - Math.tan(decl) * Math.cos(latRad)
  )) + 180.0) % 360.0;

  return { azimuth_deg: az, elevation_deg: elevation };
}

// ----------------------------
// alpha/beta model (same as Python)
// ----------------------------
function computeAlphaBeta(localY, localM, localD, localHH, localMM, hPole, latDeg=FORTALEZA.LAT_DEG, lonDeg=FORTALEZA.LON_DEG, tzOff=FORTALEZA.TZ_OFFSET_HOURS) {
  const { azimuth_deg: Adeg, elevation_deg: Edeg } =
    solarAzElNoaa(localY, localM, localD, localHH, localMM, 0, latDeg, lonDeg, tzOff);

  if (Edeg <= 0) {
    return {
      azimuth_deg: Adeg, elevation_deg: Edeg,
      alpha_rad: NaN, beta_rad: NaN, alpha_deg: NaN, beta_deg: NaN,
      shadow_length_m: NaN
    };
  }

  const A = deg2rad(Adeg);
  const E = deg2rad(Edeg);

  const x_east = Math.cos(E) * Math.sin(A);
  const z_up = Math.sin(E);

  const alpha = Math.atan2(z_up, Math.abs(x_east) + EPS);
  const beta = Math.atan(Math.abs(EYE_H * Math.cos(A)) / Math.abs(D_OBS * Math.sin(A)));

  const s = hPole / Math.tan(E);

  return {
    azimuth_deg: Adeg, elevation_deg: Edeg,
    alpha_rad: alpha, beta_rad: beta,
    alpha_deg: rad2deg(alpha), beta_deg: rad2deg(beta),
    shadow_length_m: s
  };
}

// ----------------------------
// Abar(q,p) and curve Abar=level
// ----------------------------
function abarValue(q, p, ta, tb) {
  const u = 1.0 - p;

  // Light
  const L_sem = 0.5 * q * (ta * q + 2.0 - u);
  const L_com = q - (u * u) / (8.0 * (ta + EPS));
  const L = (u >= 2.0 * ta * q) ? L_sem : L_com;

  // Shadow
  const S_ate = 0.5 * (1.0 - q) * (u - tb * (1.0 - q));
  const S_zero = (u * u) / (8.0 * (tb + EPS));
  const S = (u >= 2.0 * tb * (1.0 - q)) ? S_ate : S_zero;

  return L + S;
}

function abarGrid(qVals, pVals, ta, tb) {
  // z is array-of-arrays: rows correspond to p (y), cols correspond to q (x)
  const z = new Array(pVals.length);
  for (let i = 0; i < pVals.length; i++) {
    const p = pVals[i];
    const row = new Array(qVals.length);
    for (let j = 0; j < qVals.length; j++) {
      row[j] = abarValue(qVals[j], p, ta, tb);
    }
    z[i] = row;
  }
  return z;
}

function getUtcOffset(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);

  const offset = parts.find(p => p.type === "timeZoneName")?.value;

  if (offset === "GMT") return 0;

  const match = offset.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Could not parse offset: ${offset}`);

  const [, sign, hours, minutes] = match;

  return (
    (sign === '+' ? 1 : -1) *
    (Number(hours) * 60 + Number(minutes)) / 60
  );
}

const METEO_COORD_URL = "https://geocoding-api.open-meteo.com/v1/search";
async function getCityLatLon(cityName) {
  const params = {
    name: cityName,
    count: 10,
    language: "en",
    format: "json"
  };

  const queryString = new URLSearchParams(params).toString();
  const mRes = await fetch(`${METEO_COORD_URL}?${queryString}`);
  const cityData = await mRes.json();

  return {
    cityName: cityData?.results?.[0]?.name ?? FORTALEZA.NAME,
    latDeg: cityData?.results?.[0]?.latitude ?? FORTALEZA.LAT_DEG,
    lonDeg: cityData?.results?.[0]?.longitude ?? FORTALEZA.LON_DEG,
    tzOffHr: getUtcOffset(cityData?.results?.[0]?.timezone ?? FORTALEZA.IANA),
  }
}
