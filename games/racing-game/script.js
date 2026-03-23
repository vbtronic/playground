const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const BASE_WIDTH = 600;
const BASE_HEIGHT = 400;
canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

const game = {
    state: 'intro',
    running: true,
    startTime: Date.now(),
    distance: 0,
    score: 0,
    speed: 3,
    laneWidth: 74,
    roadCenter: BASE_WIDTH / 2,
    dashOffset: 0,
    player: {
        lane: 0,
        x: BASE_WIDTH / 2,
        y: BASE_HEIGHT - 72,
        width: 34,
        height: 58,
        color: '#ff5050'
    },
    traffic: [],
    spawnTimer: 0,
    spawnDelay: 850,
    collisions: 0
};

const keys = {
    left: false,
    right: false,
    up: false,
    down: false
};

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') keys.left = true;
    if (event.key === 'ArrowRight') keys.right = true;
    if (event.key === 'ArrowUp') keys.up = true;
    if (event.key === 'ArrowDown') keys.down = true;

    if (event.key === ' ' && game.state === 'intro') {
        startRace();
    }

    if ((event.key === 'r' || event.key === 'R') && game.state === 'game_over') {
        resetRace();
    }

    if (event.key === 'Escape') {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
});

window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft') keys.left = false;
    if (event.key === 'ArrowRight') keys.right = false;
    if (event.key === 'ArrowUp') keys.up = false;
    if (event.key === 'ArrowDown') keys.down = false;
});

gameLoop();

function resizeCanvas() {
    const gameContainer = document.getElementById('game');
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    const scale = Math.min(containerWidth / BASE_WIDTH, containerHeight / BASE_HEIGHT, 1);
    canvas.style.width = `${BASE_WIDTH * scale}px`;
    canvas.style.height = `${BASE_HEIGHT * scale}px`;
}

function startRace() {
    game.state = 'playing';
    game.startTime = Date.now();
}

function resetRace() {
    game.state = 'intro';
    game.distance = 0;
    game.score = 0;
    game.speed = 3;
    game.traffic = [];
    game.spawnTimer = 0;
    game.collisions = 0;
    game.player.lane = 0;
    game.player.x = laneToX(0);
}

function laneToX(lane) {
    return game.roadCenter + lane * game.laneWidth;
}

function spawnTraffic() {
    const lane = Math.floor(Math.random() * 3) - 1;
    const type = Math.random() > 0.7 ? 'truck' : 'car';
    const color = type === 'truck' ? '#ffee59' : '#64f5ff';
    const width = type === 'truck' ? 38 : 30;
    const height = type === 'truck' ? 74 : 58;
    const speed = 2 + Math.random() * 2 + game.speed * 0.3;

    game.traffic.push({
        lane,
        x: laneToX(lane),
        y: -height,
        width,
        height,
        speed,
        color
    });
}

function update(deltaTime) {
    if (game.state !== 'playing') {
        return;
    }

    if (keys.left) {
        game.player.lane = Math.max(-1, game.player.lane - 1);
        keys.left = false;
    }

    if (keys.right) {
        game.player.lane = Math.min(1, game.player.lane + 1);
        keys.right = false;
    }

    if (keys.up) {
        game.speed = Math.min(8, game.speed + 0.02);
    }

    if (keys.down) {
        game.speed = Math.max(2, game.speed - 0.04);
    }

    game.player.x = laneToX(game.player.lane);
    game.distance += game.speed;
    game.score = Math.floor(game.distance / 5);
    game.dashOffset += game.speed * 5;

    game.spawnTimer += deltaTime;
    const dynamicDelay = Math.max(320, game.spawnDelay - game.score * 1.4);
    if (game.spawnTimer > dynamicDelay) {
        game.spawnTimer = 0;
        spawnTraffic();
    }

    game.traffic.forEach((car) => {
        car.y += car.speed;
    });

    game.traffic = game.traffic.filter((car) => car.y < BASE_HEIGHT + 120);

    for (const car of game.traffic) {
        if (isColliding(game.player, car)) {
            game.collisions += 1;
            game.state = 'game_over';
            break;
        }
    }
}

function isColliding(a, b) {
    return (
        a.x - a.width / 2 < b.x + b.width / 2 &&
        a.x + a.width / 2 > b.x - b.width / 2 &&
        a.y - a.height / 2 < b.y + b.height / 2 &&
        a.y + a.height / 2 > b.y - b.height / 2
    );
}

function draw() {
    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    drawRoad();
    drawTraffic();
    drawPlayer();
    drawHUD();

    if (game.state === 'intro') {
        drawIntroOverlay();
    }

    if (game.state === 'game_over') {
        drawGameOverOverlay();
    }
}

function drawRoad() {
    ctx.fillStyle = '#183411';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const roadWidth = game.laneWidth * 3 + 70;
    const roadX = game.roadCenter - roadWidth / 2;
    ctx.fillStyle = '#454d57';
    ctx.fillRect(roadX, 0, roadWidth, BASE_HEIGHT);

    ctx.fillStyle = '#fafafa';
    const dashHeight = 24;
    const dashGap = 16;
    for (let laneMark = -0.5; laneMark <= 0.5; laneMark += 1) {
        const x = game.roadCenter + laneMark * game.laneWidth;
        for (let y = -dashHeight + (game.dashOffset % (dashHeight + dashGap)); y < BASE_HEIGHT + dashHeight; y += dashHeight + dashGap) {
            ctx.fillRect(x - 3, y, 6, dashHeight);
        }
    }
}

function drawPlayer() {
    drawCar(game.player.x, game.player.y, game.player.width, game.player.height, game.player.color);
}

function drawTraffic() {
    game.traffic.forEach((car) => {
        drawCar(car.x, car.y, car.width, car.height, car.color);
    });
}

function drawCar(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);

    ctx.fillStyle = '#202833';
    ctx.fillRect(x - width / 4, y - height / 3, width / 2, height / 4);

    ctx.fillStyle = '#111';
    ctx.fillRect(x - width / 2, y - height / 2, 5, 10);
    ctx.fillRect(x + width / 2 - 5, y - height / 2, 5, 10);
    ctx.fillRect(x - width / 2, y + height / 2 - 10, 5, 10);
    ctx.fillRect(x + width / 2 - 5, y + height / 2 - 10, 5, 10);
}

function drawHUD() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`Score: ${game.score}`, 14, 24);
    ctx.fillText(`Speed: ${game.speed.toFixed(1)}x`, 14, 46);
}

function drawIntroOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Racing Game', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 40);
    ctx.font = '18px Arial';
    ctx.fillText('Arrow Left/Right: lane change', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 8);
    ctx.fillText('Arrow Up/Down: speed', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 34);
    ctx.fillText('Press SPACE to start', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 70);
    ctx.textAlign = 'left';
}

function drawGameOverOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.fillStyle = '#ff6f6f';
    ctx.font = '44px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Crash!', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 20);

    ctx.fillStyle = '#fff';
    ctx.font = '22px Arial';
    ctx.fillText(`Final score: ${game.score}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 + 20);
    ctx.fillText('Press R to restart', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 56);
    ctx.textAlign = 'left';
}

let lastFrame = performance.now();
function gameLoop(now = performance.now()) {
    const deltaTime = now - lastFrame;
    lastFrame = now;

    if (game.running) {
        update(deltaTime);
        draw();
        requestAnimationFrame(gameLoop);
    }
}
