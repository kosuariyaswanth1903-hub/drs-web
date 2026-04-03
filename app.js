const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("status");
const speedText = document.getElementById("speed");

let trajectory = [];
let loopStarted = false;

// ✅ FIX 1: Added facingMode + error messages for mobile
async function startApp() {
  document.getElementById("startBtn").disabled = true;
  statusText.innerText = "Starting...";

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusText.innerText = "Camera not supported on this browser";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }, // ✅ uses back camera on mobile
        width:  { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    video.srcObject = stream;
    statusText.innerText = "Camera Started";

    canvas.width  = 640;
    canvas.height = 360;

  } catch (err) {
    document.getElementById("startBtn").disabled = false;

    if (err.name === "NotAllowedError") {
      statusText.innerText = "❌ Permission Denied — allow camera in browser settings";
    } else if (err.name === "NotFoundError") {
      statusText.innerText = "❌ No camera found on this device";
    } else if (err.name === "NotReadableError") {
      statusText.innerText = "❌ Camera in use by another app";
    } else {
      statusText.innerText = "❌ Error: " + err.name;
    }
    console.error(err);
  }
}

// ✅ FIX 3: Use 'canplay' instead of 'loadeddata' — more reliable on Android
video.addEventListener("canplay", () => {
  if (!loopStarted) {
    loopStarted = true;
    statusText.innerText = "Tracking...";
    loop();
  }
});

// 🎯 Ball Detection (bright pixels)
function detectBall() {
  // ✅ FIX 2: Canvas already has video drawn before this is called (see loop order)
  let frame;
  try {
    frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (e) {
    return null; // CORS safety
  }

  let sumX = 0, sumY = 0, count = 0;

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const i = (y * canvas.width + x) * 4;
      const r = frame.data[i];
      const g = frame.data[i + 1];
      const b = frame.data[i + 2];

      if (r > 200 && g > 200 && b > 200) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count === 0) return null;

  return {
    x: sumX / count,
    y: sumY / count,
    time: Date.now()
  };
}

// 🎯 Track Ball
function trackBall(ball) {
  trajectory.push(ball);
  if (trajectory.length > 30) trajectory.shift();
}

// ⚡ Speed Calculation
function calculateSpeed() {
  if (trajectory.length < 2) return 0;

  const p1 = trajectory[trajectory.length - 2];
  const p2 = trajectory[trajectory.length - 1];

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const time = (p2.time - p1.time) / 1000;

  if (time === 0) return 0;
  return Math.round((dist / time) * 0.1);
}

// 🖥️ Draw Trajectory + Ball Dot
function drawUI(ball) {
  if (trajectory.length > 1) {
    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    for (let i = 1; i < trajectory.length; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  }
}

// ✅ FIX 2: drawImage FIRST, then detect — correct order
function loop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // draw first

  const ball = detectBall(); // then read pixels

  if (ball) {
    statusText.innerText = "Ball Detected ✅";
    trackBall(ball);
  } else {
    statusText.innerText = "Tracking...";
  }

  speedText.innerText = calculateSpeed();
  drawUI(ball);

  requestAnimationFrame(loop);
}
