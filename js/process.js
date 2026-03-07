---
---
const SUBTITLES_URL = "{{ 'assets/data/process_subtitles.json' | relative_url }}";

const images = [];

let selectedProcessImage;

function clearSelectedProcessImage() {
  const infoEl = document.getElementById("process-image-info");
  const boxesEl = selectedProcessImage.querySelector(".image-boxes");
  selectedProcessImage.classList.remove("selected");
  infoEl.classList.remove("show");
  boxesEl.innerHTML = "";
  setTimeout(() => infoEl.innerHTML = "", 100);
  setTimeout(() => {
    selectedProcessImage.scrollIntoView({ behavior: "smooth" });
    selectedProcessImage = null;
  }, 240);
}

function handleProcessImageClick(evt) {
  const infoEl = document.getElementById("process-image-info");

  if (selectedProcessImage) {
    clearSelectedProcessImage();
  };

  if (evt.currentTarget != selectedProcessImage) {
    const cTarget = evt.currentTarget;
    setTimeout(() => {
      selectedProcessImage = cTarget;
      const img = images.find(s => s.id == selectedProcessImage.dataset.id);
      if (!img) return;
      infoEl.innerHTML = "";
      infoEl.appendChild(createSubtitleEl(img));
      infoEl.classList.add("show");
      selectedProcessImage.classList.add("selected");
      selectedProcessImage.scrollIntoView({ behavior: "smooth" });
    }, 260);
  }
}

function createProcessImageEl(img) {
  const base = "{{ 'assets/images/process' | relative_url }}"
  const imgSrc = `${base}/${img.id}.jpg`;

  const imgWrapperEl = document.createElement("div");
  imgWrapperEl.classList.add("image-wrapper");

  const imgEl = document.createElement("img");
  imgEl.classList.add("image");
  imgEl.dataset.src = imgSrc;

  const imgBoxEl = document.createElement("div");
  imgBoxEl.classList.add("image-boxes");

  imgWrapperEl.appendChild(imgEl);
  imgWrapperEl.appendChild(imgBoxEl);
  return imgWrapperEl;
}

function createSubtitleEl(img) {
  const infoEl = document.createElement("div");
  infoEl.classList.add("info-wrapper");
  infoEl.innerHTML = `${img.text}`;
  return infoEl;
}

function loadProcessImages(images) {
  const tableEl = document.getElementById("process-table");

  const rowObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        let mEl = entry.target;
        mEl.querySelectorAll("img").forEach(imgEl => imgEl.src = imgEl.dataset.src);
        rowObserver.unobserve(mEl);
      }
    });
  });

  images.forEach((img, idx) => {
    const itemEl = document.createElement("div");
    itemEl.classList.add("item-container", `col-${idx % 6}`);
    itemEl.dataset.id = img.id;

    const imgEl = createProcessImageEl(img);
    if (idx < 24) imgEl.src = imgEl.dataset.src;
    itemEl.appendChild(imgEl);
    itemEl.addEventListener("click", handleProcessImageClick);

    tableEl.appendChild(itemEl);
    rowObserver.observe(itemEl);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  Promise.all([
    fetchJson(SUBTITLES_URL),
  ]).then(data => {

    const shuffled = data[0].toSorted(() => 0.5 - Math.random());
    Object.assign(images, shuffled);

    loadProcessImages(images);
  });
});
