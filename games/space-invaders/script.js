const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('score-value');
const livesValue = document.getElementById('lives-value');
const waveValue = document.getElementById('wave-value');
const statusText = document.getElementById('status-text');
const modal = document.getElementById('message-modal');
const modalText = document.getElementById('message-text');
const modalClose = document.querySelector('.message-close');
const modalOk = document.getElementById('message-ok');

const BASE_WIDTH = 900;
const BASE_HEIGHT = 560;
const MAX_WAVES = 3;
const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * BASE_WIDTH,
    y: Math.random() * BASE_HEIGHT,
    r: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.8 + 0.2
}));

const keys = {};
let animationFrame = null;
let ship;
let bullets;
let enemyBullets;
let invaders;
let fleetDirection;
let fireCooldown;
let enemyFireCooldown;
let score;
let lives;
let wave;
let running;
let modalOpen;

function syncTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark', theme === 'dark');
}

function resizeCanvas() {
    const shell = document.querySelector('.canvas-shell');
    const availableWidth = shell.clientWidth - 28;
    const availableHeight = shell.clientHeight - 28;
    const scale = Math.min(availableWidth / BASE_WIDTH, availableHeight / BASE_HEIGHT);
    canvas.style.width = `${BASE_WIDTH * scale}px`;
    canvas.style.height = `${BASE_HEIGHT * scale}px`;
}

function makeShip() {
    return {
        x: BASE_WIDTH / 2,
        y: BASE_HEIGHT - 56,
        width: 44,
        height: 22,
        speed: 8
    };
}

function buildFleet(currentWave) {
    const rows = Math.min(5, 3 + currentWave);
    const cols = 10;
    const fleet = [];
    const startX = 96;
    const startY = 74;
    const gapX = 64;
    const gapY = 54;

    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            fleet.push({
                x: startX + col * gapX,
                y: startY + row * gapY,
                width: 34,
                height: 24,
                alive: true,
                row,
                col
            });
        }
    }

    return fleet;
}

function resetGame() {
    ship = makeShip();
    bullets = [];
    enemyBullets = [];
    invaders = buildFleet(1);
    fleetDirection = 1;
    fireCooldown = 0;
    enemyFireCooldown = 60;
    score = 0;
    lives = 3;
    wave = 1;
    running = true;
    modalOpen = false;
    closeModal();
    updateHud('Defend the line');
    cancelAnimationFrame(animationFrame);
    gameLoop();
}

function updateHud(status) {
    scoreValue.textContent = score;
    livesValue.textContent = lives;
    waveValue.textContent = `${wave} / ${MAX_WAVES}`;
    statusText.textContent = status;
}

function showModal(message) {
    running = false;
    modalOpen = true;
    modalText.textContent = message;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
}

function firePlayerBullet() {
    bullets.push({
        x: ship.x,
        y: ship.y - ship.height / 2,
        width: 4,
        height: 14,
        speed: 10
    });
    fireCooldown = 12;
}

function fireEnemyBullet() {
    const shooters = [];
    const alive = invaders.filter((invader) => invader.alive);
    const bottomByCol = new Map();

    alive.forEach((invader) => {
        const current = bottomByCol.get(invader.col);
        if (!current || invader.y > current.y) {
            bottomByCol.set(invader.col, invader);
        }
    });

    bottomByCol.forEach((value) => shooters.push(value));
    if (shooters.length === 0) {
        return;
    }

    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    enemyBullets.push({
        x: shooter.x,
        y: shooter.y + shooter.height / 2,
        width: 5,
        height: 14,
        speed: 4 + wave * 0.75
    });
}

function nextWave() {
    if (wave >= MAX_WAVES) {
        updateHud('Sector secured');
        showModal(`You cleared all ${MAX_WAVES} waves. Final score: ${score}.`);
        return;
    }

    wave += 1;
    bullets = [];
    enemyBullets = [];
    invaders = buildFleet(wave);
    fleetDirection = 1;
    enemyFireCooldown = Math.max(24, 60 - wave * 10);
    updateHud(`Wave ${wave} started`);
}

function loseLife() {
    lives -= 1;
    bullets = [];
    enemyBullets = [];
    ship = makeShip();

    if (lives <= 0) {
        updateHud('Defense collapsed');
        showModal(`Game over. Final score: ${score}.`);
        return;
    }

    updateHud('Ship hit, stabilize the line');
}

function rectsOverlap(a, b) {
    return a.x - a.width / 2 < b.x + b.width / 2 &&
        a.x + a.width / 2 > b.x - b.width / 2 &&
        a.y - a.height / 2 < b.y + b.height / 2 &&
        a.y + a.height / 2 > b.y - b.height / 2;
}

function update() {
    if (!running) {
        return;
    }

    if (keys.ArrowLeft || keys.KeyA) {
        ship.x = Math.max(ship.width / 2 + 12, ship.x - ship.speed);
    }

    if (keys.ArrowRight || keys.KeyD) {
        ship.x = Math.min(BASE_WIDTH - ship.width / 2 - 12, ship.x + ship.speed);
    }

    if ((keys.Space || keys.Spacebar) && fireCooldown <= 0) {
        firePlayerBullet();
    }

    if (fireCooldown > 0) {
        fireCooldown -= 1;
    }

    bullets.forEach((bullet) => {
        bullet.y -= bullet.speed;
    });
    bullets = bullets.filter((bullet) => bullet.y > -20);

    enemyBullets.forEach((bullet) => {
        bullet.y += bullet.speed;
    });
    enemyBullets = enemyBullets.filter((bullet) => bullet.y < BASE_HEIGHT + 20);

    const aliveInvaders = invaders.filter((invader) => invader.alive);
    const fleetSpeed = 1.1 + wave * 0.24 + (invaders.length - aliveInvaders.length) * 0.02;
    let hitEdge = false;

    aliveInvaders.forEach((invader) => {
        invader.x += fleetDirection * fleetSpeed;
        if (invader.x + invader.width / 2 >= BASE_WIDTH - 22 || invader.x - invader.width / 2 <= 22) {
            hitEdge = true;
        }
    });

    if (hitEdge) {
        fleetDirection *= -1;
        aliveInvaders.forEach((invader) => {
            invader.y += 24;
            if (invader.y + invader.height / 2 >= ship.y - 24) {
                updateHud('The fleet breached the city line');
                showModal(`The invasion reached the ground. Final score: ${score}.`);
            }
        });
    }

    enemyFireCooldown -= 1;
    if (enemyFireCooldown <= 0) {
        fireEnemyBullet();
        enemyFireCooldown = Math.max(18, 62 - wave * 12 - Math.floor(score / 90));
    }

    bullets.forEach((bullet) => {
        invaders.forEach((invader) => {
            if (!invader.alive) {
                return;
            }
            if (rectsOverlap(bullet, invader)) {
                invader.alive = false;
                bullet.y = -100;
                score += 10 + wave * 4;
                updateHud(`Wave ${wave} under pressure`);
            }
        });
    });

    enemyBullets.forEach((bullet) => {
        if (rectsOverlap(bullet, ship)) {
            bullet.y = BASE_HEIGHT + 100;
            loseLife();
        }
    });

    if (invaders.every((invader) => !invader.alive)) {
        nextWave();
    }
}

function drawBackground() {
    const isDark = document.body.classList.contains('dark');
    const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    gradient.addColorStop(0, isDark ? '#132445' : '#17315c');
    gradient.addColorStop(1, isDark ? '#040812' : '#071020');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    stars.forEach((star) => {
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = '#f7fbff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.fillStyle = '#7fdcff';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(20, 12);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 18);
    ctx.lineTo(-8, 8);
    ctx.lineTo(-20, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#dff6ff';
    ctx.fillRect(-6, 0, 12, 10);
    ctx.restore();
}

function drawInvaders() {
    invaders.forEach((invader) => {
        if (!invader.alive) {
            return;
        }
        ctx.save();
        ctx.translate(invader.x, invader.y);
        ctx.fillStyle = invader.row % 2 === 0 ? '#ff6f8f' : '#ffd166';
        ctx.fillRect(-16, -10, 32, 20);
        ctx.fillStyle = '#1b2336';
        ctx.fillRect(-10, -4, 6, 6);
        ctx.fillRect(4, -4, 6, 6);
        ctx.fillRect(-12, 8, 6, 8);
        ctx.fillRect(6, 8, 6, 8);
        ctx.restore();
    });
}

function drawBullets() {
    bullets.forEach((bullet) => {
        ctx.fillStyle = '#d6fbff';
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
    });

    enemyBullets.forEach((bullet) => {
        ctx.fillStyle = '#ff8b8b';
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
    });
}

function drawHudText() {
    ctx.fillStyle = 'rgba(235, 245, 255, 0.78)';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText(`Wave ${wave}`, 22, 28);
    ctx.fillText(`Score ${score}`, BASE_WIDTH - 118, 28);
}

function draw() {
    drawBackground();
    drawInvaders();
    drawShip();
    drawBullets();
    drawHudText();
}

function gameLoop() {
    syncTheme();
    update();
    draw();
    animationFrame = requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('storage', (event) => {
    if (event.key === 'theme') {
        syncTheme();
    }
});

document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
    if (event.key === 'Escape') {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

modalClose.addEventListener('click', resetGame);
modalOk.addEventListener('click', resetGame);
modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        resetGame();
    }
});

canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;
resizeCanvas();
syncTheme();
resetGame();
