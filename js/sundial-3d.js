import * as THREE from "https://esm.sh/three@0.161.0";
import { OrbitControls } from "https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js";

//////// Fortaleza
const $ = (id) => document.getElementById(id);
const UI = {
  date: $("sundial-3d-date"),
  time: $("sundial-3d-time"),
  pole: $("sundial-3d-pole"),
  // outAz: $("outAz"),
  // outEl: $("outEl"),
  // outLen: $("outLen"),
};

//////// UI Helpers
function todayStr(utcOffset) {
  const utc = Date.now() + (utcOffset * 60 * 60 * 1000);
  const utcStr = (new Date(utc)).toISOString();
  return utcStr.split("T")[0];
}

function nowTime(utcOffset) {
  const utc = Date.now() + (utcOffset * 60 * 60 * 1000);
  const utcStr = (new Date(utc)).toISOString().split("T")[1].split(":");
  return `${utcStr[0]}:${utcStr[1]}`;
}
UI.date.value = todayStr(FORTALEZA.TZ_OFFSET_HOURS);
UI.time.value = nowTime(FORTALEZA.TZ_OFFSET_HOURS);

function readLocalParts() {
  const d = UI.date.value ? UI.date.value : todayStr(FORTALEZA.TZ_OFFSET_HOURS);
  const [Y, M, D] = d.split("-").map(n => parseInt(n));
  const [hh, mm] = (UI.time.value || "12:00").split(":").map(n => parseInt(n));
  return { Y, M, D, hh, mm };
}

//////// 3D Scene
const canvas = document.getElementById("sundial-3d-renderer");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 16/9, 0.1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);

renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
scene.background = new THREE.Color(0x0a0f15);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

function resize(){
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = parseInt(0.4 * w);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function resetCamera() {
  const r = 8;
  const h = parseFloat(UI.pole.value) || 1;
  const theta = Math.PI;
  const phi = Math.PI / 6;

  camera.position.set(
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.sin(phi),
    r * Math.cos(theta) * Math.cos(phi)
  );

  camera.lookAt(0, 0.5 * h, 0);
  controls.target.set(0, 0.5 * h, 0);
}

//////// 3D Objects
function createLabel(text, color, pos, rot) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const size = 256;
  canvas.width = size;
  canvas.height = size;

  context.fillStyle = "#ffffff00";
  context.fillRect(0, 0, size, size);
  context.font = "Bold 16px Cera";
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needs
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const plane = new THREE.Mesh(geometry, material);
  plane.rotateX(-Math.PI / 2);
  plane.rotateZ(rot);
  plane.position.set(pos.x, pos.y, pos.z);
  return plane;
}

const GND = new THREE.GridHelper(200, 40, 0x223b55, 0x0f1b28);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.7);

const axS = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.01, 0), 3, 0x6aa5ff, 0.2, 0.1);
const axE = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.01, 0), 3, 0x89c46a, 0.2, 0.1);
const sunArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.01, 0), 3, 0xffe28a, 0.2, 0.1); // direção da LUZ

const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.6 });
const shadowMat = new THREE.LineBasicMaterial({ color: 0xff4d4d, depthTest: false });

let pole = null;
let shadow = null;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
scene.add(GND);
scene.add(axS);
scene.add(axE);
scene.add(sunLight);
scene.add(sunArrow);
scene.add(createLabel("SOUTH", "#6aa5ff", new THREE.Vector3(-0.15, 0, 1.5), -Math.PI / 2));
scene.add(createLabel("EAST", "#89c46a", new THREE.Vector3(1.5, 0 , -0.15), 0));

function setPole(h) {
  if (pole) scene.remove(pole);
  const geo = new THREE.CylinderGeometry(0.03, 0.03, h, 8);
  pole = new THREE.Mesh(geo, poleMat);
  pole.position.y = h / 2;
  scene.add(pole);
}

function setShadow(len, bearingDeg){
  if (shadow) { scene.remove(shadow); shadow.geometry.dispose(); }
  if (!isFinite(len) || len <= 0) { shadow = null; return; }

  const dirX = Math.sin(bearingDeg * Math.PI / 180);
  const dirZ = -Math.cos(bearingDeg * Math.PI / 180);
  const y = 0.01; // offset para evitar z-fighting
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute([0, y, 0, dirX*len, y, dirZ*len], 3));
  shadow = new THREE.Line(geom, shadowMat);
  shadow.renderOrder = 999;
  scene.add(shadow);
}

//////// Main Function
function update() {
  const h = parseFloat(UI.pole.value) || 1;
  setPole(h);

  const { Y, M, D, hh, mm } = readLocalParts();
  const sp = solarAzElNoaa(Y, M, D, hh, mm, 0, FORTALEZA.LAT_DEG, FORTALEZA.LON_DEG, FORTALEZA.TZ_OFFSET_HOURS);

  const elR = sp.elevation_deg * Math.PI / 180;
  const azR = sp.azimuth_deg * Math.PI / 180;
  const L = h / Math.tan(elR);

  // vetor Sol->poste (geométrico)
  const sx = Math.sin(azR) * Math.cos(elR);
  const sy = Math.sin(elR);
  const sz = -Math.cos(azR) * Math.cos(elR); // Z- é Norte

  // direção da LUZ (Sol→chão) é o inverso desse vetor
  const lx = -sx, ly = -sy, lz = -sz;
  const ll = Math.hypot(L, h);

  sunLight.position.set(sx * 50, sy * 50, sz * 50);
  sunArrow.setDirection(new THREE.Vector3(lx, ly, lz).normalize());
  sunArrow.setLength(ll, 0.2, 0.1);
  sunArrow.position.set(0, h + 0.05, 0);

  // UI.outAz.textContent = `${sp.azimuth_deg.toFixed(2)}°`;
  // UI.outEl.textContent = `${sp.elevation_deg.toFixed(2)}°`;
  // UI.outLen.textContent = `${L.toFixed(2)} m`;

  if (sp.elevation_deg <= 0) {
    setShadow(0, 0);
    // UI.outEl.textContent += " (sem Sol)";
    // UI.outLen.textContent = "—";
  } else {
    const bearing = (sp.azimuth_deg + 180) % 360; // azimute da sombra
    setShadow(L, bearing);    
  }
}

//////// Loop for camera/control updates
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

//////// Events
window.addEventListener("resize", resize);
[UI.date, UI.time, UI.pole].forEach(el => el.addEventListener("keydown", (evt) => evt.stopPropagation()));
["input", "change"].forEach(ev => { [UI.date, UI.time, UI.pole].forEach(el => el.addEventListener(ev, update)) });

//////// Init
resize();
resetCamera();
update();
animate();

//////// Checks
// (1) Three carregado
console.assert(!!THREE && !!THREE.Scene, "THREE not loaded");
// (2) OrbitControls disponível
console.assert(typeof OrbitControls === "function", "OrbitControls not loaded");
