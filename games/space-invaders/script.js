const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Herní stav
let gameRunning = true;

// Nastavení velikosti canvas
const BASE_WIDTH = 600;
const BASE_HEIGHT = 400;
canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

// Škálování pro responzivnost - zachovat aspect ratio
const containerWidth = canvas.offsetWidth;
const containerHeight = canvas.offsetHeight;
const scaleX = containerWidth / BASE_WIDTH;
const scaleY = containerHeight / BASE_HEIGHT;
const scale = Math.min(scaleX, scaleY);
canvas.style.width = `${BASE_WIDTH * scale}px`;
canvas.style.height = `${BASE_HEIGHT * scale}px`;

// Message modal
const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const messageClose = document.getElementsByClassName('message-close')[0];
const messageOk = document.getElementById('message-ok');

function showMessage(text) {
    messageText.textContent = text;
    messageModal.style.display = 'block';
}

messageClose.onclick = function() {
    messageModal.style.display = 'none';
    location.reload();
};

messageOk.onclick = function() {
    messageModal.style.display = 'none';
    location.reload();
};

window.onclick = function(event) {
    if (event.target == messageModal) {
        messageModal.style.display = 'none';
        location.reload();
    }
};

// Loď
const ship = {
    x: BASE_WIDTH / 2 - 25,
    y: BASE_HEIGHT - 60,
    width: 50,
    height: 20,
    speed: 5,
    dx: 0
};

// Vetřelci
const invaders = [];
const invaderRows = 1;
const invaderCols = 10;
const invaderWidth = 30;
const invaderHeight = 20;
const invaderSpeed = 1;
let invaderDirection = 1; // 1 = doprava, -1 = doleva

// Inicializace vetřelců
for (let row = 0; row < invaderRows; row++) {
    for (let col = 0; col < invaderCols; col++) {
        invaders.push({
            x: col * (invaderWidth + 10) + 50,
            y: row * (invaderHeight + 10) + 50,
            width: invaderWidth,
            height: invaderHeight,
            alive: true
        });
    }
}

// Střely
const bullets = [];
const bulletSpeed = 7;

// Klávesy
const keys = {};
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Esc pro zavření modalu
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
});

// Funkce pro update
function update() {
    if (!gameRunning) return;
    // Pohyb lodi
    if (keys['ArrowLeft'] && ship.x > 0) {
        ship.x -= ship.speed;
    }
    if (keys['ArrowRight'] && ship.x < BASE_WIDTH - ship.width) {
        ship.x += ship.speed;
    }

    // Střelba
    if (keys['Space']) {
        bullets.push({
            x: ship.x + ship.width / 2 - 2,
            y: ship.y,
            width: 4,
            height: 10
        });
        keys['Space'] = false; // Zabránit opakovanému střelbě
    }

    // Pohyb střel
    bullets.forEach((bullet, index) => {
        bullet.y -= bulletSpeed;
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });

    // Pohyb vetřelců
    let moveDown = false;
    invaders.forEach(invader => {
        if (invader.alive) {
            invader.x += invaderDirection * invaderSpeed;
            if (invader.x <= 0 || invader.x + invader.width >= BASE_WIDTH) {
                moveDown = true;
            }
        }
    });
    if (moveDown) {
        invaderDirection *= -1;
        invaders.forEach(invader => {
            if (invader.alive) {
                invader.y += 30;
            }
        });
    }

    // Kolize střel s vetřelci
    bullets.forEach((bullet, bIndex) => {
        invaders.forEach((invader, iIndex) => {
            if (invader.alive &&
                bullet.x < invader.x + invader.width &&
                bullet.x + bullet.width > invader.x &&
                bullet.y < invader.y + invader.height &&
                bullet.y + bullet.height > invader.y) {
                invader.alive = false;
                bullets.splice(bIndex, 1);
            }
        });
    });

    // Kolize vetřelců s lodí
    invaders.forEach(invader => {
        if (invader.alive &&
            ship.x < invader.x + invader.width &&
            ship.x + ship.width > invader.x &&
            ship.y < invader.y + invader.height &&
            ship.y + ship.height > invader.y) {
            // Konec hry
            gameRunning = false;
            showMessage('Game Over!');
        }
    });

    // Kontrola vítězství
    if (invaders.every(invader => !invader.alive)) {
        gameRunning = false;
        showMessage('Vyhrál jsi!');
    }
}

// Funkce pro draw
function draw() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Loď
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(ship.x, ship.y, ship.width, ship.height);

    // Vetřelci
    ctx.fillStyle = '#ff6b6b';
    invaders.forEach(invader => {
        if (invader.alive) {
            ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
        }
    });

    // Střely
    ctx.fillStyle = '#ffd93d';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
