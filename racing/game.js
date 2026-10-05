(function () {
    'use strict';

    var cfg = DATA.config;
    var RECORDS_KEY = 'racingRecords';
    var SETTINGS_KEY = 'racingSettings';

    var settings = loadJSON(SETTINGS_KEY);

    var state = {
        lang: localStorage.getItem('lang') || 'en',
        screen: 'welcome',      // welcome | countdown | racing | results
        paused: false,
        difficulty: ['easy', 'medium', 'hard'].indexOf(settings.difficulty) !== -1 ? settings.difficulty : 'medium',
        laps: cfg.lapOptions.indexOf(settings.laps) !== -1 ? settings.laps : cfg.defaultLaps,
        camera: settings.camera === 'top' ? 'top' : 'chase',
        raceElapsed: 0,
        resultsShown: false,
        countdownTimer: null,
        wrongWayTime: 0,
        sessionBestLap: Infinity,
        newBestLap: false,
        newBestRace: false
    };

    var records = loadJSON(RECORDS_KEY);

    // DOM refs
    var headerTitle = document.getElementById('header-title');
    var resetBtn = document.getElementById('btn-reset');
    var themeToggle = document.getElementById('theme-toggle');
    var iconMoon = themeToggle.querySelector('.icon-moon');
    var iconSun = themeToggle.querySelector('.icon-sun');
    var gameContainer = document.getElementById('game-container');

    // Three.js globals
    var scene, camera, renderer, clock;
    var playerCar = null, aiCars = [], allCars = [];
    var aiDrivers = [];
    var parkingSpots = [];
    var finishedCount = 0;
    var camHeading = 0;
    var orbitAngle = 0;

    // Overlay / HUD elements
    var overlayEl, countdownEl, hudEl, hud = {}, minimapEl, minimapCanvas, minimapCtx;
    var controlsHintEl, bannerEl, bannerTimer, wrongWayEl, touchEl;
    var minimapBounds = null;

    // Touch input
    var touchMode = window.matchMedia('(pointer: coarse)').matches;
    var touchInput = { steer: 0, accelerate: false, brake: false };
    var keyboardSteer = 0;

    function loadJSON(key) {
        try {
            var v = JSON.parse(localStorage.getItem(key));
            return v && typeof v === 'object' ? v : {};
        } catch (e) {
            return {};
        }
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
            difficulty: state.difficulty,
            laps: state.laps,
            camera: state.camera
        }));
    }

    function saveRecords() {
        localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    }

    // ===== Translation =====
    function t(key) {
        var obj = DATA.ui[key];
        return obj ? obj[state.lang] : key;
    }

    function tr(value) {
        return typeof value === 'string' ? value : (value[state.lang] || value.en);
    }

    function controlsText() {
        return touchMode ? t('controlsTouch') : t('controlsDesktop');
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
        scene.background = new THREE.Color(isDark ? 0x1f3319 : 0x4a7a2e);
        if (scene.fog) scene.fog.color = scene.background;
        if (scene.userData.ambient) scene.userData.ambient.intensity = isDark ? 0.38 : 0.6;
        if (scene.userData.sun) scene.userData.sun.intensity = isDark ? 0.55 : 0.8;
    }

    // ===== Language pill =====
    var langOpts = document.getElementById('lang-pill').querySelectorAll('.lang-opt');

    function updateLangPill() {
        for (var i = 0; i < langOpts.length; i++) {
            langOpts[i].classList.toggle('active', langOpts[i].getAttribute('data-lang') === state.lang);
        }
    }

    for (var li = 0; li < langOpts.length; li++) {
        langOpts[li].addEventListener('click', function () {
            var newLang = this.getAttribute('data-lang');
            if (newLang === state.lang) return;
            state.lang = newLang;
            localStorage.setItem('lang', newLang);
            updateLangPill();
            updateUIText();
        });
    }

    function updateUIText() {
        headerTitle.textContent = t('title');
        if (state.screen === 'welcome') showWelcome();
        if (state.screen === 'results') showResults();
        if (state.paused) showPause();
        if (hudEl) setHUDLabels();
        if (controlsHintEl) controlsHintEl.textContent = controlsText();
        if (touchEl) setTouchLabels();
        if (wrongWayEl) wrongWayEl.textContent = t('wrongWay');
    }

    // ===== Reset =====
    resetBtn.addEventListener('click', goToMenu);

    updateLangPill();
    headerTitle.textContent = t('title');

    // ===== Keyboard input =====
    var keys = {};
    window.addEventListener('keydown', function (e) {
        if (document.querySelector('.help-modal.is-open')) return;
        keys[e.code] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) !== -1) {
            e.preventDefault();
        }
        if (e.repeat) return;
        if ((e.code === 'KeyP' || e.code === 'Escape') && state.screen === 'racing') {
            togglePause();
        }
        if (e.code === 'KeyC' && state.screen !== 'welcome') {
            state.camera = state.camera === 'chase' ? 'top' : 'chase';
            saveSettings();
            updateCamera(1, true);
        }
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', function () {
        keys = {};
        if (state.screen === 'racing' && !state.paused) togglePause();
    });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden && state.screen === 'racing' && !state.paused) togglePause();
    });

    // Switch to touch UI the first time the screen is touched (e.g. touch laptops)
    window.addEventListener('touchstart', function () {
        if (touchMode) return;
        touchMode = true;
        document.body.classList.add('touch');
        if (state.screen === 'welcome') showWelcome();
        if (state.screen === 'racing' || state.screen === 'countdown') createTouchControls();
        if (controlsHintEl) controlsHintEl.remove();
    }, { passive: true });

    if (touchMode) document.body.classList.add('touch');

    gameContainer.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // ===== Three.js Scene =====
    function initScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x4a7a2e);
        scene.fog = new THREE.FogExp2(scene.background, 0.0018);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchMode ? 1.5 : 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        gameContainer.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
        clock = new THREE.Clock();

        var ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        scene.userData.ambient = ambient;

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
        scene.userData.sun = sun;

        scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a7d0a, 0.3));

        TRACK.createTrackMesh(scene);
        updateSceneTheme();
        computeMinimapBounds();

        onResize();
        if (window.ResizeObserver) {
            new ResizeObserver(onResize).observe(gameContainer);
        } else {
            window.addEventListener('resize', onResize);
        }
    }

    function onResize() {
        if (!renderer || !camera) return;
        var w = gameContainer.clientWidth || window.innerWidth;
        var h = gameContainer.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (minimapCanvas) sizeMinimap();
    }

    // ===== Cars =====
    function initCars() {
        for (var r = 0; r < allCars.length; r++) {
            scene.remove(allCars[r].mesh);
        }
        allCars = [];
        aiCars = [];
        aiDrivers = [];

        var positions = TRACK.getStartPositions(1 + cfg.aiCount);
        parkingSpots = TRACK.getParkingPositions(1 + cfg.aiCount);
        finishedCount = 0;

        playerCar = new Car({
            x: positions[0].x,
            z: positions[0].z,
            angle: positions[0].angle,
            isPlayer: true,
            color: cfg.carColors[0],
            name: 'player',
            index: 0
        });
        scene.add(playerCar.mesh);
        allCars.push(playerCar);

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
        camHeading = playerCar.angle;
    }

    function carName(car) {
        return car.isPlayer ? t('player') : tr(car.name);
    }

    // ===== Overlays =====
    function clearOverlays() {
        if (overlayEl) { overlayEl.remove(); overlayEl = null; }
        if (countdownEl) { countdownEl.remove(); countdownEl = null; }
        if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
        removeRaceUI();
    }

    function removeRaceUI() {
        if (hudEl) { hudEl.remove(); hudEl = null; hud = {}; }
        if (minimapEl) { minimapEl.remove(); minimapEl = null; minimapCanvas = null; minimapCtx = null; }
        if (controlsHintEl) { controlsHintEl.remove(); controlsHintEl = null; }
        if (bannerEl) { bannerEl.remove(); bannerEl = null; }
        if (wrongWayEl) { wrongWayEl.remove(); wrongWayEl = null; }
        removeTouchControls();
    }

    function showOverlay(html) {
        if (overlayEl) overlayEl.remove();
        overlayEl = document.createElement('div');
        overlayEl.className = 'screen-overlay';
        overlayEl.innerHTML = '<div class="screen-panel">' + html + '</div>';
        gameContainer.appendChild(overlayEl);
        return overlayEl;
    }

    function segmented(name, options, current) {
        return '<div class="seg" data-group="' + name + '">' + options.map(function (o) {
            return '<button type="button" class="seg-btn' + (String(o.value) === String(current) ? ' active' : '') +
                '" data-value="' + o.value + '">' + o.label + '</button>';
        }).join('') + '</div>';
    }

    // ===== Welcome Screen =====
    function showWelcome() {
        clearOverlays();
        state.screen = 'welcome';
        state.paused = false;
        initCars();

        var controlsPreview = touchMode
            ? '<div class="touch-preview" aria-hidden="true">' +
                '<span class="tp-pad"><span></span></span>' +
                '<span class="tp-pedals"><span class="tp-brake">' + t('brake') + '</span><span class="tp-gas">' + t('gas') + '</span></span>' +
              '</div>'
            : '<div class="controls-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><span>/</span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>';

        var raceRecord = records['race' + state.laps];
        var recordsHtml = (records.bestLap || raceRecord)
            ? '<div class="records">' +
                '<div><span>' + t('bestLap') + '</span><strong>' + (records.bestLap ? formatTime(records.bestLap) : '—') + '</strong></div>' +
                '<div><span>' + t('bestRace') + ' · ' + state.laps + ' ' + t('laps').toLowerCase() + '</span><strong>' + (raceRecord ? formatTime(raceRecord) : '—') + '</strong></div>' +
              '</div>'
            : '<div class="records empty">' + t('noRecords') + '</div>';

        var el = showOverlay(
            '<h2>' + t('title') + '</h2>' +
            '<p class="sub">' + t('subtitle') + '</p>' +
            '<div class="options">' +
                '<div class="opt"><div class="opt-label">' + t('difficulty') + '</div>' +
                    segmented('difficulty', [
                        { value: 'easy', label: t('easy') },
                        { value: 'medium', label: t('medium') },
                        { value: 'hard', label: t('hard') }
                    ], state.difficulty) + '</div>' +
                '<div class="opt"><div class="opt-label">' + t('laps') + '</div>' +
                    segmented('laps', cfg.lapOptions.map(function (n) { return { value: n, label: String(n) }; }), state.laps) + '</div>' +
                '<div class="opt"><div class="opt-label">' + t('camera') + '</div>' +
                    segmented('camera', [
                        { value: 'chase', label: t('camChase') },
                        { value: 'top', label: t('camTop') }
                    ], state.camera) + '</div>' +
            '</div>' +
            recordsHtml +
            '<button type="button" class="btn-start">' + t('start') + '</button>' +
            '<div class="controls-info">' + controlsPreview +
                '<div class="controls-desc">' + controlsText() + '</div>' +
            '</div>' +
            '<div class="credit">' + t('threejsCredit') + '</div>'
        );

        el.querySelectorAll('.seg').forEach(function (group) {
            group.addEventListener('click', function (e) {
                var btn = e.target.closest('.seg-btn');
                if (!btn) return;
                var name = group.getAttribute('data-group');
                var value = btn.getAttribute('data-value');
                if (name === 'laps') value = parseInt(value, 10);
                state[name] = value;
                saveSettings();
                if (name === 'laps') {
                    showWelcome();
                    return;
                }
                group.querySelectorAll('.seg-btn').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
            });
        });

        el.querySelector('.btn-start').addEventListener('click', startCountdown);
    }

    function goToMenu() {
        showWelcome();
    }

    // ===== Countdown =====
    function startCountdown() {
        clearOverlays();
        initCars();
        state.screen = 'countdown';
        state.paused = false;
        state.resultsShown = false;
        state.raceElapsed = 0;
        state.wrongWayTime = 0;
        state.sessionBestLap = Infinity;
        state.newBestLap = false;
        state.newBestRace = false;
        keyboardSteer = 0;

        updateCamera(1, true);
        createRaceUI();

        var value = 3;
        countdownEl = document.createElement('div');
        countdownEl.className = 'countdown';
        gameContainer.appendChild(countdownEl);

        function renderCountdown() {
            var lights = '';
            for (var i = 0; i < 3; i++) {
                lights += '<span class="light' + (value <= 0 ? ' go' : (i < 4 - value ? ' on' : '')) + '"></span>';
            }
            countdownEl.innerHTML =
                '<div class="lights">' + lights + '</div>' +
                '<span class="countdown-num">' + (value > 0 ? value : t('go')) + '</span>';
        }
        renderCountdown();

        state.countdownTimer = setInterval(function () {
            value--;
            if (value >= 0) {
                renderCountdown();
                if (value === 0) {
                    state.screen = 'racing';
                }
            } else {
                clearInterval(state.countdownTimer);
                state.countdownTimer = null;
                countdownEl.remove();
                countdownEl = null;
            }
        }, 800);
    }

    // ===== Race UI =====
    function createRaceUI() {
        createHUD();
        createMinimap();

        bannerEl = document.createElement('div');
        bannerEl.className = 'race-banner';
        gameContainer.appendChild(bannerEl);

        wrongWayEl = document.createElement('div');
        wrongWayEl.className = 'wrong-way';
        wrongWayEl.textContent = t('wrongWay');
        gameContainer.appendChild(wrongWayEl);

        if (touchMode) {
            createTouchControls();
        } else {
            controlsHintEl = document.createElement('div');
            controlsHintEl.className = 'controls-hint';
            controlsHintEl.textContent = controlsText();
            gameContainer.appendChild(controlsHintEl);
            setTimeout(function () {
                if (controlsHintEl) controlsHintEl.classList.add('hidden');
            }, 6000);
        }
    }

    function createHUD() {
        hudEl = document.createElement('div');
        hudEl.className = 'hud';
        hudEl.innerHTML =
            '<div class="hud-group">' +
                '<div class="hud-block"><div class="hud-label" data-k="position"></div><div class="hud-value" data-v="pos"></div></div>' +
                '<div class="hud-block"><div class="hud-label" data-k="lap"></div><div class="hud-value-sm" data-v="lap"></div></div>' +
            '</div>' +
            '<div class="hud-group hud-right">' +
                '<div class="hud-block hud-time"><div class="hud-label" data-k="lapTime"></div><div class="hud-value-sm" data-v="time"></div><div class="hud-sub" data-v="best"></div></div>' +
                '<div class="hud-block hud-speed"><div class="hud-label" data-k="speed"></div><div class="hud-value-sm" data-v="speed"></div></div>' +
                '<button type="button" class="hud-btn" data-a="pause" aria-label="Pause"><svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg></button>' +
            '</div>';
        gameContainer.appendChild(hudEl);

        ['pos', 'lap', 'time', 'best', 'speed'].forEach(function (k) {
            hud[k] = hudEl.querySelector('[data-v="' + k + '"]');
        });
        hudEl.querySelector('[data-a="pause"]').addEventListener('click', function () {
            if (state.screen === 'racing') togglePause();
        });
        setHUDLabels();
        updateHUD();
    }

    function setHUDLabels() {
        hudEl.querySelectorAll('[data-k]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-k'));
        });
    }

    function setText(el, text) {
        if (el && el.textContent !== text) el.textContent = text;
    }

    function updateHUD() {
        if (!hudEl || !playerCar) return;
        var pos = getPlayerPosition();
        setText(hud.pos, pos + ordinal(pos) + ' / ' + allCars.length);
        setText(hud.lap, Math.min(playerCar.lap + 1, state.laps) + ' / ' + state.laps);
        setText(hud.speed, playerCar.getDisplaySpeed() + ' km/h');
        var lapElapsed = playerCar.finished ? 0 : state.raceElapsed - playerCar.lapStartTime;
        setText(hud.time, formatTime(lapElapsed));
        var best = Math.min(state.sessionBestLap, records.bestLap || Infinity);
        setText(hud.best, best < Infinity ? t('bestLap') + ' ' + formatTime(best) : '');
    }

    function ordinal(n) {
        if (state.lang === 'cz') return '.';
        var mod100 = n % 100;
        if (mod100 >= 11 && mod100 <= 13) return 'th';
        if (n % 10 === 1) return 'st';
        if (n % 10 === 2) return 'nd';
        if (n % 10 === 3) return 'rd';
        return 'th';
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds - m * 60;
        return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
    }

    function showBanner(text, kind) {
        if (!bannerEl) return;
        bannerEl.textContent = text;
        bannerEl.className = 'race-banner show' + (kind ? ' ' + kind : '');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(function () {
            if (bannerEl) bannerEl.className = 'race-banner';
        }, 1800);
    }

    // ===== Pause =====
    function togglePause() {
        state.paused = !state.paused;
        if (state.paused) {
            keys = {};
            showPause();
        } else if (overlayEl) {
            overlayEl.remove();
            overlayEl = null;
        }
    }

    function showPause() {
        var el = showOverlay(
            '<h2>' + t('paused') + '</h2>' +
            '<button type="button" class="btn-start" data-a="resume">' + t('resume') + '</button>' +
            '<div class="btn-row">' +
                '<button type="button" class="btn-menu" data-a="restart">' + t('restartRace') + '</button>' +
                '<button type="button" class="btn-menu" data-a="menu">' + t('backToMenu') + '</button>' +
            '</div>'
        );
        el.querySelector('[data-a="resume"]').addEventListener('click', togglePause);
        el.querySelector('[data-a="restart"]').addEventListener('click', startCountdown);
        el.querySelector('[data-a="menu"]').addEventListener('click', goToMenu);
    }

    // ===== Minimap =====
    function computeMinimapBounds() {
        var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        var pts = TRACK.splinePoints;
        for (var i = 0; i < pts.length; i++) {
            minX = Math.min(minX, pts[i].x);
            maxX = Math.max(maxX, pts[i].x);
            minZ = Math.min(minZ, pts[i].z);
            maxZ = Math.max(maxZ, pts[i].z);
        }
        var half = Math.max(maxX - minX, maxZ - minZ) / 2;
        // Radius that fits the track at any rotation
        var radius = 0;
        var midX = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2;
        for (var j = 0; j < pts.length; j++) {
            radius = Math.max(radius, Math.hypot(pts[j].x - midX, pts[j].z - midZ));
        }
        minimapBounds = { midX: midX, midZ: midZ, half: half, radius: radius };
    }

    function createMinimap() {
        minimapEl = document.createElement('div');
        minimapEl.className = 'minimap';
        minimapCanvas = document.createElement('canvas');
        minimapEl.appendChild(minimapCanvas);
        gameContainer.appendChild(minimapEl);
        minimapCtx = minimapCanvas.getContext('2d');
        sizeMinimap();
    }

    function sizeMinimap() {
        var size = minimapEl.clientWidth || 120;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        minimapCanvas.width = size * dpr;
        minimapCanvas.height = size * dpr;
        minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        minimapCanvas.dataset.size = size;
    }

    function updateMinimap() {
        if (!minimapCtx || !minimapBounds) return;
        var ctx = minimapCtx;
        var size = +minimapCanvas.dataset.size;
        var b = minimapBounds;
        var chase = state.camera === 'chase';
        var scale = (size / 2 - 10) / (chase ? b.radius : b.half + 8);
        // Map world -> minimap so it matches the on-screen orientation
        var fx = Math.sin(camHeading), fz = Math.cos(camHeading);

        function map(x, z) {
            var dx = x - b.midX, dz = z - b.midZ;
            if (!chase) return [size / 2 + dx * scale, size / 2 + dz * scale];
            return [size / 2 + (-dx * fz + dz * fx) * scale, size / 2 - (dx * fx + dz * fz) * scale];
        }

        ctx.clearRect(0, 0, size, size);

        var pts = TRACK.splinePoints;
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) {
            var p = map(pts[i].x, pts[i].z);
            if (i === 0) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
        }
        ctx.closePath();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(120,128,140,0.45)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Start/finish marker
        var s0 = TRACK.getPointAtT(0);
        var sp = map(s0.x, s0.z);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sp[0] - 2, sp[1] - 2, 4, 4);

        for (var k = allCars.length - 1; k >= 0; k--) {
            var car = allCars[k];
            var cp = map(car.x, car.z);
            ctx.beginPath();
            ctx.arc(cp[0], cp[1], car.isPlayer ? 4.5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = car.color;
            ctx.fill();
            if (car.isPlayer) {
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            }
        }
    }

    // ===== Touch controls =====
    function createTouchControls() {
        if (touchEl) return;
        touchEl = document.createElement('div');
        touchEl.className = 'touch-controls';
        touchEl.innerHTML =
            '<div class="steer-pad">' +
                '<div class="steer-track"><span class="steer-arrow left">‹</span><span class="steer-knob"></span><span class="steer-arrow right">›</span></div>' +
                '<span class="touch-label" data-k="steer"></span>' +
            '</div>' +
            '<div class="pedals">' +
                '<div class="pedal pedal-brake" data-k="brake"></div>' +
                '<div class="pedal pedal-gas" data-k="gas"></div>' +
            '</div>';
        gameContainer.appendChild(touchEl);
        setTouchLabels();
        bindSteerPad(touchEl.querySelector('.steer-pad'));
        bindPedals(touchEl.querySelector('.pedals'));
    }

    function setTouchLabels() {
        touchEl.querySelectorAll('[data-k]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-k'));
        });
    }

    function removeTouchControls() {
        if (touchEl) { touchEl.remove(); touchEl = null; }
        touchInput.steer = 0;
        touchInput.accelerate = false;
        touchInput.brake = false;
    }

    // Analog steering: knob position relative to the centre of the pad
    function bindSteerPad(pad) {
        var knob = pad.querySelector('.steer-knob');
        var track = pad.querySelector('.steer-track');
        var pointerId = null;
        var originX = 0;

        function range() {
            return Math.max(40, track.clientWidth / 2 - 22);
        }

        function set(dx) {
            var r = range();
            var v = Math.max(-1, Math.min(1, dx / r));
            // Small dead zone in the middle, then linear
            var steer = Math.abs(v) < 0.08 ? 0 : (v - Math.sign(v) * 0.08) / 0.92;
            touchInput.steer = -steer; // car convention: positive = left
            knob.style.transform = 'translateX(' + (v * r) + 'px)';
            pad.classList.toggle('steering', v !== 0);
        }

        pad.addEventListener('pointerdown', function (e) {
            if (pointerId !== null) return;
            e.preventDefault();
            pointerId = e.pointerId;
            pad.setPointerCapture(pointerId);
            var rect = track.getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            set(e.clientX - originX);
        });
        pad.addEventListener('pointermove', function (e) {
            if (e.pointerId !== pointerId) return;
            set(e.clientX - originX);
        });
        function release(e) {
            if (e.pointerId !== pointerId) return;
            pointerId = null;
            set(0);
        }
        pad.addEventListener('pointerup', release);
        pad.addEventListener('pointercancel', release);
        pad.addEventListener('lostpointercapture', release);
    }

    // Pedal zone tracks every pointer so a thumb can slide between GAS and BRAKE
    function bindPedals(zone) {
        var gasEl = zone.querySelector('.pedal-gas');
        var brakeEl = zone.querySelector('.pedal-brake');
        var active = {};

        function hit(el, x, y) {
            var r = el.getBoundingClientRect();
            return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 30 && y <= r.bottom + 30;
        }

        function refresh() {
            var gas = false, brake = false;
            for (var id in active) {
                if (active[id] === 'gas') gas = true;
                if (active[id] === 'brake') brake = true;
            }
            touchInput.accelerate = gas;
            touchInput.brake = brake;
            gasEl.classList.toggle('active', gas);
            brakeEl.classList.toggle('active', brake);
        }

        function track(e) {
            if (hit(gasEl, e.clientX, e.clientY)) active[e.pointerId] = 'gas';
            else if (hit(brakeEl, e.clientX, e.clientY)) active[e.pointerId] = 'brake';
            else active[e.pointerId] = null;
            refresh();
        }

        zone.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            zone.setPointerCapture(e.pointerId);
            track(e);
            if (navigator.vibrate && active[e.pointerId]) navigator.vibrate(8);
        });
        zone.addEventListener('pointermove', function (e) {
            if (e.pointerId in active) track(e);
        });
        function release(e) {
            delete active[e.pointerId];
            refresh();
        }
        zone.addEventListener('pointerup', release);
        zone.addEventListener('pointercancel', release);
        zone.addEventListener('lostpointercapture', release);
    }

    // ===== Camera =====
    function angleDelta(a, b) {
        var d = a - b;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return d;
    }

    function updateCamera(dt, snap) {
        if (!playerCar) return;
        var s = dt * 60;
        var portrait = camera.aspect < 1;
        var speedFactor = Math.min(Math.abs(playerCar.speed) / cfg.maxSpeed, 1);
        var fov;

        if (state.camera === 'chase') {
            camHeading += angleDelta(playerCar.angle, camHeading) * (snap ? 1 : 1 - Math.pow(1 - 0.07, s));
            var fx = Math.sin(camHeading), fz = Math.cos(camHeading);
            var height = cfg.chaseHeight * (portrait ? 1.2 : 1);
            var back = cfg.chaseDistance * (portrait ? 1.15 : 1);
            var tx = playerCar.x - fx * back;
            var tz = playerCar.z - fz * back;
            var k = snap ? 1 : 1 - Math.pow(1 - 0.35, s);
            camera.position.x += (tx - camera.position.x) * k;
            camera.position.z += (tz - camera.position.z) * k;
            camera.position.y = height;
            camera.up.set(0, 1, 0);
            camera.lookAt(playerCar.x + fx * cfg.chaseLookAhead, 0, playerCar.z + fz * cfg.chaseLookAhead);
            fov = (portrait ? 68 : 52) + speedFactor * 6;
        } else {
            // Fixed-orientation overhead view (north up)
            camHeading = Math.PI;
            var lead = cfg.cameraLookAhead * speedFactor;
            var cx = playerCar.x + Math.sin(playerCar.angle) * lead;
            var cz = playerCar.z + Math.cos(playerCar.angle) * lead;
            var kk = snap ? 1 : 1 - Math.pow(1 - 0.12, s);
            camera.position.x += (cx - camera.position.x) * kk;
            camera.position.z += (cz + 12 - camera.position.z) * kk;
            camera.position.y = cfg.cameraHeight * (portrait ? 1.35 : 1);
            camera.up.set(0, 1, 0);
            camera.lookAt(camera.position.x, 0, camera.position.z - 12);
            fov = 50;
        }

        if (Math.abs(camera.fov - fov) > 0.01) {
            camera.fov = snap ? fov : camera.fov + (fov - camera.fov) * 0.1;
            camera.updateProjectionMatrix();
        }
    }

    // Slow orbit over the circuit behind the menu
    function updateOrbitCamera(dt) {
        orbitAngle += dt * 0.06;
        var aspect = camera.aspect;
        var height = 150 / Math.min(1, Math.pow(aspect, 0.85));
        camera.fov = 50;
        camera.updateProjectionMatrix();
        camera.position.set(Math.sin(orbitAngle) * 70, height, Math.cos(orbitAngle) * 70);
        camera.lookAt(0, 0, 0);
    }

    // ===== Player input =====
    function updatePlayerInput(dt) {
        var left = keys['ArrowLeft'] || keys['KeyA'];
        var right = keys['ArrowRight'] || keys['KeyD'];
        var target = (left ? 1 : 0) - (right ? 1 : 0);
        var rate = target === 0 || target * keyboardSteer < 0 ? cfg.steerRampOut : cfg.steerRampIn;
        var step = rate * dt;
        if (Math.abs(target - keyboardSteer) <= step) keyboardSteer = target;
        else keyboardSteer += step * Math.sign(target - keyboardSteer);

        playerCar.input.accelerate = !!(keys['ArrowUp'] || keys['KeyW']) || touchInput.accelerate;
        playerCar.input.brake = !!(keys['ArrowDown'] || keys['KeyS'] || keys['Space']) || touchInput.brake;
        playerCar.input.steer = Math.abs(keyboardSteer) > Math.abs(touchInput.steer) ? keyboardSteer : touchInput.steer;
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
                car.lapTimes.push(lapTime);
                car.lapStartTime = state.raceElapsed;

                if (car.lap >= state.laps) {
                    car.finished = true;
                    car.finishTime = state.raceElapsed;
                }
                if (car.isPlayer) onPlayerLap(lapTime);
            }
        }

        var cpProgress = car.nextCheckpoint / cps.length;
        if (car.nextCheckpoint === 0) cpProgress = 1.0;
        car.raceProgress = car.lap + cpProgress;
    }

    function onPlayerLap(lapTime) {
        var prevBest = Math.min(state.sessionBestLap, records.bestLap || Infinity);
        state.sessionBestLap = Math.min(state.sessionBestLap, lapTime);
        if (!records.bestLap || lapTime < records.bestLap) {
            records.bestLap = lapTime;
            state.newBestLap = true;
            saveRecords();
        }

        if (playerCar.finished) {
            var key = 'race' + state.laps;
            if (!records[key] || playerCar.finishTime < records[key]) {
                records[key] = playerCar.finishTime;
                state.newBestRace = true;
                saveRecords();
            }
            return;
        }

        if (lapTime < prevBest && prevBest < Infinity) {
            showBanner(t('newBestLap') + ' ' + formatTime(lapTime), 'good');
        } else if (playerCar.lap === state.laps - 1) {
            showBanner(t('finalLap'), 'final');
        } else {
            showBanner(t('lap') + ' ' + (playerCar.lap + 1) + ' / ' + state.laps + ' · ' + formatTime(lapTime));
        }
    }

    function updateWrongWay(dt) {
        if (!wrongWayEl) return;
        var v = Math.hypot(playerCar.vx, playerCar.vz);
        var wrong = false;
        if (v > 0.3 && !playerCar.finished) {
            var tan = TRACK.getTangent(TRACK.getNearestT(playerCar.x, playerCar.z));
            wrong = (playerCar.vx * tan.x + playerCar.vz * tan.z) / v < -0.4;
        }
        state.wrongWayTime = wrong ? state.wrongWayTime + dt : 0;
        wrongWayEl.classList.toggle('show', state.wrongWayTime > 1);
    }

    // ===== Position tracking =====
    function getPositions() {
        return allCars.slice().sort(function (a, b) {
            if (a.finished && b.finished) return a.finishTime - b.finishTime;
            if (a.finished) return -1;
            if (b.finished) return 1;
            return b.raceProgress - a.raceProgress;
        });
    }

    function getPlayerPosition() {
        var sorted = getPositions();
        for (var i = 0; i < sorted.length; i++) {
            if (sorted[i].isPlayer) return i + 1;
        }
        return allCars.length;
    }

    // ===== Car-to-car collision (oriented bounding box) =====
    var CAR_HALF_LEN = 2.3;
    var CAR_HALF_WID = 1.2;

    function resolveCollisions() {
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

                    if (dist > 6 || dist < 0.01) continue;

                    var nx = dx / dist;
                    var nz = dz / dist;

                    var sinA = Math.sin(a.angle), cosA = Math.cos(a.angle);
                    var halfA = Math.abs(nx * sinA + nz * cosA) * CAR_HALF_LEN + Math.abs(nx * cosA - nz * sinA) * CAR_HALF_WID;

                    var sinB = Math.sin(b.angle), cosB = Math.cos(b.angle);
                    var halfB = Math.abs(nx * sinB + nz * cosB) * CAR_HALF_LEN + Math.abs(nx * cosB - nz * sinB) * CAR_HALF_WID;

                    var overlap = halfA + halfB - dist;
                    if (overlap <= 0) continue;

                    var pushX = nx * overlap * 0.55;
                    var pushZ = nz * overlap * 0.55;
                    a.x -= pushX;
                    a.z -= pushZ;
                    b.x += pushX;
                    b.z += pushZ;

                    if (iter === 0) {
                        var relDot = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
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
            car.x = spot.x;
            car.z = spot.z;
            car.speed = 0;
            car.vx = 0;
            car.vz = 0;
            car.parked = true;
            car._updateMesh();
            return;
        }

        var moveSpeed = Math.min(1.5, dist * 0.3);
        var s = dt * 60;
        car.x += (dx / dist) * moveSpeed * s;
        car.z += (dz / dist) * moveSpeed * s;
        car.angle += angleDelta(Math.atan2(dx, dz), car.angle) * 0.1;

        car.speed = moveSpeed;
        car.vx = 0;
        car.vz = 0;
        car._updateMesh();
    }

    // ===== Simulation step =====
    function simulate(dt) {
        if (state.screen === 'racing') state.raceElapsed += dt;

        if (!playerCar.finished) {
            updatePlayerInput(dt);
            playerCar.update(dt);
        } else if (!playerCar.parked) {
            autopilotToParking(playerCar, dt);
        }

        for (var i = 0; i < aiDrivers.length; i++) {
            if (!aiCars[i].finished) {
                aiDrivers[i].update(dt);
                aiCars[i].update(dt);
            } else if (!aiCars[i].parked) {
                autopilotToParking(aiCars[i], dt);
            }
        }

        // Checkpoints BEFORE barriers so pushback doesn't hide crossings
        for (var j = 0; j < allCars.length; j++) {
            if (!allCars[j].finished) updateCheckpoints(allCars[j]);
            if (allCars[j].finished && allCars[j].parkingIndex === undefined) {
                allCars[j].parkingIndex = finishedCount++;
            }
        }

        for (var b = 0; b < allCars.length; b++) {
            if (!allCars[b].finished && !allCars[b].parked) allCars[b].applyBarrier();
        }

        resolveCollisions();
    }

    // ===== Game Loop =====
    function gameLoop() {
        requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.05);

        if (state.screen === 'welcome') {
            updateOrbitCamera(dt);
        } else if (state.screen === 'countdown') {
            updateCamera(dt);
        } else if (!state.paused) {
            simulate(dt);

            if (state.screen === 'racing') {
                updateWrongWay(dt);
                if (playerCar.finished && !state.resultsShown &&
                    (playerCar.parked || state.raceElapsed - playerCar.finishTime > 2)) {
                    state.resultsShown = true;
                    state.screen = 'results';
                    showResults();
                }
            }

            updateCamera(dt);
            updateHUD();
            updateMinimap();
        }

        renderer.render(scene, camera);
    }

    // ===== Results Screen =====
    function showResults() {
        removeRaceUI();

        var sorted = getPositions();
        var playerPos = getPlayerPosition();

        var rows = sorted.map(function (car, k) {
            return '<tr' + (car.isPlayer ? ' class="player"' : '') + '>' +
                '<td class="pos-cell">' + (k + 1) + '</td>' +
                '<td><span class="dot" style="background:' + car.color + '"></span>' + carName(car) + '</td>' +
                '<td class="num">' + (car.finished ? formatTime(car.finishTime) : '—') + '</td>' +
            '</tr>';
        }).join('');

        var best = Math.min.apply(null, playerCar.lapTimes);
        var laps = playerCar.lapTimes.map(function (lt, i) {
            return '<span class="lap-chip' + (lt === best ? ' best' : '') + '">' + (i + 1) + '. ' + formatTime(lt) + '</span>';
        }).join('');

        var badges = '';
        if (state.newBestRace) badges += '<span class="badge">' + t('newRecord') + '</span>';
        if (state.newBestLap) badges += '<span class="badge">' + t('newBestLap') + '</span>';

        var el = showOverlay(
            '<div class="place place-' + playerPos + '">' + playerPos + ordinal(playerPos) + '</div>' +
            '<h2>' + t('raceComplete') + '</h2>' +
            (badges ? '<div class="badges">' + badges + '</div>' : '') +
            '<table class="results-table">' +
                '<thead><tr><th>#</th><th>' + t('name') + '</th><th class="num">' + t('time') + '</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table>' +
            (laps ? '<div class="opt-label">' + t('lapTimes') + '</div><div class="lap-list">' + laps + '</div>' : '') +
            '<button type="button" class="btn-start" data-a="again">' + t('restart') + '</button>' +
            '<div class="btn-row"><button type="button" class="btn-menu" data-a="menu">' + t('backToMenu') + '</button></div>'
        );

        el.querySelector('[data-a="again"]').addEventListener('click', startCountdown);
        el.querySelector('[data-a="menu"]').addEventListener('click', goToMenu);
    }

    // ===== Init =====
    initScene();
    showWelcome();
    gameLoop();

})();
