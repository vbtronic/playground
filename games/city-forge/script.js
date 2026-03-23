const statsGrid = document.getElementById('stats-grid');
const eventLog = document.getElementById('event-log');

const state = {
    wood: 6,
    stone: 4,
    metal: 2,
    planks: 0,
    bricks: 0,
    tools: 0,
    houses: 0,
    workshops: 0,
    parks: 0,
    clinics: 0,
    citizens: 10,
    rating: 50
};

const statOrder = [
    ['wood', 'Wood'],
    ['stone', 'Stone'],
    ['metal', 'Metal'],
    ['planks', 'Planks'],
    ['bricks', 'Bricks'],
    ['tools', 'Tools'],
    ['houses', 'Houses'],
    ['workshops', 'Workshops'],
    ['parks', 'Parks'],
    ['clinics', 'Clinics'],
    ['citizens', 'Citizens'],
    ['rating', 'Rating']
];

document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
        runAction(button.dataset.action);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
});

setInterval(cityTick, 6000);
render();
logEvent('City founded. Build smart and keep citizens happy.');

function runAction(action) {
    if (action === 'gather-wood') {
        state.wood += randomInt(2, 5);
        updateRating(1);
        logEvent('Workers gathered fresh wood.');
    }

    if (action === 'gather-stone') {
        state.stone += randomInt(1, 4);
        updateRating(1);
        logEvent('Quarry delivered extra stone.');
    }

    if (action === 'gather-metal') {
        state.metal += randomInt(1, 3);
        updateRating(1);
        logEvent('Miners returned with metal ore.');
    }

    if (action === 'craft-planks') {
        if (state.wood < 2) {
            logEvent('Not enough wood for planks.');
            return render();
        }
        state.wood -= 2;
        state.planks += 1;
        logEvent('Planks crafted in carpentry station.');
    }

    if (action === 'craft-bricks') {
        if (state.stone < 2) {
            logEvent('Not enough stone for bricks.');
            return render();
        }
        state.stone -= 2;
        state.bricks += 1;
        logEvent('Bricks fired and ready for building.');
    }

    if (action === 'craft-tools') {
        if (state.metal < 2 || state.wood < 1) {
            logEvent('Need 2 metal and 1 wood for tools.');
            return render();
        }
        state.metal -= 2;
        state.wood -= 1;
        state.tools += 1;
        updateRating(2);
        logEvent('Tools crafted, productivity improved.');
    }

    if (action === 'build-house') {
        if (state.planks < 4 || state.bricks < 2 || state.tools < 1) {
            logEvent('Missing materials for a house.');
            return render();
        }
        state.planks -= 4;
        state.bricks -= 2;
        state.tools -= 1;
        state.houses += 1;
        state.citizens += randomInt(2, 5);
        updateRating(5);
        logEvent('New house completed. Citizens moved in.');
    }

    if (action === 'build-workshop') {
        if (state.planks < 3 || state.bricks < 3 || state.metal < 2) {
            logEvent('Missing materials for workshop.');
            return render();
        }
        state.planks -= 3;
        state.bricks -= 3;
        state.metal -= 2;
        state.workshops += 1;
        state.wood += 1;
        state.stone += 1;
        updateRating(4);
        logEvent('Workshop built. Daily production increased.');
    }

    if (action === 'build-park') {
        if (state.wood < 2 || state.bricks < 1) {
            logEvent('Need wood and bricks for park.');
            return render();
        }
        state.wood -= 2;
        state.bricks -= 1;
        state.parks += 1;
        updateRating(6);
        logEvent('Park opened. Citizens are happier.');
    }

    if (action === 'build-clinic') {
        if (state.bricks < 4 || state.tools < 2) {
            logEvent('Need bricks and tools for clinic.');
            return render();
        }
        state.bricks -= 4;
        state.tools -= 2;
        state.clinics += 1;
        state.citizens += 1;
        updateRating(7);
        logEvent('Clinic built. Health and trust improved.');
    }

    render();
}

function cityTick() {
    const housingCapacity = state.houses * 5;
    const qualityBonus = state.parks * 2 + state.clinics * 3;

    if (state.citizens > housingCapacity + 8) {
        updateRating(-4);
        logEvent('Citizens complain about housing shortage.');
    } else {
        updateRating(qualityBonus > 0 ? 2 : 0);
    }

    if (state.workshops > 0) {
        state.wood += state.workshops;
        state.stone += Math.floor(state.workshops / 2);
    }

    if (state.rating >= 80) {
        state.citizens += 2;
        logEvent('City reputation is excellent. New residents arrived.');
    }

    if (state.rating <= 25 && state.citizens > 6) {
        state.citizens -= 1;
        logEvent('A resident left due to low satisfaction.');
    }

    render();
}

function render() {
    statsGrid.innerHTML = '';
    statOrder.forEach(([key, label]) => {
        const card = document.createElement('article');
        card.className = 'stat-card';
        card.innerHTML = `<span>${label}</span><strong>${state[key]}</strong>`;
        statsGrid.appendChild(card);
    });
}

function updateRating(delta) {
    state.rating = clamp(state.rating + delta, 0, 100);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function logEvent(message) {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
    eventLog.prepend(item);

    while (eventLog.children.length > 24) {
        eventLog.removeChild(eventLog.lastChild);
    }
}
