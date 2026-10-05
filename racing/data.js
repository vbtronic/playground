var DATA = {
    ui: {
        title:        { en: 'Racing', cz: 'Závody' },
        subtitle:     { en: 'Top-down 3D circuit racing against four AI rivals', cz: '3D okruhové závody proti čtyřem soupeřům' },
        start:        { en: 'Start Race', cz: 'Zahájit závod' },
        restart:      { en: 'Race Again', cz: 'Závodit znovu' },
        backToMenu:   { en: 'Back to Menu', cz: 'Zpět do menu' },
        go:           { en: 'GO!', cz: 'START!' },
        lap:          { en: 'Lap', cz: 'Kolo' },
        position:     { en: 'Position', cz: 'Pozice' },
        speed:        { en: 'Speed', cz: 'Rychlost' },
        time:         { en: 'Time', cz: 'Čas' },
        lapTime:      { en: 'Lap time', cz: 'Čas kola' },
        bestLap:      { en: 'Best lap', cz: 'Nejlepší kolo' },
        lastLap:      { en: 'Last lap', cz: 'Poslední kolo' },
        totalTime:    { en: 'Total time', cz: 'Celkový čas' },
        raceComplete: { en: 'Race complete!', cz: 'Závod dokončen!' },
        finished:     { en: 'You finished', cz: 'Skončili jste' },
        controlsDesktop: { en: '↑ / W gas · ↓ / S / Space brake · ← → / A D steer · C camera · P pause', cz: '↑ / W plyn · ↓ / S / Mezerník brzda · ← → / A D řízení · C kamera · P pauza' },
        controlsTouch: { en: 'Drag the left pad to steer · hold GAS / BRAKE on the right', cz: 'Levou plo\u0161kou řiďte · vpravo držte PLYN / BRZDA' },
        steer:        { en: 'Steer', cz: 'Řízení' },
        gas:          { en: 'GAS', cz: 'PLYN' },
        brake:        { en: 'BRAKE', cz: 'BRZDA' },
        difficulty:   { en: 'Difficulty', cz: 'Obtížnost' },
        easy:         { en: 'Easy', cz: 'Lehká' },
        medium:       { en: 'Medium', cz: 'Střední' },
        hard:         { en: 'Hard', cz: 'Těžká' },
        laps:         { en: 'Laps', cz: 'Kola' },
        camera:       { en: 'Camera', cz: 'Kamera' },
        camChase:     { en: 'Chase', cz: 'Za autem' },
        camTop:       { en: 'Top-down', cz: 'Shora' },
        player:       { en: 'You', cz: 'Vy' },
        name:         { en: 'Driver', cz: 'Jezdec' },
        records:      { en: 'Your records', cz: 'Vaše rekordy' },
        noRecords:    { en: 'No records yet — set one!', cz: 'Zatím žádné rekordy — zajeděte první!' },
        bestRace:     { en: 'Best race', cz: 'Nejlepší závod' },
        newRecord:    { en: 'New record!', cz: 'Nový rekord!' },
        newBestLap:   { en: 'New best lap!', cz: 'Nové nejlepší kolo!' },
        finalLap:     { en: 'Final lap!', cz: 'Poslední kolo!' },
        wrongWay:     { en: 'Wrong way!', cz: 'Špatný směr!' },
        paused:       { en: 'Paused', cz: 'Pozastaveno' },
        resume:       { en: 'Resume', cz: 'Pokračovat' },
        restartRace:  { en: 'Restart race', cz: 'Restartovat závod' },
        lapTimes:     { en: 'Your laps', cz: 'Vaše kola' },
        threejsCredit:{ en: 'Powered by Three.js (MIT License)', cz: 'Powered by Three.js (MIT License)' }
    },

    config: {
        lapOptions: [3, 5, 8],
        defaultLaps: 3,
        aiCount: 4,

        maxSpeed: 2.0,
        acceleration: 0.04,
        brakeForce: 0.05,
        friction: 0.015,
        turnSpeed: 0.04,
        driftFactor: 0.92,
        reverseMax: 0.5,

        // Keyboard steering ramps in/out instead of snapping (units per second)
        steerRampIn: 7,
        steerRampOut: 10,

        aiSpeedEasy: 0.94,
        aiSpeedMedium: 1.02,
        aiSpeedHard: 1.08,
        aiWander: 0.06,

        cameraHeight: 75,
        cameraLookAhead: 12,
        chaseHeight: 46,
        chaseDistance: 30,
        chaseLookAhead: 22,

        trackWidth: 22,

        carColors: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa'],
        aiNames: [
            { en: 'Blue', cz: 'Modr\u00fd' },
            { en: 'Green', cz: 'Zelen\u00fd' },
            { en: 'Yellow', cz: '\u017dlut\u00fd' },
            { en: 'Purple', cz: 'Fialov\u00fd' }
        ]
    }
};
