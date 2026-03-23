const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Herní stav
let gameRunning = true;

// Nastavení velikosti canvas
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

// Škálování pro responzivnost - zachovat aspect ratio
const container = document.getElementById('game');
const containerWidth = container.offsetWidth;
const containerHeight = container.offsetHeight;
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

// Klávesy
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    e.preventDefault(); // Zabránit scrollování
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Esc pro zavření modalu
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
});

// Rocket třída
class Rocket {
    constructor() {
        this.x = BASE_WIDTH / 2;
        this.y = BASE_HEIGHT - 80;
        this.width = 40;
        this.height = 60;
        this.speed = 8;
        this.velocity = 3.0;
        this.minVelocity = 0.3;
        this.maxVelocity = 15.0;
    }

    move() {
        if (keys['ArrowLeft']) {
            this.x = Math.max(this.width / 2, this.x - this.speed);
        }
        if (keys['ArrowRight']) {
            this.x = Math.min(BASE_WIDTH - this.width / 2, this.x + this.speed);
        }
        if (keys['ArrowUp']) {
            this.velocity = Math.min(this.maxVelocity, this.velocity + 0.1);
        }
        if (keys['ArrowDown']) {
            this.velocity = Math.max(this.minVelocity, this.velocity - 0.1);
        }
    }

    draw() {
        ctx.fillStyle = '#e6e6e6';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 3);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff5000';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 3);
        ctx.lineTo(this.x - 10, this.y + this.height / 2 + 15);
        ctx.lineTo(this.x + 10, this.y + this.height / 2 + 15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#5099ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff3232';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TSO', this.x, this.y + 5);
    }

    getRect() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

// Obstacle třída
class Obstacle {
    constructor() {
        this.direction = ['top', 'left', 'right'][Math.floor(Math.random() * 3)];

        if (this.direction === 'top') {
            this.x = Math.random() * (BASE_WIDTH - 100) + 50;
            this.y = -50;
            this.vx = 0;
            this.vy = 1;
        } else if (this.direction === 'left') {
            this.x = -50;
            this.y = Math.random() * (BASE_HEIGHT - 250) + 50;
            this.vx = 1;
            this.vy = 0.3;
        } else {
            this.x = BASE_WIDTH + 50;
            this.y = Math.random() * (BASE_HEIGHT - 250) + 50;
            this.vx = -1;
            this.vy = 0.3;
        }

        this.size = Math.random() * 20 + 30;
        this.type = Math.random() < 0.5 ? 'ship' : 'asteroid';
        const colors = ['#b8b8c0', '#a0c0a0', '#c0a0a0'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    move(speed) {
        this.x += this.vx * speed;
        this.y += this.vy * speed;
    }

    draw() {
        if (this.type === 'ship') {
            const wingWidth = this.size;
            const wingHeight = this.size * 0.6;

            if (this.direction === 'top') {
                const points = [
                    [this.x, this.y + wingHeight / 2],
                    [this.x - wingWidth / 2, this.y - wingHeight / 2],
                    [this.x + wingWidth / 2, this.y - wingHeight / 2]
                ];
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
                ctx.lineTo(points[2][0], points[2][1]);
                ctx.closePath();
                ctx.fill();

                const darker = `rgb(${Math.max(0, parseInt(this.color.slice(1,3),16)-50)}, ${Math.max(0, parseInt(this.color.slice(3,5),16)-50)}, ${Math.max(0, parseInt(this.color.slice(5,7),16)-50)})`;
                ctx.fillStyle = darker;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#64c8ff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 6, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.direction === 'left') {
                const points = [
                    [this.x - wingHeight / 2, this.y],
                    [this.x + wingHeight / 2, this.y - wingWidth / 2],
                    [this.x + wingHeight / 2, this.y + wingWidth / 2]
                ];
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
                ctx.lineTo(points[2][0], points[2][1]);
                ctx.closePath();
                ctx.fill();

                const darker = `rgb(${Math.max(0, parseInt(this.color.slice(1,3),16)-50)}, ${Math.max(0, parseInt(this.color.slice(3,5),16)-50)}, ${Math.max(0, parseInt(this.color.slice(5,7),16)-50)})`;
                ctx.fillStyle = darker;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#64c8ff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 6, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const points = [
                    [this.x + wingHeight / 2, this.y],
                    [this.x - wingHeight / 2, this.y - wingWidth / 2],
                    [this.x - wingHeight / 2, this.y + wingWidth / 2]
                ];
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
                ctx.lineTo(points[2][0], points[2][1]);
                ctx.closePath();
                ctx.fill();

                const darker = `rgb(${Math.max(0, parseInt(this.color.slice(1,3),16)-50)}, ${Math.max(0, parseInt(this.color.slice(3,5),16)-50)}, ${Math.max(0, parseInt(this.color.slice(5,7),16)-50)})`;
                ctx.fillStyle = darker;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#64c8ff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 6, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#646464';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 6; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * this.size / 2.5;
                const cx = this.x + Math.cos(angle) * dist;
                const cy = this.y + Math.sin(angle) * dist;
                ctx.fillStyle = '#424242';
                ctx.beginPath();
                ctx.arc(cx, cy, this.size / 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    isOffScreen() {
        return this.y > BASE_HEIGHT + 100 || this.x < -100 || this.x > BASE_WIDTH + 100;
    }

    collidesWith(rocket) {
        const dist = Math.sqrt((this.x - rocket.x) ** 2 + (this.y - rocket.y) ** 2);
        return dist < (rocket.width / 2 + this.size / 2);
    }
}

// Particle třída
class Particle {
    constructor(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 25 + 5;
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 180;
        this.size = Math.floor(Math.random() * 11) + 5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3;
        this.life--;
    }

    draw() {
        const alpha = this.life / 180;
        const colors = ['#ffffa0', '#ffff00', '#ff8000', '#ff3200', '#960000'];
        const colorIdx = Math.floor((1 - alpha) * colors.length);
        const baseColor = colors[Math.min(colorIdx, colors.length - 1)];
        ctx.globalAlpha = alpha;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Debris třída
class Debris {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 40 - 20;
        this.life = 400;
        this.shape = ['triangle', 'rect', 'metal', 'computer', 'screen', 'panel'][Math.floor(Math.random() * 6)];
        this.size = Math.floor(Math.random() * 16) + 10;
        this.color = ['#c0c0c0', '#969696', '#6464a0', '#b8b8c0', '#787878'][Math.floor(Math.random() * 5)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.rotation += this.rotationSpeed;
        this.life--;
    }

    draw() {
        const alpha = Math.min(1, this.life / 150);
        ctx.globalAlpha = alpha;

        if (this.shape === 'triangle') {
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#646464';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.size);
            ctx.lineTo(this.x - this.size, this.y + this.size);
            ctx.lineTo(this.x + this.size, this.y + this.size);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.shape === 'rect') {
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#646464';
            ctx.lineWidth = 1;
            ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
            ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        } else if (this.shape === 'metal') {
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#646464';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x - this.size, this.y - this.size / 2);
            ctx.lineTo(this.x + this.size, this.y - this.size / 2);
            ctx.lineTo(this.x + this.size / 2, this.y + this.size / 2);
            ctx.lineTo(this.x - this.size / 2, this.y + this.size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.shape === 'computer') {
            ctx.fillStyle = '#323238';
            ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2 - 4);
            ctx.fillStyle = '#64ff64';
            ctx.fillRect(this.x - this.size + 3, this.y - this.size + 3, this.size * 2 - 6, this.size * 2 - 10);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        } else if (this.shape === 'screen') {
            ctx.fillStyle = '#282830';
            ctx.fillRect(this.x - this.size, this.y - this.size * 0.75, this.size * 2, this.size * 1.5);
            ctx.fillStyle = '#6496ff';
            ctx.fillRect(this.x - this.size + 2, this.y - this.size * 0.75 + 2, this.size * 2 - 4, this.size * 1.5 - 4);
        } else { // panel
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.size, this.y - this.size / 2, this.size * 2, this.size);
            for (let i = 1; i < 4; i++) {
                ctx.strokeStyle = '#6496ff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x - this.size + i * this.size / 2, this.y - this.size / 2);
                ctx.lineTo(this.x - this.size + i * this.size / 2, this.y + this.size / 2);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
    }
}

// Astronaut třída
class Astronaut {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = Math.random() * 6 - 3;
        this.vy = Math.random() * 5 - 8;
        this.rotation = 0;
        this.rotationSpeed = Math.random() * 16 - 8;
        this.life = 600;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05;
        this.rotation += this.rotationSpeed;
        this.life--;
    }

    draw() {
        const alpha = Math.min(1, this.life / 100);
        ctx.globalAlpha = alpha;

        // Tělo
        ctx.fillStyle = '#d8d8dc';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 30, 13, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hlava
        ctx.fillStyle = '#96a0a8';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Kombinéza
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 50, 19, 19, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ruce
        ctx.fillStyle = '#c8c8cc';
        ctx.beginPath();
        ctx.ellipse(this.x - 14, this.y + 42, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + 14, this.y + 42, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nohy
        ctx.beginPath();
        ctx.ellipse(this.x - 6, this.y + 66, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + 6, this.y + 66, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rukávy
        ctx.fillStyle = '#c8c8cc';
        ctx.beginPath();
        ctx.ellipse(this.x - 14, this.y + 48, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + 14, this.y + 48, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kolena
        ctx.fillStyle = '#a8a8b0';
        ctx.beginPath();
        ctx.ellipse(this.x - 6, this.y + 58, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + 6, this.y + 58, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kotníky
        ctx.fillStyle = '#787880';
        ctx.beginPath();
        ctx.ellipse(this.x - 6, this.y + 70, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + 6, this.y + 70, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Text TSO
        ctx.fillStyle = '#ff3232';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TSO', this.x, this.y + 45);

        ctx.globalAlpha = 1;
    }
}

// Hlavní proměnné
let rocket = new Rocket();
let obstacles = [];
let particles = [];
let debrisList = [];
let astronaut = null;

let clouds = [];
for (let i = 0; i < 15; i++) {
    clouds.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT,
        size: Math.random() * 40 + 40
    });
}

let startTime = Date.now();
let lastSpawn = Date.now();
let spawnInterval = 1500;
const baseSpeed = 3;

let gameState = 'level_select';
let difficulty = null;
const sunScoreThreshold = { easy: 20, medium: 40, hard: 60 };
const spawnIntervals = { easy: 2000, medium: 1500, hard: 1000 };
let sunActive = false;
let sunX = BASE_WIDTH / 2;
let sunY = -1000;
const sunSize = 600;

let takeoffProgress = 0;
let takeoffWait = 0;
let earthY = BASE_HEIGHT + 100;

let shieldAvailable = false;
let shieldActive = false;
let shieldStartTime = 0;
let lastShieldScore = 0;

let gameOver = false;
let gameOverTime = null;
let flashIntensity = 0;

const font = '36px Arial';
const bigFont = '72px Arial';

// Funkce pro update
function update() {
    if (!gameRunning) return;

    if (gameState === 'takeoff') {
        takeoffWait++;
        if (takeoffWait > 600) {
            takeoffProgress += 2;
            earthY -= 2;
        }
        if (takeoffProgress >= 200) {
            gameState = 'playing';
            startTime = Date.now();
            lastSpawn = Date.now();
            spawnInterval = spawnIntervals[difficulty];
        }
    }

    if (gameState === 'playing' && !gameOver) {
        rocket.move();

        const elapsed = (Date.now() - startTime) / 1000;
        const score = Math.floor(elapsed / 3);
        const speed = (baseSpeed + elapsed * 0.1) * rocket.velocity;

        if (Math.floor(score / 10) !== lastShieldScore && score > 0 && !shieldActive) {
            shieldAvailable = true;
            lastShieldScore = Math.floor(score / 10);
        }

        if (shieldActive) {
            if ((Date.now() - shieldStartTime) / 1000 >= 10) {
                shieldActive = false;
            }
        }

        if (score >= sunScoreThreshold[difficulty] && !sunActive) {
            sunActive = true;
        }

        if (sunActive) {
            sunY += 3;
            if (sunY > rocket.y - 200) {
                gameOver = true;
                gameOverTime = Date.now();
                flashIntensity = 255;
                astronaut = new Astronaut(rocket.x, rocket.y);
                for (let i = 0; i < 500; i++) {
                    particles.push(new Particle(rocket.x, rocket.y));
                }
                for (let i = 0; i < 30; i++) {
                    debrisList.push(new Debris(rocket.x, rocket.y));
                }
            }
        }

        if ((Date.now() - lastSpawn) > spawnInterval && elapsed >= 3) {
            obstacles.push(new Obstacle());
            lastSpawn = Date.now();
        }

        obstacles.forEach(obs => {
            obs.move(speed);
            if (obs.collidesWith(rocket) && !shieldActive) {
                gameOver = true;
                gameOverTime = Date.now();
                flashIntensity = 255;
                astronaut = new Astronaut(rocket.x, rocket.y);
                for (let i = 0; i < 500; i++) {
                    particles.push(new Particle(rocket.x, rocket.y));
                }
                for (let i = 0; i < 30; i++) {
                    debrisList.push(new Debris(rocket.x, rocket.y));
                }
            }
        });

        obstacles = obstacles.filter(obs => !obs.isOffScreen());
    } else {
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.life > 0);

        debrisList.forEach(d => d.update());
        debrisList = debrisList.filter(d => d.life > 0);

        if (astronaut && astronaut.life <= 0) {
            astronaut = null;
        }
    }

    if (flashIntensity > 0) {
        flashIntensity = Math.max(0, flashIntensity - 5);
    }
}

// Funkce pro draw
function draw() {
    if (!gameRunning) return;

    if (gameState === 'takeoff') {
        if (takeoffProgress === 0) {
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        } else {
            const darkness = Math.floor(takeoffProgress * 1.2);
            ctx.fillStyle = `rgb(${Math.max(10, 135 - darkness)}, ${Math.max(10, 206 - darkness)}, ${Math.max(30, 235 - darkness)})`;
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        }

        const cloudOpacity = Math.floor(255 * Math.max(0, (1 - takeoffProgress / 200)));
        clouds.forEach(cloud => {
            ctx.globalAlpha = cloudOpacity / 255;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cloud.x, cloud.y, cloud.size / 2, cloud.size / 4, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = '#0a0a1e';
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

        // Hvězdy
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * BASE_WIDTH;
            const y = Math.random() * BASE_HEIGHT;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, 1, 1);
        }
    }

    if (gameState === 'level_select') {
        ctx.fillStyle = '#ffffff';
        ctx.font = bigFont;
        ctx.textAlign = 'center';
        ctx.fillText('Vyber úroveň', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 100);

        ctx.font = font;
        ctx.fillStyle = '#64ff64';
        ctx.fillText('Q - Easy (Slunce při 20)', BASE_WIDTH / 2, BASE_HEIGHT / 2);

        ctx.fillStyle = '#ffff64';
        ctx.fillText('W - Medium (Slunce při 40)', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 50);

        ctx.fillStyle = '#ff6464';
        ctx.fillText('E - Hard (Slunce při 60)', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 100);
    }

    if (gameState === 'takeoff') {
        if (earthY < BASE_HEIGHT + 100) {
            ctx.fillStyle = '#6499ff';
            ctx.beginPath();
            ctx.arc(BASE_WIDTH / 2, earthY, 300, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#32cc64';
            ctx.beginPath();
            ctx.arc(BASE_WIDTH / 2 - 80, earthY - 50, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(BASE_WIDTH / 2 + 60, earthY + 40, 100, 0, Math.PI * 2);
            ctx.fill();
        }

        if (takeoffProgress < 100) {
            const padY = BASE_HEIGHT - 50 + takeoffProgress;
            ctx.fillStyle = '#646464';
            ctx.fillRect(BASE_WIDTH / 2 - 80, padY, 160, 30);
            ctx.fillStyle = '#969696';
            ctx.fillRect(BASE_WIDTH / 2 - 60, padY + 30, 120, 20);

            ctx.fillStyle = '#505050';
            ctx.fillRect(BASE_WIDTH / 2 - 100, padY - 20, 15, 50);
            ctx.fillRect(BASE_WIDTH / 2 - 50, padY - 20, 15, 50);
            ctx.fillRect(BASE_WIDTH / 2 + 35, padY - 20, 15, 50);
            ctx.fillRect(BASE_WIDTH / 2 + 85, padY - 20, 15, 50);
        }

        if (takeoffProgress === 0) {
            for (let i = 0; i < 5; i++) {
                const smokeX = rocket.x + (Math.random() - 0.5) * 24;
                const smokeY = rocket.y + 40 + Math.random() * 20;
                const smokeSize = Math.random() * 8 + 8;
                const smokeAlpha = Math.random() * 60 + 40;
                ctx.globalAlpha = smokeAlpha / 255;
                ctx.fillStyle = '#969696';
                ctx.beginPath();
                ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        rocket.draw();

        const countdown = 10 - Math.floor(takeoffWait / 60);
        if (countdown > 0) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = bigFont;
            ctx.textAlign = 'center';
            ctx.fillText(countdown.toString(), BASE_WIDTH / 2, BASE_HEIGHT / 3);
        }
    }

    if (gameState === 'playing') {
        if (sunActive) {
            ctx.globalAlpha = Math.max(0, Math.min(255, Math.floor(255 * (sunY + 500) / 700))) / 255;
            ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
            ctx.globalAlpha = 1;

            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffff64';
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunSize - 50, 0, Math.PI * 2);
            ctx.fill();

            for (let i = 0; i < 20; i++) {
                const angle = i * Math.PI / 10;
                const startX = sunX + Math.cos(angle) * (sunSize + 20);
                const startY = sunY + Math.sin(angle) * (sunSize + 20);
                const endX = sunX + Math.cos(angle) * (sunSize + 100);
                const endY = sunY + Math.sin(angle) * (sunSize + 100);
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }

        obstacles.forEach(obs => obs.draw());

        if (!gameOver) {
            rocket.draw();
            if (shieldActive) {
                ctx.strokeStyle = '#64c8ff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(rocket.x, rocket.y, 50, 0, Math.PI * 2);
                ctx.stroke();
                const remaining = 10 - (Date.now() - shieldStartTime) / 1000;
                ctx.fillStyle = '#64c8ff';
                ctx.font = font;
                ctx.textAlign = 'left';
                ctx.fillText(`Štít: ${remaining.toFixed(1)}s`, 10, 90);
            }
        } else {
            particles.forEach(p => p.draw());
            debrisList.forEach(d => d.draw());
            if (astronaut) astronaut.draw();
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const score = Math.floor(elapsed / 3);
        ctx.fillStyle = '#ffffff';
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.fillText(`Skóre: ${score}`, 10, 10);

        if (!gameOver) {
            ctx.fillStyle = '#ffff64';
            ctx.fillText(`Rychlost: ${rocket.velocity.toFixed(1)}x`, 10, 50);

            if (shieldAvailable) {
                ctx.fillStyle = '#64ff64';
                ctx.font = bigFont;
                ctx.textAlign = 'center';
                ctx.fillText('ŠTÍT DOSTUPNÝ!', BASE_WIDTH / 2, BASE_HEIGHT / 3);

                ctx.fillStyle = '#ffffff';
                ctx.font = font;
                ctx.fillText('Zmáčkni Ctrl pro aktivaci', BASE_WIDTH / 2, BASE_HEIGHT / 3 + 60);
            }
        }
    }

    if (flashIntensity > 0) {
        ctx.globalAlpha = flashIntensity / 255;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        ctx.globalAlpha = 1;
    }

    if (gameOver) {
        const timeSinceCrash = (Date.now() - gameOverTime) / 1000;

        if (timeSinceCrash > 3) {
            ctx.fillStyle = '#ff0000';
            ctx.font = bigFont;
            ctx.textAlign = 'center';
            ctx.fillText('FAIL! Nabourals!', BASE_WIDTH / 2, BASE_HEIGHT / 2);

            const elapsed = (Date.now() - startTime) / 1000;
            const score = Math.floor(elapsed / 3);
            ctx.fillStyle = '#ffffff';
            ctx.font = font;
            ctx.fillText(`Tvoje skóre: ${score}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 60);
        }

        if (timeSinceCrash > 5) {
            ctx.fillStyle = '#ffff00';
            ctx.font = font;
            ctx.fillText('Zmáčkni Mezerník pro restart', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 120);
        }
    }
}

// Event listenery pro game states
document.addEventListener('keydown', (e) => {
    if (gameState === 'level_select') {
        if (e.code === 'KeyQ') {
            difficulty = 'easy';
            gameState = 'takeoff';
        } else if (e.code === 'KeyW') {
            difficulty = 'medium';
            gameState = 'takeoff';
        } else if (e.code === 'KeyE') {
            difficulty = 'hard';
            gameState = 'takeoff';
        }
    }

    if (e.code === 'Space' && gameOver) {
        rocket = new Rocket();
        obstacles = [];
        particles = [];
        debrisList = [];
        astronaut = null;
        difficulty = null;
        sunActive = false;
        sunY = -1000;
        takeoffProgress = 0;
        takeoffWait = 0;
        earthY = BASE_HEIGHT + 100;
        shieldAvailable = false;
        shieldActive = false;
        lastShieldScore = 0;
        gameOver = false;
        gameOverTime = null;
        flashIntensity = 0;
        gameState = 'level_select';
        startTime = Date.now();
        spawnInterval = 1500;
    }

    if (e.code === 'ControlLeft' && shieldAvailable && !shieldActive && gameState === 'playing') {
        shieldActive = true;
        shieldAvailable = false;
        shieldStartTime = Date.now();
    }
});

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
