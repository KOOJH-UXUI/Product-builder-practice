const MODEL_URL = "https://teachablemachine.withgoogle.com/models/Y1UzowJKE/";

let model;
let classLabels = [];
let objectUrl = null;

const imageInput = document.getElementById("image-input");
const resetBtn = document.getElementById("reset-btn");
const imageContainer = document.getElementById("image-container");
const previewImage = document.getElementById("preview-image");
const labelContainer = document.getElementById("label-container");
const statusEl = document.getElementById("status");
const resultTitle = document.getElementById("result-title");
const resultDesc = document.getElementById("result-desc");
const resultEmoji = document.getElementById("result-emoji");

const setStatus = (text) => {
  statusEl.textContent = text;
};

const setResult = (type, score) => {
  document.body.classList.remove("dog", "cat");

  if (type === "dog") {
    document.body.classList.add("dog");
    resultEmoji.textContent = "🐶";
    resultTitle.textContent = "강아지상 확률 높음!";
    resultDesc.textContent = `부드럽고 친근한 인상이 강해요 · 확률 ${(score * 100).toFixed(1)}%`;
  } else if (type === "cat") {
    document.body.classList.add("cat");
    resultEmoji.textContent = "🐱";
    resultTitle.textContent = "고양이상 확률 높음!";
    resultDesc.textContent = `차분하고 또렷한 인상이 돋보여요 · 확률 ${(score * 100).toFixed(1)}%`;
  } else {
    resultEmoji.textContent = "✨";
    resultTitle.textContent = "믹스 매력형";
    resultDesc.textContent = "강아지/고양이 느낌이 비슷해요. 다른 사진도 시도해 보세요.";
  }
};

const clearLabels = () => {
  labelContainer.innerHTML = "";
};

const createLabelRows = (classes) => {
  clearLabels();
  classes.forEach((name) => {
    const row = document.createElement("div");
    row.className = "label-row";

    const top = document.createElement("div");
    top.className = "label-top";

    const label = document.createElement("span");
    label.textContent = name;

    const value = document.createElement("span");
    value.textContent = "0%";

    top.appendChild(label);
    top.appendChild(value);

    const bar = document.createElement("div");
    bar.className = "progress";
    const fill = document.createElement("span");
    bar.appendChild(fill);

    row.appendChild(top);
    row.appendChild(bar);

    labelContainer.appendChild(row);
  });
};

const resetLabelRows = () => {
  const rows = labelContainer.querySelectorAll(".label-row");
  rows.forEach((row) => {
    row.querySelector(".label-top span:last-child").textContent = "0%";
    row.querySelector(".progress span").style.width = "0%";
  });
};

const updateLabelRows = (predictions) => {
  const rows = labelContainer.querySelectorAll(".label-row");
  predictions.forEach((pred, index) => {
    const row = rows[index];
    if (!row) return;
    const percent = Math.round(pred.probability * 100);
    row.querySelector(".label-top span:last-child").textContent = `${percent}%`;
    row.querySelector(".progress span").style.width = `${percent}%`;
  });
};

const getTopResult = (predictions) => {
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
  if (sorted.length < 2) {
    return { type: sorted[0]?.className ?? "mixed", score: sorted[0]?.probability ?? 0 };
  }

  const top = sorted[0];
  const second = sorted[1];
  const isMixed = top.probability < 0.6 || top.probability - second.probability < 0.12;

  if (isMixed) return { type: "mixed", score: top.probability };

  const name = top.className.toLowerCase();
  const isDog = name.includes("dog") || name.includes("강아지");
  return { type: isDog ? "dog" : "cat", score: top.probability };
};

const loadModel = async () => {
  if (model) return;

  setStatus("모델 로딩 중...");
  const modelURL = `${MODEL_URL}model.json`;
  const metadataURL = `${MODEL_URL}metadata.json`;

  model = await tmImage.load(modelURL, metadataURL);
  classLabels = model.getClassLabels();
  createLabelRows(classLabels);
  setStatus("사진을 업로드해 주세요.");
};

const setPreview = (file) => {
  if (objectUrl) {
    window.URL.revokeObjectURL(objectUrl);
  }
  objectUrl = window.URL.createObjectURL(file);
  previewImage.src = objectUrl;
  imageContainer.classList.add("has-image");
};

const handleImage = async (file) => {
  if (!file) return;
  await loadModel();
  setStatus("이미지 로딩 중...");

  previewImage.onload = null;
  previewImage.onerror = null;
  previewImage.onload = async () => {
    try {
      setStatus("분석 중...");
      const prediction = await model.predict(previewImage);
      updateLabelRows(prediction);
      const top = getTopResult(prediction);
      setResult(top.type, top.score);
      setStatus("완료 · 다른 사진도 업로드할 수 있어요.");
    } catch (error) {
      console.error(error);
      setStatus("이미지를 처리할 수 없어요. 다른 파일을 선택해 주세요.");
    }
  };
  previewImage.onerror = () => {
    setStatus("이미지를 불러오지 못했어요. 다른 파일을 선택해 주세요.");
  };

  setPreview(file);
};

const resetUI = () => {
  if (objectUrl) {
    window.URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  previewImage.removeAttribute("src");
  imageContainer.classList.remove("has-image");
  imageInput.value = "";
  resetLabelRows();
  setResult("mixed", 0);
  setStatus("사진을 업로드해 주세요.");
};

imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  handleImage(file).catch((error) => {
    console.error(error);
    setStatus("이미지를 처리할 수 없어요. 다른 파일을 선택해 주세요.");
  });
});

resetBtn.addEventListener("click", resetUI);

loadModel().catch((error) => {
  console.error(error);
  setStatus("모델을 불러오지 못했습니다. 새로고침해 주세요.");
});
