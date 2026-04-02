const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("status");
const speedText = document.getElementById("speed");

let trajectory = [];

// 🎥 Start Camera
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });
    video.srcObject = stream;
    statusText.innerText = "Camera Started";
  } catch (err) {
    statusText.innerText = "Camera Error";
    console.error(err);
  }
}

// 🎯 Improved Ball Detection (center scan for performance)
function detectBall() {
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let foundPoints = [];

  // scan every few pixels (performance boost)
  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const i = (y * canvas.width + x) * 4;

      const r = frame.data[i];
      const g = frame.data[i + 1];
      const b = frame.data[i + 2];

      // detect bright/white ball
      if (r > 200 && g > 200 && b > 200) {
        foundPoints.push({ x, y });
      }
    }
  }

  if (foundPoints.length === 0) return null;

  // average position (center of detected area)
  let avgX = 0;
  let avgY = 0;

  foundPoints.forEach(p => {
    avgX += p.x;
    avgY += p.y;
  });

  avgX /= foundPoints.length;
  avgY /= foundPoints.length;

  return {
    x: avgX,
    y: avgY,
    time: Date.now()
  };
}

// 🎯 Track Ball
function trackBall(ball) {
  trajectory.push(ball);

  if (trajectory.length > 30) {
    trajectory.shift();
  }
}

// ⚡ Speed Calculation
function calculateSpeed() {
  if (trajectory.length < 2) return 0;

  const p1 = trajectory[trajectory.length - 2];
  const p2 = trajectory[trajectory.length - 1];

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const distance = Math.sqrt(dx * dx + dy * dy);
  const time = (p2.time - p1.time) / 1000;

  if (time === 0) return 0;

  let speed = distance / time;

  // scaling factor (tune later)
  return Math.round(speed * 0.1);
}

// 🖥️ Draw UI
function drawUI(ball) {
  // draw trajectory line
  ctx.beginPath();
  for (let i = 0; i < trajectory.length; i++) {
    const p = trajectory[i;
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 2;
  ctx.stroke();

  // draw ball point
  if (ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  }
}

// 🔄 Main Loop
function loop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const ball = detectBall();

  if (ball) {
    statusText.innerText = "Ball Detected";
    trackBall(ball);
  } else {
    statusText.innerText = "Tracking...";
  }

  const speed = calculateSpeed();
  speedText.innerText = speed;

  drawUI(ball);

  requestAnimationFrame(loop);
}

// 🚀 Start App
startCamera();

video.addEventListener("loadeddata", () => {
  loop();
});
