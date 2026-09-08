const canvas = document.getElementById("glCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const gl = canvas.getContext("webgl");
if (!gl) alert("WebGL not supported");

// Overlay for game over
const overlay = document.createElement("div");
overlay.style.position = "absolute";
overlay.style.top = "50%";
overlay.style.left = "50%";
overlay.style.transform = "translate(-50%, -50%)";
overlay.style.fontSize = "3em";
overlay.style.fontFamily = "monospace";
overlay.style.color = "white";
overlay.style.background = "rgba(0,0,0,0.6)";
overlay.style.padding = "20px 40px";
overlay.style.borderRadius = "12px";
overlay.style.display = "none";
overlay.style.zIndex = 1000;
overlay.innerText = "JACKED! PRESS SPACE TO CONTINUE";
document.body.appendChild(overlay);

// Scoreboard
const scoreboard = document.createElement("div");
scoreboard.style.position = "absolute";
scoreboard.style.top = "20px";
scoreboard.style.left = "20px";
scoreboard.style.color = "white";
scoreboard.style.fontFamily = "monospace";
scoreboard.style.fontSize = "1.5em";
scoreboard.style.background = "rgba(0, 0, 0, 0.4)";
scoreboard.style.padding = "10px 20px";
scoreboard.style.borderRadius = "10px";
scoreboard.style.zIndex = 1000;
document.body.appendChild(scoreboard);

gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

// Shaders
const vertexShaderSrc = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;
const fragmentShaderSrc = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
  }
`;
function createShader(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}
const vertexShader   = createShader(gl.VERTEX_SHADER,   vertexShaderSrc);
const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const posLoc = gl.getAttribLocation(program, "a_position");
const colLoc = gl.getUniformLocation(program, "u_color");
const buf    = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

// draw a filled star with TRIANGLE_FAN
function drawStar(cx, cy, outerR, innerR, color, spikes = 5) {
  const verts = [cx, cy];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2 + 1; i++) {
    const r = (i % 2 === 0 ? outerR : innerR);
    const theta = i * step - Math.PI / 2;
    verts.push(cx + Math.cos(theta) * r, cy + Math.sin(theta) * r);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  gl.uniform4fv(colLoc, color);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, spikes * 2 + 2);
}

// Draw a rectangle (ground, clouds, dino, obstacles)
function drawRect(x, y, w, h, color) {
  const verts = new Float32Array([
    x,     y,
    x + w, y,
    x + w, y + h,
    x,     y,
    x + w, y + h,
    x,     y + h
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  gl.uniform4fv(colLoc, color);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Draw a cloud as 3 overlapping rectangles
function drawCloud(cx, cy, color) {
  drawRect(cx - 0.05,      cy,        0.10, 0.05, color);
  drawRect(cx - 0.08,      cy + 0.02, 0.07, 0.04, color);
  drawRect(cx + 0.03,      cy + 0.02, 0.07, 0.04, color);
}

// Game state
let dinoY        = -0.7;
let isJumping    = false;
let jumpVelocity = 0;
let jumpCount    = 0;
let highScore    = 0;
let gameOver     = false;
let day          = true;

// Separate arrays for clouds (few) and stars (many)
const NUM_CLOUDS = 15;
const NUM_STARS = 80;

let clouds = Array.from({ length: NUM_CLOUDS }, () => ({
  x: Math.random() * 2 - 1,
  y: Math.random() * 1 + 0.2,
  speed: Math.random() * 0.002 + 0.0008
}));

let stars = Array.from({ length: NUM_STARS }, () => ({
  x: Math.random() * 2 - 1,
  y: Math.random() * 1 + 0.2,
  speed: Math.random() * 0.001 + 0.0005,
  size: Math.random() * 0.008 + 0.004
}));

let obstacles = [];
let lastObstacleTime = 0;

// Draw clouds or star‑shaped stars
function drawSkyElements() {
  if (day) {
    const cloudColor = [1, 1, 1, 1];
    clouds.forEach(el => {
      el.x -= el.speed;
      if (el.x < -1.2) el.x = 1.2;
      drawCloud(el.x, el.y, cloudColor);
    });
  } else {
    const starColor = [1, 1, 1, 1];
    stars.forEach(el => {
      el.x -= el.speed;
      if (el.x < -1.2) el.x = 1.2;
      drawStar(el.x, el.y + 0.3, el.size, el.size / 2, starColor, 5);
    });
  }
}

function drawGround() {
  drawRect(-1, -0.85, 2, 0.15, [0.3, 0.3, 0.3, 1]);
}

function drawDino() {
  // Body & head
  drawRect(-0.8, dinoY,         0.10, 0.15, [0.1, 0.7, 0.2, 1]);
  drawRect(-0.75, dinoY + 0.13, 0.03, 0.05, [0.1, 0.7, 0.2, 1]);
  drawRect(-0.79, dinoY,        0.015, 0.04, [0.1, 0.5, 0.1, 1]);
  drawRect(-0.765, dinoY,       0.015, 0.04, [0.1, 0.5, 0.1, 1]);
  // Legs
  const legColor = [0.1, 0.5, 0.1, 1];
  drawRect(-0.78, dinoY - 0.06, 0.02, 0.06, legColor);
  drawRect(-0.76, dinoY - 0.06, 0.02, 0.06, legColor);
}

function drawObstacles() {
  obstacles.forEach(o => drawRect(o.x, o.y, o.width, o.height, o.color));
}

function spawnObstacle() {
  const now = Date.now();
  if (now - lastObstacleTime > 1500) {
    lastObstacleTime = now;
    if (Math.random() < 0.7) {
      const w = 0.05 + Math.random() * 0.05;
      const h = 0.1 + Math.random() * 0.1;
      obstacles.push({ x: 1.2, y: -0.7, width: w, height: h, color: [0.7, 0.1, 0.1, 1] });
    } else {
      const y = -0.3 + Math.random() * 0.5;
      obstacles.push({ x: 1.2, y, width: 0.08, height: 0.03, color: [1, 1, 0, 1] });
    }
  }
}

function updateObstacles() {
  const speed = day ? 0.01 : 0.015;
  obstacles.forEach(o => o.x -= speed);
  obstacles = obstacles.filter(o => o.x + o.width > -1.2);
}

function checkCollision() {
  for (let o of obstacles) {
    const right = -0.8 + 0.1;
    if (right > o.x && -0.8 < o.x + o.width &&
        dinoY < o.y + o.height && dinoY + 0.15 > o.y) {
      gameOver = true;
      overlay.style.display = "block";
      return;
    }
  }
}

function drawScore() {
  const txt = `Jumps: ${jumpCount} | High Score: ${highScore}`;
  document.title      = gameOver ? "JACKED! PRESS SPACE TO CONTINUE" : txt;
  scoreboard.innerText = txt;
}

function render() {
  gl.clearColor(day ? 0.53 : 0.05, day ? 0.81 : 0.05, day ? 0.92 : 0.2, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  drawSkyElements();
  drawGround();
  drawDino();
  drawObstacles();
  drawScore();
  requestAnimationFrame(render);
}

function update() {
  if (gameOver) return;
  if (isJumping) {
    dinoY += jumpVelocity;
    jumpVelocity -= 0.0018;
    if (dinoY <= -0.7) {
      dinoY = -0.7;
      isJumping = false;
    }
  }
  day = jumpCount < 6;  // transition to night after 6 jumps
  updateObstacles();
  spawnObstacle();
  checkCollision();
  setTimeout(update, 16);
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    if (gameOver) {
      overlay.style.display = "none";
      obstacles = [];
      jumpCount = 0;
      highScore = 0;
      dinoY = -0.7;
      jumpVelocity = 0;
      isJumping = false;
      gameOver = false;
      update();
    } else if (!isJumping) {
      isJumping    = true;
      jumpVelocity = 0.03;
      jumpCount++;
      if (jumpCount > highScore) highScore = jumpCount;
    }
  }
});

update();
render();
