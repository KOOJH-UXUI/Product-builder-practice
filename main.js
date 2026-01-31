const URL = "https://teachablemachine.withgoogle.com/models/Y1UzowJKE/";

let model;
let webcam;
let rafId;
let maxPredictions = 0;

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const webcamContainer = document.getElementById("webcam-container");
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
    resultDesc.textContent = "강아지/고양이 느낌이 비슷해요. 각도나 조명을 바꿔보세요.";
  }
};

const clearLabels = () => {
  labelContainer.innerHTML = "";
};

const createLabelRows = (classes) => {
  clearLabels();
  classes.forEach((item) => {
    const row = document.createElement("div");
    row.className = "label-row";

    const top = document.createElement("div");
    top.className = "label-top";

    const name = document.createElement("span");
    name.textContent = item.className;

    const value = document.createElement("span");
    value.textContent = "0%";

    top.appendChild(name);
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

const init = async () => {
  startBtn.disabled = true;
  setStatus("모델 로딩 중...");

  try {
    const modelURL = `${URL}model.json`;
    const metadataURL = `${URL}metadata.json`;

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    webcam = new tmImage.Webcam(320, 320, true);
    await webcam.setup();
    await webcam.play();

    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);

    createLabelRows(model.getClassLabels().map((label) => ({ className: label })));

    stopBtn.disabled = false;
    setStatus("분석 중 · 카메라가 켜졌어요.");

    const loop = async () => {
      webcam.update();
      await predict();
      rafId = window.requestAnimationFrame(loop);
    };

    loop();
  } catch (error) {
    console.error(error);
    setStatus("카메라 권한이 필요합니다. 브라우저 권한을 확인해 주세요.");
    startBtn.disabled = false;
  }
};

const predict = async () => {
  if (!model || !webcam) return;
  const prediction = await model.predict(webcam.canvas);
  updateLabelRows(prediction);

  const top = getTopResult(prediction);
  setResult(top.type, top.score);
};

const stop = () => {
  if (rafId) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (webcam) {
    webcam.stop();
    webcam = null;
  }
  stopBtn.disabled = true;
  startBtn.disabled = false;
  setStatus("중지됨 · 다시 시작할 수 있어요.");
  setResult("mixed", 0);
};

startBtn.addEventListener("click", init);
stopBtn.addEventListener("click", stop);
