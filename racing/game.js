(function () {
    'use strict';

    var cfg = DATA.config;

    var state = {
        lang: localStorage.getItem('lang') || 'en',
        screen: 'welcome',      // welcome | countdown | racing | results
        difficulty: 'medium',
        raceStartTime: 0,
        raceElapsed: 0,
        countdownValue: 3,
        resultsShown: false
    };

    // DOM refs
    var headerTitle = document.getElementById('header-title');
    var resetBtn = document.getElementById('btn-reset');
    var themeToggle = document.getElementById('theme-toggle');
    var iconMoon = themeToggle.querySelector('.icon-moon');
    var iconSun = themeToggle.querySelector('.icon-sun');
    var gameContainer = document.getElementById('game-container');

    // Three.js globals
    var scene, camera, renderer, clock;
    var playerCar, aiCars = [], allCars = [];
    var aiDrivers = [];
    var animFrameId = null;
    var parkingSpots = [];
    var finishedCount = 0;

    // HUD elements
    var hudEl, countdownEl, overlayEl, minimapEl, minimapCtx, controlsHintEl;

    // ===== Translation =====
    function t(key) {
        var obj = DATA.ui[key];
        return obj ? obj[state.lang] : key;
    }

    // ===== Theme toggle =====
    var currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    function applyTheme(theme) {
        currentTheme = theme;
        if (theme === 'dark') {
            document.body.classList.add('dark');
            iconSun.style.display = 'none';
            iconMoon.style.display = '';
        } else {
            document.body.classList.remove('dark');
            iconSun.style.display = '';
            iconMoon.style.display = 'none';
        }
        localStorage.setItem('theme', theme);
        updateSceneTheme();
    }

    themeToggle.addEventListener('click', function () {
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    function updateSceneTheme() {
        if (!scene) return;
        var isDark = document.body.classList.contains('dark');
        var grassColor = isDark ? 0x2a4020 : 0x4a7a2e;
        scene.background = new THREE.Color(grassColor);
        if (scene.fog) scene.fog.color = scene.background;
    }

    // ===== Language pill =====
    var langPill = document.getElementById('lang-pill');
    var langOpts = langPill.querySelectorAll('.lang-opt');

    function updateLangPill() {
        for (var i = 0; i < langOpts.length; i++) {
            if (langOpts[i].getAttribute('data-lang') === state.lang) {
                langOpts[i].classList.add('active');
            } else {
                langOpts[i].classList.remove('active');
            }
        }
    }

    for (var li = 0; li < langOpts.length; li++) {
        langOpts[li].addEventListener('click', function () {
            var newLang = this.getAttribute('data-lang');
            if (newLang === state.lang) return;
            state.lang = newLang;
            localStorage.setItem('lang', newLang);
            updateLangPill();
            headerTitle.textContent = t('title');
            updateUIText();
        });
    }

    function updateUIText() {
        headerTitle.textContent = t('title');
        if (state.screen === 'welcome') showWelcome();
        if (state.screen === 'results') showResults();
        if (state.screen === 'racing') updateHUD();
        if (controlsHintEl) controlsHintEl.textContent = t('controls');
    }

    // ===== Reset =====
    resetBtn.addEventListener('click', function () {
        stopGameLoop();
        state.screen = 'welcome';
        state.raceElapsed = 0;
        clearOverlays();
        showWelcome();
        // Render one frame so the track is visible
        if (renderer && scene && camera) renderer.render(scene, camera);
    });

    // ===== Init language on load =====
    updateLangPill();
    headerTitle.textContent = t('title');

    // ===== Input =====
    var keys = {};
    window.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        // Prevent arrow keys from scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) !== -1) {
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });

    // ===== Three.js Scene =====
    function initScene() {
        scene = new THREE.Scene();
        var isDark = document.body.classList.contains('dark');
        scene.background = new THREE.Color(isDark ? 0x2a4020 : 0x4a7a2e);
        scene.fog = new THREE.FogExp2(scene.background, 0.002);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        var cw = gameContainer.clientWidth || window.innerWidth;
        var ch = gameContainer.clientHeight || (window.innerHeight - 48);
        renderer.setSize(cw, ch);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        gameContainer.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(
            50,
            cw / ch,
            0.1,
            800
        );
        camera.position.set(0, cfg.cameraHeight, 0);
        camera.lookAt(0, 0, 0);

        clock = new THREE.Clock(false);

        // Lighting
        var ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        var sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(30, 50, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.left = -150;
        sun.shadow.camera.right = 150;
        sun.shadow.camera.top = 150;
        sun.shadow.camera.bottom = -150;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 250;
        scene.add(sun);

        var hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7d0a, 0.3);
        scene.add(hemi);

        // Track
        TRACK.createTrackMesh(scene);

        // Resize handler
        window.addEventListener('resize', onResize);
    }

    function onResize() {
        if (!renderer || !camera) return;
        camera.aspect = gameContainer.clientWidth / gameContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    }

    // ===== Cars =====
    function initCars() {
        // Remove old car meshes
        for (var r = 0; r < allCars.length; r++) {
            scene.remove(allCars[r].mesh);
        }
        allCars = [];
        aiCars = [];
        aiDrivers = [];

        var positions = TRACK.getStartPositions(1 + cfg.aiCount);
        parkingSpots = TRACK.getParkingPositions(1 + cfg.aiCount);
        finishedCount = 0;

        // Player car
        playerCar = new Car({
            x: positions[0].x,
            z: positions[0].z,
            angle: positions[0].angle,
            isPlayer: true,
            color: cfg.carColors[0],
            name: t('player'),
            index: 0
        });
        scene.add(playerCar.mesh);
        allCars.push(playerCar);

        // AI cars
        for (var i = 0; i < cfg.aiCount; i++) {
            var pos = positions[i + 1];
            var aiCar = new Car({
                x: pos.x,
                z: pos.z,
                angle: pos.angle,
                isPlayer: false,
                color: cfg.carColors[i + 1],
                name: cfg.aiNames[i],
                index: i + 1
            });
            scene.add(aiCar.mesh);
            aiCars.push(aiCar);
            allCars.push(aiCar);
            aiDrivers.push(new AI.AIDriver(aiCar, state.difficulty));
        }
    }

    // ===== Clear overlays =====
    function clearOverlays() {
        if (overlayEl) { overlayEl.remove(); overlayEl = null; }
        if (countdownEl) { countdownEl.remove(); countdownEl = null; }
        if (hudEl) { hudEl.remove(); hudEl = null; }
        if (minimapEl) { minimapEl.remove(); minimapEl = null; }
        if (controlsHintEl) { controlsHintEl.remove(); controlsHintEl = null; }
    }

    // ===== Welcome Screen =====
    function showWelcome() {
        clearOverlays();

        overlayEl = document.createElement('div');
        overlayEl.className = 'screen-overlay';
        overlayEl.innerHTML =
            '<div class="screen-panel">' +
                '<h2>' + t('title') + '</h2>' +
                '<p>' + t('subtitle') + '</p>' +
                '<div class="controls-info">' +
                    '<div class="controls-row"><kbd>\u2191</kbd><kbd>\u2193</kbd><kbd>\u2190</kbd><kbd>\u2192</kbd> / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>' +
                    '<div class="controls-desc">' + t('controls') + '</div>' +
                '</div>' +
                '<div class="difficulty-label">' + t('difficulty') + '</div>' +
                '<div class="difficulty-group">' +
                    '<button class="diff-btn' + (state.difficulty === 'easy' ? ' active' : '') + '" data-diff="easy">' + t('easy') + '</button>' +
                    '<button class="diff-btn' + (state.difficulty === 'medium' ? ' active' : '') + '" data-diff="medium">' + t('medium') + '</button>' +
                    '<button class="diff-btn' + (state.difficulty === 'hard' ? ' active' : '') + '" data-diff="hard">' + t('hard') + '</button>' +
                '</div>' +
                '<button class="btn-start">' + t('start') + '</button>' +
                '<div class="credit">' + t('threejsCredit') + '</div>' +
            '</div>';
        gameContainer.appendChild(overlayEl);

        // Difficulty buttons
        var diffBtns = overlayEl.querySelectorAll('.diff-btn');
        for (var i = 0; i < diffBtns.length; i++) {
            diffBtns[i].addEventListener('click', function () {
                state.difficulty = this.getAttribute('data-diff');
                for (var j = 0; j < diffBtns.length; j++) {
                    diffBtns[j].classList.remove('active');
                }
                this.classList.add('active');
            });
        }

        // Start button
        overlayEl.querySelector('.btn-start').addEventListener('click', function () {
            startCountdown();
        });

        // Position camera to show whole track
        setCameraOverview();
    }

    function setCameraOverview() {
        camera.position.set(0, 140, 30);
        camera.lookAt(0, 0, 0);
    }

    // ===== Countdown =====
    function startCountdown() {
        clearOverlays();
        initCars();
        state.screen = 'countdown';
        state.countdownValue = 3;
        state.resultsShown = false;

        countdownEl = document.createElement('div');
        countdownEl.className = 'countdown';
        countdownEl.innerHTML = '<span class="countdown-num">3</span>';
        gameContainer.appendChild(countdownEl);

        // Snap camera to player (don't lerp, snap directly)
        camera.position.set(playerCar.x, cfg.cameraHeight, playerCar.z + 10);
        camera.lookAt(playerCar.x, 0, playerCar.z);
        renderer.render(scene, camera);

        var interval = setInterval(function () {
            state.countdownValue--;
            if (state.countdownValue > 0) {
                countdownEl.innerHTML = '<span class="countdown-num">' + state.countdownValue + '</span>';
            } else if (state.countdownValue === 0) {
                countdownEl.innerHTML = '<span class="countdown-num">' + t('go') + '</span>';
            } else {
                clearInterval(interval);
                countdownEl.remove();
                countdownEl = null;
                startRace();
            }
            renderer.render(scene, camera);
        }, 800);
    }

    // ===== Race =====
    function startRace() {
        state.screen = 'racing';
        state.raceElapsed = 0;

        for (var i = 0; i < allCars.length; i++) {
            allCars[i].lapStartTime = 0;
        }

        createHUD();
        createMinimap();
        createControlsHint();

        clock.start();
        gameLoop();
    }

    // ===== HUD =====
    function createHUD() {
        hudEl = document.createElement('div');
        hudEl.className = 'hud';
        hudEl.innerHTML =
            '<div class="hud-left">' +
                '<div class="hud-block">' +
                    '<div class="hud-label" id="hud-pos-label">' + t('position') + '</div>' +
                    '<div class="hud-value" id="hud-pos">1st</div>' +
                '</div>' +
                '<div class="hud-block">' +
                    '<div class="hud-label" id="hud-lap-label">' + t('lap') + '</div>' +
                    '<div class="hud-value-sm" id="hud-lap">0 / ' + cfg.totalLaps + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="hud-right">' +
                '<div class="hud-block">' +
                    '<div class="hud-label" id="hud-speed-label">' + t('speed') + '</div>' +
                    '<div class="hud-value-sm" id="hud-speed">0 km/h</div>' +
                '</div>' +
                '<div class="hud-block">' +
                    '<div class="hud-label" id="hud-time-label">' + t('time') + '</div>' +
                    '<div class="hud-value-sm" id="hud-time">0:00.0</div>' +
                '</div>' +
            '</div>';
        gameContainer.appendChild(hudEl);
    }

    function updateHUD() {
        if (!hudEl) return;
        var pos = getPlayerPosition();
        var posStr = pos + ordinal(pos);

        document.getElementById('hud-pos').textContent = posStr;
        document.getElementById('hud-lap').textContent = Math.min(playerCar.lap + 1, cfg.totalLaps) + ' / ' + cfg.totalLaps;
        document.getElementById('hud-speed').textContent = playerCar.getDisplaySpeed() + ' km/h';
        document.getElementById('hud-time').textContent = formatTime(state.raceElapsed);

        // Update labels for language
        var pl = document.getElementById('hud-pos-label');
        var ll = document.getElementById('hud-lap-label');
        var sl = document.getElementById('hud-speed-label');
        var tl = document.getElementById('hud-time-label');
        if (pl) pl.textContent = t('position');
        if (ll) ll.textContent = t('lap');
        if (sl) sl.textContent = t('speed');
        if (tl) tl.textContent = t('time');
    }

    function ordinal(n) {
        if (state.lang === 'cz') return '.';
        if (n === 1) return 'st';
        if (n === 2) return 'nd';
        if (n === 3) return 'rd';
        return 'th';
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
    }

    // ===== Minimap =====
    function createMinimap() {
        minimapEl = document.createElement('div');
        minimapEl.className = 'minimap';
        var canvas = document.createElement('canvas');
        canvas.width = 130;
        canvas.height = 130;
        minimapEl.appendChild(canvas);
        gameContainer.appendChild(minimapEl);
        minimapCtx = canvas.getContext('2d');
    }

    function updateMinimap() {
        if (!minimapCtx) return;
        var ctx = minimapCtx;
        var w = 130, h = 130;
        var cx = w / 2, cy = h / 2;
        ctx.clearRect(0, 0, w, h);

        // Find bounds to compute scale
        var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        var pts = TRACK.splinePoints;
        for (var i = 0; i < pts.length; i++) {
            if (pts[i].x < minX) minX = pts[i].x;
            if (pts[i].x > maxX) maxX = pts[i].x;
            if (pts[i].z < minZ) minZ = pts[i].z;
            if (pts[i].z > maxZ) maxZ = pts[i].z;
        }

        var pad = 20;
        var rangeX = maxX - minX;
        var rangeZ = maxZ - minZ;
        var scale = Math.min((w - pad * 2) / rangeX, (h - pad * 2) / rangeZ);
        var midX = (minX + maxX) / 2;
        var midZ = (minZ + maxZ) / 2;

        // Rotate minimap so player's forward direction is UP
        var rot = playerCar ? -playerCar.angle : 0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // Draw track outline (rotated around player)
        ctx.strokeStyle = 'rgba(150,150,150,0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (var j = 0; j < pts.length; j++) {
            var tx = (pts[j].x - midX) * scale;
            var tz = (pts[j].z - midZ) * scale;
            if (j === 0) ctx.moveTo(tx, tz);
            else ctx.lineTo(tx, tz);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw cars
        for (var k = 0; k < allCars.length; k++) {
            var car = allCars[k];
            var carMx = (car.x - midX) * scale;
            var carMz = (car.z - midZ) * scale;
            ctx.fillStyle = car.color;
            ctx.beginPath();
            ctx.arc(carMx, carMz, car.isPlayer ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw direction indicator for player
            if (car.isPlayer) {
                ctx.strokeStyle = car.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(carMx, carMz);
                ctx.lineTo(
                    carMx + Math.sin(car.angle) * 8,
                    carMz + Math.cos(car.angle) * 8
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // ===== Controls hint =====
    function createControlsHint() {
        controlsHintEl = document.createElement('div');
        controlsHintEl.className = 'controls-hint';
        controlsHintEl.textContent = t('controls');
        gameContainer.appendChild(controlsHintEl);

        // Fade out after 5 seconds
        setTimeout(function () {
            if (controlsHintEl) controlsHintEl.style.opacity = '0';
        }, 5000);
    }

    // ===== Camera =====
    function updateCamera() {
        if (!playerCar) return;
        var lookAhead = cfg.cameraLookAhead;
        var targetX = playerCar.x + Math.sin(playerCar.angle) * lookAhead;
        var targetZ = playerCar.z + Math.cos(playerCar.angle) * lookAhead;

        camera.position.x += (playerCar.x - camera.position.x) * 0.08;
        camera.position.z += (playerCar.z - camera.position.z) * 0.08;
        camera.position.y = cfg.cameraHeight;

        camera.lookAt(
            camera.position.x + (targetX - camera.position.x) * 0.3,
            0,
            camera.position.z + (targetZ - camera.position.z) * 0.3
        );
    }

    // ===== Player input =====
    function updatePlayerInput() {
        if (playerCar.finished) {
            playerCar.input = { accelerate: false, brake: false, steerLeft: false, steerRight: false };
            return;
        }
        playerCar.input.accelerate = !!(keys['ArrowUp'] || keys['KeyW']);
        playerCar.input.brake = !!(keys['ArrowDown'] || keys['KeyS'] || keys['Space']);
        playerCar.input.steerLeft = !!(keys['ArrowLeft'] || keys['KeyA']);
        playerCar.input.steerRight = !!(keys['ArrowRight'] || keys['KeyD']);
    }

    // ===== Checkpoint / Lap tracking =====
    function updateCheckpoints(car) {
        var cps = TRACK.checkpoints;

        // Check up to 3 checkpoints per frame to handle fast movement
        for (var attempt = 0; attempt < 3; attempt++) {
            var cp = cps[car.nextCheckpoint];
            if (!TRACK.crossedCheckpoint(cp, car.prevX, car.prevZ, car.x, car.z)) break;

            car.nextCheckpoint++;
            if (car.nextCheckpoint >= cps.length) {
                car.nextCheckpoint = 0;
            }

            if (car.nextCheckpoint === 1) {
                // Just crossed the start/finish line
                car.lap++;
                var lapTime = state.raceElapsed - car.lapStartTime;
                if (car.lap > 0 && car.lapStartTime > 0) {
                    car.lapTimes.push(lapTime);
                }
                car.lapStartTime = state.raceElapsed;

                if (car.lap >= cfg.totalLaps) {
                    car.finished = true;
                    car.finishTime = state.raceElapsed;
                }
            }
        }

        // Race progress based on checkpoints (no getNearestT ambiguity)
        var cpProgress = car.nextCheckpoint / cps.length;
        // When nextCheckpoint=0, car passed all checkpoints and is near finish
        if (car.nextCheckpoint === 0) cpProgress = 1.0;
        car.raceProgress = car.lap + cpProgress;
    }

    // ===== Position tracking =====
    function getPositions() {
        var sorted = allCars.slice().sort(function (a, b) {
            // Finished cars always rank above non-finished
            if (a.finished && b.finished) return a.finishTime - b.finishTime;
            if (a.finished) return -1;
            if (b.finished) return 1;
            return b.raceProgress - a.raceProgress;
        });
        return sorted;
    }

    function getPlayerPosition() {
        var sorted = getPositions();
        for (var i = 0; i < sorted.length; i++) {
            if (sorted[i].isPlayer) return i + 1;
        }
        return allCars.length;
    }

    // ===== Car-to-car collision (oriented bounding box) =====
    var CAR_HALF_LEN = 2.3;  // half of 4.2 + small margin
    var CAR_HALF_WID = 1.2;  // half of 2.2 + small margin

    function resolveCollisions() {
        // Run 2 iterations for better separation
        for (var iter = 0; iter < 2; iter++) {
            for (var i = 0; i < allCars.length; i++) {
                if (allCars[i].parked || allCars[i].finished) continue;
                for (var j = i + 1; j < allCars.length; j++) {
                    if (allCars[j].parked || allCars[j].finished) continue;
                    var a = allCars[i];
                    var b = allCars[j];
                    var dx = b.x - a.x;
                    var dz = b.z - a.z;
                    var dist = Math.sqrt(dx * dx + dz * dz);

                    // Quick reject — no collision possible beyond max diagonal
                    if (dist > 6 || dist < 0.01) continue;

                    // Separation normal
                    var nx = dx / dist;
                    var nz = dz / dist;

                    // Project each car's oriented box onto separation axis
                    // Support function: |dot(axis, fwd)| * halfLen + |dot(axis, right)| * halfWid
                    var sinA = Math.sin(a.angle), cosA = Math.cos(a.angle);
                    var fwdDotA = Math.abs(nx * sinA + nz * cosA);
                    var sideDotA = Math.abs(nx * cosA - nz * sinA);
                    var halfA = fwdDotA * CAR_HALF_LEN + sideDotA * CAR_HALF_WID;

                    var sinB = Math.sin(b.angle), cosB = Math.cos(b.angle);
                    var fwdDotB = Math.abs(nx * sinB + nz * cosB);
                    var sideDotB = Math.abs(nx * cosB - nz * sinB);
                    var halfB = fwdDotB * CAR_HALF_LEN + sideDotB * CAR_HALF_WID;

                    var minDist = halfA + halfB;
                    var overlap = minDist - dist;
                    if (overlap <= 0) continue;

                    // Push apart
                    var pushX = nx * overlap * 0.55;
                    var pushZ = nz * overlap * 0.55;
                    a.x -= pushX;
                    a.z -= pushZ;
                    b.x += pushX;
                    b.z += pushZ;

                    // Velocity exchange (only on first iteration)
                    if (iter === 0) {
                        var relVx = b.vx - a.vx;
                        var relVz = b.vz - a.vz;
                        var relDot = relVx * nx + relVz * nz;
                        if (relDot < 0) {
                            a.vx += relDot * nx * 0.4;
                            a.vz += relDot * nz * 0.4;
                            b.vx -= relDot * nx * 0.4;
                            b.vz -= relDot * nz * 0.4;
                        }
                        a.speed *= 0.95;
                        b.speed *= 0.95;
                    }

                    a._updateMesh();
                    b._updateMesh();
                }
            }
        }
    }

    // ===== Autopilot to parking =====
    function autopilotToParking(car, dt) {
        var spot = parkingSpots[car.parkingIndex];
        if (!spot) { car.parked = true; return; }

        var dx = spot.x - car.x;
        var dz = spot.z - car.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 1) {
            // Arrived at parking spot
            car.x = spot.x;
            car.z = spot.z;
            car.speed = 0;
            car.vx = 0;
            car.vz = 0;
            car.parked = true;
            car._updateMesh();
            return;
        }

        // Direct movement — bypass physics (no drift overshoot)
        var moveSpeed = Math.min(1.5, dist * 0.3);
        var s = dt * 60;
        car.x += (dx / dist) * moveSpeed * s;
        car.z += (dz / dist) * moveSpeed * s;

        // Smoothly rotate to face target
        var targetAngle = Math.atan2(dx, dz);
        var angleDiff = targetAngle - car.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        car.angle += angleDiff * 0.1;

        car.speed = moveSpeed;
        car.vx = 0;
        car.vz = 0;
        car._updateMesh();
    }

    // ===== Game Loop =====
    function gameLoop() {
        animFrameId = requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.05);

        if (state.screen === 'racing') {
            state.raceElapsed += dt;

            // Update player
            if (!playerCar.finished) {
                updatePlayerInput();
                playerCar.update(dt);
            } else if (!playerCar.parked) {
                autopilotToParking(playerCar, dt);
            }

            // Update AI
            for (var i = 0; i < aiDrivers.length; i++) {
                if (!aiCars[i].finished) {
                    aiDrivers[i].update(dt);
                    aiCars[i].update(dt);
                } else if (!aiCars[i].parked) {
                    autopilotToParking(aiCars[i], dt);
                }
            }

            // Checkpoints BEFORE collisions (collision pushback must not
            // affect checkpoint detection — prevX/prevZ would be stale)
            for (var j = 0; j < allCars.length; j++) {
                if (!allCars[j].finished) {
                    updateCheckpoints(allCars[j]);
                }
                // Assign parking spot when car finishes
                if (allCars[j].finished && allCars[j].parkingIndex === undefined) {
                    allCars[j].parkingIndex = finishedCount;
                    finishedCount++;
                }
            }

            // Collisions (skip parked cars)
            resolveCollisions();

            // Show results when player finishes AND is parked (or after short delay)
            if (playerCar.finished && !state.resultsShown) {
                if (playerCar.parked || (state.raceElapsed - playerCar.finishTime > 2)) {
                    state.resultsShown = true;
                    state.screen = 'results';
                    showResults();
                }
            }

            updateCamera();
            updateHUD();
            updateMinimap();
        }

        renderer.render(scene, camera);
    }

    function stopGameLoop() {
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        if (clock) clock.stop();
    }

    // ===== Results Screen =====
    function showResults() {
        clearOverlays();

        var sorted = getPositions();
        var playerPos = 0;
        for (var i = 0; i < sorted.length; i++) {
            if (sorted[i].isPlayer) { playerPos = i + 1; break; }
        }

        var bestLap = Infinity;
        for (var b = 0; b < playerCar.lapTimes.length; b++) {
            if (playerCar.lapTimes[b] < bestLap) bestLap = playerCar.lapTimes[b];
        }

        var tableRows = '';
        for (var k = 0; k < sorted.length; k++) {
            var car = sorted[k];
            var timeStr = car.finished ? formatTime(car.finishTime) : '--';
            var rowClass = car.isPlayer ? ' class="player"' : '';
            var displayName = car.isPlayer ? t('player') : car.name;
            tableRows +=
                '<tr' + rowClass + '>' +
                    '<td class="pos-cell">' + (k + 1) + '</td>' +
                    '<td>' + displayName + '</td>' +
                    '<td>' + timeStr + '</td>' +
                '</tr>';
        }

        overlayEl = document.createElement('div');
        overlayEl.className = 'screen-overlay';
        overlayEl.innerHTML =
            '<div class="screen-panel">' +
                '<h2>' + t('raceComplete') + '</h2>' +
                '<p>' + t('finished') + ' ' + playerPos + ordinal(playerPos) + '</p>' +
                '<table class="results-table">' +
                    '<thead><tr><th>#</th><th>' + t('name') + '</th><th>' + t('time') + '</th></tr></thead>' +
                    '<tbody>' + tableRows + '</tbody>' +
                '</table>' +
                (bestLap < Infinity ? '<p style="margin-bottom:8px">' + t('bestLap') + ': ' + formatTime(bestLap) + '</p>' : '') +
                '<button class="btn-race-again">' + t('restart') + '</button>' +
                '<br><button class="btn-menu">' + t('backToMenu') + '</button>' +
                '<div class="credit">' + t('threejsCredit') + '</div>' +
            '</div>';
        gameContainer.appendChild(overlayEl);

        overlayEl.querySelector('.btn-race-again').addEventListener('click', function () {
            startCountdown();
        });

        overlayEl.querySelector('.btn-menu').addEventListener('click', function () {
            state.screen = 'welcome';
            clearOverlays();
            showWelcome();
            if (renderer && scene && camera) {
                setCameraOverview();
                renderer.render(scene, camera);
            }
        });
    }

    // ===== Init =====
    initScene();
    renderer.render(scene, camera);
    showWelcome();

})();
