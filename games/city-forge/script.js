const statsGrid = document.getElementById('stats-grid');
const eventLog = document.getElementById('event-log');
const cityPlan = document.getElementById('city-plan');
const milestonesEl = document.getElementById('milestones');
const statusPill = document.getElementById('status-pill');
const dayPill = document.getElementById('day-pill');
const actionButtons = [...document.querySelectorAll('[data-action]')];

const PLAN_COLS = 8;
const PLAN_ROWS = 5;
const cityLots = Array.from({ length: PLAN_COLS * PLAN_ROWS }, () => null);
const tickIntervalMs = 5000;

const state = {
    wood: 4,
    stone: 3,
    metal: 2,
    planks: 0,
    bricks: 0,
    tools: 0,
    houses: 0,
    workshops: 0,
    parks: 0,
    clinics: 0,
    citizens: 8,
    rating: 58,
    day: 1,
    over: false,
    won: false
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

const actionRules = {
    'craft-planks': () => state.wood >= 2,
    'craft-bricks': () => state.stone >= 2,
    'craft-tools': () => state.metal >= 2 && state.wood >= 1,
    'build-house': () => state.planks >= 5 && state.bricks >= 3 && state.tools >= 1,
    'build-workshop': () => state.planks >= 4 && state.bricks >= 3 && state.metal >= 3,
    'build-park': () => state.wood >= 3 && state.bricks >= 2,
    'build-clinic': () => state.bricks >= 5 && state.tools >= 2
};

const objectives = [
    {
        key: 'houses',
        target: 5,
        title: 'Housing capacity',
        description: 'Build 5 houses so growth stops crushing your rating.'
    },
    {
        key: 'workshops',
        target: 2,
        title: 'Industrial base',
        description: 'Build 2 workshops to stabilize daily material income.'
    },
    {
        key: 'parks',
        target: 2,
        title: 'Public life',
        description: 'Build 2 parks to keep citizens from turning on the city.'
    },
    {
        key: 'clinics',
        target: 1,
        title: 'Healthcare',
        description: 'Build 1 clinic before the population gets too demanding.'
    },
    {
        key: 'rating',
        target: 88,
        title: 'City reputation',
        description: 'Push rating to 88 or higher to win the run.'
    }
];

function syncTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark', theme === 'dark');
}

function runAction(action) {
    if (state.over || state.won) {
        return;
    }

    if (action === 'gather-wood') {
        state.wood += randomInt(2, 4);
        updateRating(-1);
        logEvent('Foresters brought back a fast load of timber.');
    }

    if (action === 'gather-stone') {
        state.stone += randomInt(1, 3);
        updateRating(-1);
        logEvent('The quarry crew delivered a stack of stone.');
    }

    if (action === 'gather-metal') {
        state.metal += randomInt(1, 2);
        updateRating(-2);
        logEvent('Metal ore arrived, but the city noticed the rough extraction pace.');
    }

    if (action === 'craft-planks') {
        if (!actionRules[action]()) {
            logEvent('You need at least 2 wood before you can craft planks.');
            return render();
        }
        state.wood -= 2;
        state.planks += 1;
        logEvent('Carpenters turned timber into finished planks.');
    }

    if (action === 'craft-bricks') {
        if (!actionRules[action]()) {
            logEvent('You need at least 2 stone before you can fire bricks.');
            return render();
        }
        state.stone -= 2;
        state.bricks += 1;
        logEvent('Kilns fired a clean batch of bricks.');
    }

    if (action === 'craft-tools') {
        if (!actionRules[action]()) {
            logEvent('Tools require 2 metal and 1 wood.');
            return render();
        }
        state.metal -= 2;
        state.wood -= 1;
        state.tools += 1;
        updateRating(1);
        logEvent('Toolmakers improved the city toolkit.');
    }

    if (action === 'build-house') {
        if (!actionRules[action]()) {
            logEvent('A house needs 5 planks, 3 bricks, and 1 tool.');
            return render();
        }
        state.planks -= 5;
        state.bricks -= 3;
        state.tools -= 1;
        state.houses += 1;
        state.citizens += randomInt(2, 4);
        updateRating(4);
        placeBuilding('house');
        logEvent('A new house opened and residents moved in immediately.');
    }

    if (action === 'build-workshop') {
        if (!actionRules[action]()) {
            logEvent('A workshop needs 4 planks, 3 bricks, and 3 metal.');
            return render();
        }
        state.planks -= 4;
        state.bricks -= 3;
        state.metal -= 3;
        state.workshops += 1;
        updateRating(3);
        placeBuilding('workshop');
        logEvent('The new workshop will lift daily production.');
    }

    if (action === 'build-park') {
        if (!actionRules[action]()) {
            logEvent('A park needs 3 wood and 2 bricks.');
            return render();
        }
        state.wood -= 3;
        state.bricks -= 2;
        state.parks += 1;
        updateRating(7);
        placeBuilding('park');
        logEvent('Citizens finally got a park worth visiting.');
    }

    if (action === 'build-clinic') {
        if (!actionRules[action]()) {
            logEvent('A clinic needs 5 bricks and 2 tools.');
            return render();
        }
        state.bricks -= 5;
        state.tools -= 2;
        state.clinics += 1;
        updateRating(8);
        placeBuilding('clinic');
        logEvent('The clinic opened and public trust spiked.');
    }

    render();
    evaluateOutcome();
}

function cityTick() {
    if (state.over || state.won) {
        return;
    }

    state.day += 1;

    const housingCapacity = state.houses * 4;
    const workshopBonus = state.workshops;
    const parkBonus = state.parks * 2;
    const clinicBonus = state.clinics * 3;
    const upkeepWood = Math.ceil(state.citizens / 10);
    const upkeepStone = state.clinics > 0 ? 0 : Math.ceil(state.citizens / 12);

    if (state.workshops > 0) {
        state.wood += workshopBonus;
        state.stone += Math.floor(workshopBonus / 2);
        if (state.day % 2 === 0) {
            state.metal += Math.floor(workshopBonus / 2);
        }
    }

    state.wood = Math.max(0, state.wood - upkeepWood);
    state.stone = Math.max(0, state.stone - upkeepStone);

    if (state.citizens > housingCapacity) {
        const shortage = state.citizens - housingCapacity;
        updateRating(-Math.min(10, shortage + 2));
        logEvent('Housing demand is outpacing construction.');
        if (shortage >= 6) {
            state.citizens = Math.max(5, state.citizens - 1);
            logEvent('A resident left because housing pressure stayed unresolved.');
        }
    } else {
        updateRating(1 + Math.min(4, parkBonus + clinicBonus));
    }

    if (state.parks === 0 && state.day > 2) {
        updateRating(-3);
        logEvent('Without public space, residents are growing restless.');
    }

    if (state.clinics === 0 && state.citizens >= 12) {
        updateRating(-4);
        logEvent('Health complaints are rising because there is still no clinic.');
    }

    if (state.rating >= 82) {
        state.citizens += 1;
        logEvent('A strong reputation attracted a new resident.');
    }

    if (state.wood === 0 && state.stone === 0 && state.workshops === 0) {
        updateRating(-4);
        logEvent('The city stalled because raw materials ran dry.');
    }

    render();
    evaluateOutcome();
}

function evaluateOutcome() {
    if (state.over || state.won) {
        return;
    }

    const completedObjectives = objectives.every((objective) => state[objective.key] >= objective.target);
    if (completedObjectives) {
        state.won = true;
        statusPill.textContent = 'City secured — you won the run';
        logEvent('Victory. City Forge now runs like a stable production city.');
        updateButtons();
        return;
    }

    if (state.rating <= 12 || state.citizens <= 4) {
        state.over = true;
        statusPill.textContent = 'City collapse — reset from the header';
        logEvent('Defeat. The district collapsed under pressure.');
        updateButtons();
        return;
    }

    const housingCapacity = state.houses * 4;
    if (state.citizens > housingCapacity + 5) {
        statusPill.textContent = 'Critical housing shortage';
    } else if (state.clinics === 0 && state.citizens >= 12) {
        statusPill.textContent = 'Healthcare gap is now dangerous';
    } else if (state.rating >= 80) {
        statusPill.textContent = 'Momentum is strong — press for the win';
    } else {
        statusPill.textContent = 'Build the first district';
    }
}

function render() {
    syncTheme();
    dayPill.textContent = `Day ${state.day}`;
    renderStats();
    renderCityPlan();
    renderMilestones();
    updateButtons();
}

function renderStats() {
    statsGrid.innerHTML = '';
    statOrder.forEach(([key, label]) => {
        const card = document.createElement('article');
        card.className = 'stat-card';
        card.innerHTML = `<span>${label}</span><strong>${state[key]}</strong>`;
        statsGrid.appendChild(card);
    });
}

function renderMilestones() {
    milestonesEl.innerHTML = '';
    objectives.forEach((objective) => {
        const done = state[objective.key] >= objective.target;
        const item = document.createElement('article');
        item.className = `milestone${done ? ' is-done' : ''}`;
        item.innerHTML = `
            <label>${objective.title}</label>
            <strong>${state[objective.key]} / ${objective.target}</strong>
            <p>${objective.description}</p>
        `;
        milestonesEl.appendChild(item);
    });
}

function placeBuilding(type) {
    const freeIndex = cityLots.findIndex((lot) => lot === null);
    if (freeIndex >= 0) {
        cityLots[freeIndex] = type;
        return;
    }

    cityLots[randomInt(0, cityLots.length - 1)] = type;
}

function renderCityPlan() {
    cityPlan.innerHTML = '';
    cityLots.forEach((type) => {
        const cell = document.createElement('div');
        cell.className = 'plan-cell';

        if (type) {
            cell.classList.add(`type-${type}`);
            cell.textContent = buildingShort(type);
        } else {
            cell.textContent = '·';
        }

        cityPlan.appendChild(cell);
    });
}

function buildingShort(type) {
    if (type === 'house') return 'H';
    if (type === 'workshop') return 'W';
    if (type === 'park') return 'P';
    return 'C';
}

function updateButtons() {
    actionButtons.forEach((button) => {
        const action = button.dataset.action;
        if (state.over || state.won) {
            button.disabled = true;
            button.classList.remove('is-blocked');
            return;
        }

        button.disabled = false;
        const blocked = actionRules[action] ? !actionRules[action]() : false;
        button.classList.toggle('is-blocked', blocked);
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
    item.innerHTML = `<strong>Day ${String(state.day).padStart(2, '0')}</strong> — ${message}`;
    eventLog.prepend(item);

    while (eventLog.children.length > 28) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

actionButtons.forEach((button) => {
    button.addEventListener('click', () => runAction(button.dataset.action));
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
});

window.addEventListener('storage', (event) => {
    if (event.key === 'theme') {
        syncTheme();
    }
});

syncTheme();
render();
logEvent('City founded. You need housing, industry, parks, and healthcare before the pressure overwhelms the district.');
evaluateOutcome();
setInterval(cityTick, tickIntervalMs);
