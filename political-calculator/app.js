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
    var langBtn = document.getElementById('lang-btn');
    var headerTitle = document.getElementById('header-title');
    var resetBtn = document.getElementById('btn-reset');

    // Clicking reset restarts the calculator
    resetBtn.addEventListener('click', function () {
        state.screen = 'welcome';
        state.spectrum = null;
        state.currentQuestion = 0;
        state.answers = [];
        render();
    });

    function t(key) {
        var obj = DATA.ui[key];
        return obj ? obj[state.lang] : key;
    }

    function tObj(obj) {
        return obj[state.lang] || obj.en;
    }

    // Language toggle
    langBtn.addEventListener('click', function () {
        state.lang = state.lang === 'en' ? 'cz' : 'en';
        langBtn.textContent = t('langToggle');
        headerTitle.textContent = t('title');
        render();
    });

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
            '<p class="progress-text">' + t('question') + ' ' + (idx + 1) + ' ' + t('of') + ' ' + total + '</p>' +
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

        // Answer buttons
        var answerBtns = app.querySelectorAll('.answer-btn');
        for (var j = 0; j < answerBtns.length; j++) {
            answerBtns[j].addEventListener('click', function () {
                state.answers[idx] = parseInt(this.getAttribute('data-value'), 10);
                advanceQuestion();
            });
        }

        // Back button
        var backBtn = document.getElementById('btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                state.currentQuestion--;
                render();
            });
        }

        // Skip button
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

    function renderResults() {
        var results = calculateResults();
        var rankLabels = ['#1', '#2', '#3'];

        var html = '<div class="screen-results">' +
            '<h2>' + t('results') + '</h2>';

        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            html += '<div class="result-card">' +
                '<div class="result-rank">' + rankLabels[i] + '</div>' +
                '<div class="result-party-name" style="color:' + r.party.color + '">' + r.party.name + '</div>' +
                '<div class="result-party-full">' + tObj(r.party.fullName) + '</div>' +
                '<div class="result-party-leader">' + t('leader') + ': ' + r.party.leader + '</div>' +
                '<div class="result-bar-container">' +
                    '<div class="result-bar-fill" style="width:' + r.pct + '%;background:' + r.party.color + '">' +
                        '<span class="result-bar-pct">' + r.pct + '% ' + t('match') + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }

        html += '<button class="btn-restart" id="btn-restart">' + t('restart') + '</button>' +
            '<p class="disclaimer">' + t('disclaimer') + '</p>' +
        '</div>';

        app.innerHTML = html;

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
