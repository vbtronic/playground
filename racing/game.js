(function () {
    'use strict';

    var cfg = DATA.config;

    var state = {
        lang: localStorage.getItem('lang') || 'en',
        screen: 'welcome',      // welcome | countdown | racing | results
        difficulty: 'medium',
        raceStartTime: 0,
        raceElapsed: 0,
        countdownValue: 3
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
        scene.fog = new THREE.FogExp2(scene.background, 0.004);

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
            500
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
        sun.shadow.camera.left = -80;
        sun.shadow.camera.right = 80;
        sun.shadow.camera.top = 80;
        sun.shadow.camera.bottom = -80;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 150;
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
        camera.position.set(0, 90, 30);
        camera.lookAt(0, 0, 0);
    }

    // ===== Countdown =====
    function startCountdown() {
        clearOverlays();
        initCars();
        state.screen = 'countdown';
        state.countdownValue = 3;

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
        ctx.clearRect(0, 0, w, h);

        // Find bounds of track
        var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        var pts = TRACK.splinePoints;
        for (var i = 0; i < pts.length; i++) {
            if (pts[i].x < minX) minX = pts[i].x;
            if (pts[i].x > maxX) maxX = pts[i].x;
            if (pts[i].z < minZ) minZ = pts[i].z;
            if (pts[i].z > maxZ) maxZ = pts[i].z;
        }

        var pad = 15;
        var scaleX = (w - pad * 2) / (maxX - minX);
        var scaleZ = (h - pad * 2) / (maxZ - minZ);
        var scale = Math.min(scaleX, scaleZ);
        var offX = (w - (maxX - minX) * scale) / 2;
        var offZ = (h - (maxZ - minZ) * scale) / 2;

        function toMX(x) { return (x - minX) * scale + offX; }
        function toMZ(z) { return (z - minZ) * scale + offZ; }

        // Draw track outline
        ctx.strokeStyle = 'rgba(150,150,150,0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (var j = 0; j < pts.length; j++) {
            var mx = toMX(pts[j].x);
            var mz = toMZ(pts[j].z);
            if (j === 0) ctx.moveTo(mx, mz);
            else ctx.lineTo(mx, mz);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw cars
        for (var k = 0; k < allCars.length; k++) {
            var car = allCars[k];
            ctx.fillStyle = car.color;
            ctx.beginPath();
            ctx.arc(toMX(car.x), toMZ(car.z), car.isPlayer ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
        }
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
        var cp = cps[car.nextCheckpoint];

        if (TRACK.crossedCheckpoint(cp, car.prevX, car.prevZ, car.x, car.z)) {
            car.nextCheckpoint++;

            if (car.nextCheckpoint >= cps.length) {
                // Completed a lap when crossing checkpoint 0 (start/finish)
                car.nextCheckpoint = 0;
            }

            if (car.nextCheckpoint === 1) {
                // Just crossed the start/finish line
                car.lap++;
                if (car.lap > 0 && car.lapStartTime > 0) {
                    car.lapTimes.push(state.raceElapsed - car.lapStartTime);
                }
                car.lapStartTime = state.raceElapsed;

                if (car.lap >= cfg.totalLaps) {
                    car.finished = true;
                    car.finishTime = state.raceElapsed;
                }
            }
        }

        // Precise race progress using actual track position
        var trackT = TRACK.getNearestT(car.x, car.z);
        // Handle wrap-around near start/finish line
        if (car.nextCheckpoint > cps.length / 2 && trackT < 0.25) {
            trackT += 1.0;
        }
        if (car.nextCheckpoint <= 1 && trackT > 0.75) {
            trackT -= 1.0;
        }
        car.raceProgress = car.lap + trackT;
    }

    // ===== Position tracking =====
    function getPositions() {
        var sorted = allCars.slice().sort(function (a, b) {
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

    // ===== Car-to-car collision =====
    function resolveCollisions() {
        var collisionRadius = 2.5;
        for (var i = 0; i < allCars.length; i++) {
            for (var j = i + 1; j < allCars.length; j++) {
                var a = allCars[i];
                var b = allCars[j];
                var dx = b.x - a.x;
                var dz = b.z - a.z;
                var dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < collisionRadius && dist > 0) {
                    var overlap = collisionRadius - dist;
                    var nx = dx / dist;
                    var nz = dz / dist;
                    var pushX = nx * overlap * 0.5;
                    var pushZ = nz * overlap * 0.5;

                    a.x -= pushX;
                    a.z -= pushZ;
                    b.x += pushX;
                    b.z += pushZ;

                    // Reduce speeds slightly
                    a.speed *= 0.9;
                    b.speed *= 0.9;

                    a._updateMesh();
                    b._updateMesh();
                }
            }
        }
    }

    // ===== Game Loop =====
    function gameLoop() {
        animFrameId = requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.05);

        if (state.screen === 'racing') {
            state.raceElapsed += dt;

            // Update player
            updatePlayerInput();
            playerCar.update(dt);

            // Update AI
            for (var i = 0; i < aiDrivers.length; i++) {
                aiDrivers[i].update(dt);
                aiCars[i].update(dt);
            }

            // Collisions
            resolveCollisions();

            // Checkpoints
            for (var j = 0; j < allCars.length; j++) {
                updateCheckpoints(allCars[j]);
            }

            // Check race end
            if (playerCar.finished) {
                // Let AI finish or just show results
                stopGameLoop();
                state.screen = 'results';
                showResults();
            } else {
                // Check if all AI finished (shouldn't end race, player still racing)
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
