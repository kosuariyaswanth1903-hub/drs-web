const video = document.getElementById("video");
const result = document.getElementById("result");
const canvas = document.getElementById("overlay");

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

// ✅ FIX 1: Mobile needs facingMode + proper error messages
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",   // front camera for face recognition
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        video.srcObject = stream;

        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        result.innerText = "✅ Camera ready. Loading models...";

    } catch (err) {
        // ✅ Show exact error so you know what's wrong
        if (err.name === "NotAllowedError") {
            result.innerText = "❌ Camera blocked — tap the 🔒 lock icon and allow camera";
        } else if (err.name === "NotFoundError") {
            result.innerText = "❌ No camera found on this device";
        } else if (err.name === "NotReadableError") {
            result.innerText = "❌ Camera is being used by another app";
        } else {
            result.innerText = "❌ Camera error: " + err.name;
        }
        console.error(err);
    }
}

// LOAD MODELS FROM CDN
async function loadModels() {
    result.innerText = "⏳ Loading model 1/3...";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

    result.innerText = "⏳ Loading model 2/3...";
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    result.innerText = "⏳ Loading model 3/3...";
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    result.innerText = "✅ Models loaded!";
}

// LOAD STUDENT FACES
async function loadStudentFaces() {
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

    return labeledDescriptors;
}

// FACE RECOGNITION LOOP
async function startRecognition() {
    const labeledDescriptors = await loadStudentFaces();

    if (labeledDescriptors.length === 0) {
        result.innerText = "❌ No reference faces loaded. Check student photos.";
        return;
    }

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    result.innerText = `✅ System ready (${labeledDescriptors.length} students). Look at the camera.`;

    const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.3
    });

    setInterval(async () => {
        if (video.readyState < 2 || video.paused) return;

        const size = {
            width: video.videoWidth || 640,
            height: video.videoHeight || 480
        };
        faceapi.matchDimensions(canvas, size);

        const detections = await faceapi
            .detectAllFaces(video, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, size);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections.length === 0) {
            result.innerText = "👀 No face detected";
            return;
        }

        faceapi.draw.drawDetections(canvas, resized);

        const names = detections.map(d => {
            const match = faceMatcher.findBestMatch(d.descriptor);
            return match.label !== "unknown"
                ? `✅ ${match.label} — DCME-B`
                : "❌ Unknown face";
        });

        result.innerText = names.join("  |  ");

    }, 700);
}

// ✅ FIX 2: Don't auto-run on page load — wait for button click
// Your HTML already has: <button onclick="startApp()">Start Camera</button>
// So we just define startApp() here instead of calling init() automatically

async function startApp() {
    const btn = document.getElementById("startBtn");
    if (btn) btn.disabled = true;  // prevent double-tap

    await startCamera();

    // Only continue if camera actually started
    if (!video.srcObject) return;

    await loadModels();
    startRecognition();
}

// ✅ REMOVED: init() — no longer auto-starts on page load
