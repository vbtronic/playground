(function () {
    'use strict';

    var state = {
        lang: 'en',
        screen: 'welcome',
        spectrum: null,
        currentQuestion: 0,
        answers: []
    };

    var app = document.getElementById('app');
    var headerTitle = document.getElementById('header-title');
    var resetBtn = document.getElementById('btn-reset');
    var themeToggle = document.getElementById('theme-toggle');
    var iconMoon = themeToggle.querySelector('.icon-moon');
    var iconSun = themeToggle.querySelector('.icon-sun');

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
    }

    themeToggle.addEventListener('click', function () {
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        if (state.screen === 'results') render();
    });

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
            updateLangPill();
            headerTitle.textContent = t('title');
            render();
        });
    }

    // ===== Reset =====
    resetBtn.addEventListener('click', function () {
        state.screen = 'welcome';
        state.spectrum = null;
        state.currentQuestion = 0;
        state.answers = [];
        render();
    });

    // ===== Translation helpers =====
    function t(key) {
        var obj = DATA.ui[key];
        return obj ? obj[state.lang] : key;
    }

    function tObj(obj) {
        return obj[state.lang] || obj.en;
    }

    // ===== Render =====
    function render() {
        switch (state.screen) {
            case 'welcome': renderWelcome(); break;
            case 'spectrum': renderSpectrum(); break;
            case 'question': renderQuestion(); break;
            case 'results': renderResults(); break;
        }
    }

    function renderWelcome() {
        app.innerHTML =
            '<div class="screen-welcome">' +
                '<h2>' + t('title') + '</h2>' +
                '<p>' + t('subtitle') + '</p>' +
                '<button class="btn-start" id="btn-start">' + t('start') + '</button>' +
            '</div>';

        document.getElementById('btn-start').addEventListener('click', function () {
            state.screen = 'spectrum';
            render();
        });
    }

    function renderSpectrum() {
        var html = '<div class="screen-spectrum">' +
            '<h2>' + t('chooseSpectrum') + '</h2>' +
            '<p class="hint">' + t('spectrumHint') + '</p>' +
            '<div class="spectrum-options">';

        var spectrums = ['right', 'center', 'left'];
        for (var i = 0; i < spectrums.length; i++) {
            var s = spectrums[i];
            var label = DATA.spectrums[s][state.lang];
            html += '<button class="spectrum-btn" data-spectrum="' + s + '">' +
                '<span class="label">' + label + '</span>' +
            '</button>';
        }

        html += '</div></div>';
        app.innerHTML = html;

        var btns = app.querySelectorAll('.spectrum-btn');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', function () {
                state.spectrum = this.getAttribute('data-spectrum');
                state.currentQuestion = 0;
                state.answers = new Array(DATA.questions.length);
                state.screen = 'question';
                render();
            });
        }
    }

    function renderQuestion() {
        var idx = state.currentQuestion;
        var q = DATA.questions[idx];
        var total = DATA.questions.length;
        var pct = ((idx + 1) / total) * 100;

        var html = '<div class="screen-question">' +
            '<div class="progress-bar-container">' +
                '<div class="progress-bar-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<p class="progress-text">' + t('question') + ' ' + (idx + 1) + ' / ' + total + '</p>' +
            '<p class="question-text">' + tObj(q) + '</p>' +
            '<div class="answers">';

        for (var i = 0; i < DATA.answerScale.length; i++) {
            var a = DATA.answerScale[i];
            var selected = state.answers[idx] === a.value ? ' selected' : '';
            html += '<button class="answer-btn' + selected + '" data-value="' + a.value + '">' +
                a[state.lang] + '</button>';
        }

        html += '</div>' +
            '<div class="nav-buttons">' +
                (idx > 0 ? '<button class="btn-nav" id="btn-back">' + t('back') + '</button>' : '<span></span>') +
                '<button class="btn-nav" id="btn-skip">' + t('skip') + '</button>' +
            '</div>' +
        '</div>';

        app.innerHTML = html;

        var answerBtns = app.querySelectorAll('.answer-btn');
        for (var j = 0; j < answerBtns.length; j++) {
            answerBtns[j].addEventListener('click', function () {
                state.answers[idx] = parseInt(this.getAttribute('data-value'), 10);
                advanceQuestion();
            });
        }

        var backBtn = document.getElementById('btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                state.currentQuestion--;
                render();
            });
        }

        document.getElementById('btn-skip').addEventListener('click', function () {
            advanceQuestion();
        });
    }

    function advanceQuestion() {
        if (state.currentQuestion < DATA.questions.length - 1) {
            state.currentQuestion++;
            render();
        } else {
            state.screen = 'results';
            render();
        }
    }

    function getPartiesForSpectrum(spectrum) {
        return DATA.parties.filter(function (p) {
            return p.spectrum.indexOf(spectrum) !== -1;
        });
    }

    function calculateResults() {
        var parties = getPartiesForSpectrum(state.spectrum);
        var results = [];

        for (var i = 0; i < parties.length; i++) {
            var party = parties[i];
            var totalMatch = 0;
            var answeredCount = 0;

            for (var q = 0; q < DATA.questions.length; q++) {
                var userAnswer = state.answers[q];
                if (userAnswer === undefined) continue;

                var partyPos = DATA.questions[q].positions[party.id];
                var distance = Math.abs(userAnswer - partyPos);
                var match = 1 - (distance / 6);
                totalMatch += match;
                answeredCount++;
            }

            var pct = answeredCount > 0 ? Math.round((totalMatch / answeredCount) * 100) : 0;
            results.push({ party: party, pct: pct });
        }

        results.sort(function (a, b) { return b.pct - a.pct; });
        return results.slice(0, 3);
    }

    function brightenColor(hex, factor) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        var brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness > 120) return hex;
        r = Math.min(255, Math.round(r + (255 - r) * factor));
        g = Math.min(255, Math.round(g + (255 - g) * factor));
        b = Math.min(255, Math.round(b + (255 - b) * factor));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function partyColor(hex) {
        if (currentTheme === 'dark') return brightenColor(hex, 0.45);
        return hex;
    }

    function partyBarColor(hex) {
        if (currentTheme === 'dark') return brightenColor(hex, 0.25);
        return hex;
    }

    function renderResults() {
        var results = calculateResults();
        var rankLabels = ['#1', '#2', '#3'];

        var html = '<div class="screen-results">' +
            '<h2>' + t('results') + '</h2>';

        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += '<div class="result-card">' +
                '<div class="result-rank">' + rankLabels[i] + '</div>' +
                '<div class="result-party-name" style="color:' + partyColor(r.party.color) + '">' + r.party.name + '</div>' +
                '<div class="result-party-full">' + tObj(r.party.fullName) + '</div>' +
                '<div class="result-party-leader">' + t('leader') + ': ' + r.party.leader + '</div>' +
                '<div class="result-bar-container">' +
                    '<div class="result-bar-fill" style="width:0%;background:' + partyBarColor(r.party.color) + '" data-width="' + r.pct + '">' +
                        '<span class="result-bar-pct">' + r.pct + '% ' + t('match') + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }

        html += '<button class="btn-restart" id="btn-restart">' + t('restart') + '</button>' +
            '<p class="disclaimer">' + t('disclaimer') + '</p>' +
        '</div>';

        app.innerHTML = html;

        // Animate bars after a short delay
        setTimeout(function () {
            var bars = app.querySelectorAll('.result-bar-fill');
            for (var b = 0; b < bars.length; b++) {
                bars[b].style.width = bars[b].getAttribute('data-width') + '%';
            }
        }, 100);

        document.getElementById('btn-restart').addEventListener('click', function () {
            state.screen = 'welcome';
            state.spectrum = null;
            state.currentQuestion = 0;
            state.answers = [];
            render();
        });
    }

    // Initial render
    render();
})();
