(function () {
    'use strict';

    var info = window.PREVIEW_INFO || {};
    var canvas = document.getElementById('preview-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var progressBar = document.querySelector('.preview-progress-bar');
    var W = canvas.width;
    var H = canvas.height;
    var start = performance.now();
    var duration = 7000;

    function syncTheme() {
        var theme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark', theme === 'dark');
    }

    function loop(now) {
        syncTheme();
        var elapsed = (now - start) % duration;
        var t = elapsed / duration;
        if (progressBar) progressBar.style.width = Math.round(t * 100) + '%';
        drawScene(t);
        requestAnimationFrame(loop);
    }

    function drawScene(t) {
        ctx.clearRect(0, 0, W, H);
        var gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, '#16305d');
        gradient.addColorStop(1, '#060d18');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
        drawStars();
        if (info.kind === 'racing') drawRacing(t);
        if (info.kind === 'space-invaders') drawInvaders(t);
        if (info.kind === 'space-mission') drawMission(t);
        if (info.kind === 'city-forge') drawCityForge(t);
        if (info.kind === 'political-calculator') drawCalculator(t);
        drawTitle();
    }

    function drawStars() {
        for (var i = 0; i < 70; i += 1) {
            var x = (i * 97) % W;
            var y = (i * 53) % H;
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(x, y, 2, 2);
        }
    }

    function drawTitle() {
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.font = '600 14px Inter, sans-serif';
        ctx.fillText('Preview video', 18, 28);
        ctx.font = '700 24px Inter, sans-serif';
        ctx.fillText(info.title || 'Preview', 18, 58);
    }

    function drawRacing(t) {
        ctx.strokeStyle = '#667188';
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(120, 110);
        ctx.bezierCurveTo(540, 20, 760, 180, 640, 340);
        ctx.bezierCurveTo(540, 470, 220, 440, 170, 310);
        ctx.bezierCurveTo(120, 230, 80, 170, 120, 110);
        ctx.stroke();
        ctx.strokeStyle = '#d8dde8';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.moveTo(120, 110);
        ctx.bezierCurveTo(540, 20, 760, 180, 640, 340);
        ctx.bezierCurveTo(540, 470, 220, 440, 170, 310);
        ctx.bezierCurveTo(120, 230, 80, 170, 120, 110);
        ctx.stroke();
        ctx.setLineDash([]);
        for (var i = 0; i < 5; i += 1) {
            var angle = t * Math.PI * 2 + i * 1.1;
            var x = 390 + Math.cos(angle) * (220 - i * 14);
            var y = 250 + Math.sin(angle * 1.3) * (120 - i * 8);
            ctx.fillStyle = ['#ff6b6b', '#6ec8ff', '#ffd166', '#8b7bff', '#7be495'][i];
            ctx.fillRect(x - 12, y - 8, 24, 16);
        }
    }

    function drawInvaders(t) {
        for (var row = 0; row < 4; row += 1) {
            for (var col = 0; col < 10; col += 1) {
                var offset = Math.sin(t * Math.PI * 2) * 40;
                var x = 90 + col * 64 + offset;
                var y = 100 + row * 58;
                ctx.fillStyle = row % 2 === 0 ? '#ff7096' : '#ffd166';
                ctx.fillRect(x, y, 34, 22);
                ctx.fillStyle = '#101522';
                ctx.fillRect(x + 6, y + 6, 6, 6);
                ctx.fillRect(x + 22, y + 6, 6, 6);
            }
        }
        var shipX = 120 + Math.sin(t * Math.PI * 2 * 1.5) * 260 + 250;
        ctx.fillStyle = '#7fdcff';
        ctx.beginPath();
        ctx.moveTo(shipX, 420);
        ctx.lineTo(shipX + 24, 454);
        ctx.lineTo(shipX, 444);
        ctx.lineTo(shipX - 24, 454);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d8f6ff';
        ctx.fillRect(shipX - 2, 360 + Math.sin(t * Math.PI * 6) * 50, 4, 52);
    }

    function drawMission(t) {
        ctx.fillStyle = '#ffaa33';
        ctx.beginPath();
        ctx.arc(730, 60 + t * 120, 120, 0, Math.PI * 2);
        ctx.fill();
        var rocketX = 360 + Math.sin(t * Math.PI * 2) * 150;
        ctx.fillStyle = '#dfe7f4';
        ctx.beginPath();
        ctx.moveTo(rocketX, 260);
        ctx.lineTo(rocketX + 22, 330);
        ctx.lineTo(rocketX, 308);
        ctx.lineTo(rocketX - 22, 330);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#77d8ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rocketX, 294, 48 + Math.sin(t * Math.PI * 4) * 4, 0, Math.PI * 2);
        ctx.stroke();
        for (var i = 0; i < 6; i += 1) {
            var ox = 120 + i * 115;
            var oy = (t * 420 + i * 70) % (H + 80) - 40;
            ctx.fillStyle = i % 2 === 0 ? '#7d879a' : '#afb8c6';
            ctx.beginPath();
            ctx.arc(ox, oy, 24 + (i % 3) * 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCityForge(t) {
        for (var row = 0; row < 4; row += 1) {
            for (var col = 0; col < 6; col += 1) {
                var x = 120 + col * 90;
                var y = 110 + row * 84;
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(x, y, 68, 58);
                if ((row * 6 + col) / 24 < t) {
                    ctx.fillStyle = ['#7be495', '#6ec8ff', '#ffd166', '#ff8fab'][(row + col) % 4];
                    ctx.fillRect(x + 8, y + 12, 52, 38);
                }
            }
        }
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(90, 430, 620, 10);
        ctx.fillStyle = '#6ed39e';
        ctx.fillRect(90, 430, 620 * t, 10);
        ctx.fillStyle = '#f8fbff';
        ctx.font = '600 18px Inter, sans-serif';
        ctx.fillText('City rating rising', 90, 412);
    }

    function drawCalculator(t) {
        var widths = [0.72, 0.54, 0.33];
        ['#4568ee', '#7be495', '#ffd166'].forEach(function (color, index) {
            var y = 170 + index * 90;
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(180, y, 420, 34);
            ctx.fillStyle = color;
            ctx.fillRect(180, y, 420 * Math.min(1, widths[index] + Math.sin(t * Math.PI * 2 + index) * 0.05), 34);
        });
        ctx.fillStyle = '#f8fbff';
        ctx.font = '600 18px Inter, sans-serif';
        ctx.fillText('Match scores refresh live', 180, 136);
        for (var i = 0; i < 5; i += 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(90 + i * 120, 88, 90, 42);
        }
    }

    requestAnimationFrame(loop);
})();
