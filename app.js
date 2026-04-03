const video = document.getElementById("video");
const result = document.getElementById("result");
const canvas = document.getElementById("overlay");

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

async function startApp() {
  // Disable button to prevent double tap
  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  btn.innerText = "Loading...";

  result.innerText = "🎥 Starting camera...";

  // STEP 1: Start Camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    video.srcObject = stream;

    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    result.innerText = "✅ Camera ready! Loading AI models...";

  } catch (err) {
    btn.disabled = false;
    btn.innerText = "▶ Start Camera";

    if (err.name === "NotAllowedError") {
      result.innerText = "❌ Camera blocked! Tap the 🔒 lock icon in address bar → allow camera → refresh";
    } else if (err.name === "NotFoundError") {
      result.innerText = "❌ No camera found on this device";
    } else if (err.name === "NotReadableError") {
      result.innerText = "❌ Camera busy — close other apps using camera";
    } else {
      result.innerText = "❌ Camera error: " + err.name + " — " + err.message;
    }
    return; // stop here if camera failed
  }

  // STEP 2: Load AI Models
  try {
    result.innerText = "⏳ Loading model 1/3...";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

    result.innerText = "⏳ Loading model 2/3...";
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    result.innerText = "⏳ Loading model 3/3...";
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    result.innerText = "✅ Models loaded! Loading student faces...";

  } catch (err) {
    result.innerText = "❌ Model loading failed: " + err.message;
    return;
  }

  // STEP 3: Load Student Faces
  const labels = ["yash", "nikhil", "charan"];
  const labeledDescriptors = [];

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.3
  });

  for (const label of labels) {
    result.innerText = `⏳ Loading face: ${label}...`;
    try {
      const img = await faceapi.fetchImage(`./students/${label}.jpg`);
      const detection = await faceapi
        .detectSingleFace(img, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.warn(`⚠️ No face found in ${label}.jpg`);
        continue;
      }

      labeledDescriptors.push(
        new faceapi.LabeledFaceDescriptors(label, [detection.descriptor])
      );
      console.log(`✅ Loaded: ${label}`);

    } catch (err) {
      console.error(`❌ Error loading ${label}.jpg:`, err);
    }
  }

  if (labeledDescriptors.length === 0) {
    result.innerText = "❌ No student faces loaded! Check your /students folder has yash.jpg, nikhil.jpg, charan.jpg";
    return;
  }

  // STEP 4: Start Recognition Loop
  const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
  result.innerText = `✅ Ready! Recognising ${labeledDescriptors.length} students...`;

  btn.innerText = "✅ Running";

  setInterval(async () => {
    if (video.readyState < 2 || video.paused) return;

    const size = {
      width: video.videoWidth || 640,
      height: video.videoHeight || 480
    };
    faceapi.matchDimensions(canvas, size);

    const detections = await faceapi
      .detectAllFaces(video, options)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) {
      result.innerText = "👀 No face detected — look at the camera";
      return;
    }

    const resized = faceapi.resizeResults(detections, size);
    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);

    const names = detections.map(d => {
      const match = faceMatcher.findBestMatch(d.descriptor);
      return match.label !== "unknown"
        ? `✅ ${match.label} — DCME-B`
        : "❌ Unknown face";
    });

    result.innerText = names.join("  |  ");

  }, 700);
          }
