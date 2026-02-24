var DATA = {
    ui: {
        title:        { en: 'Racing', cz: 'Z\u00e1vody' },
        subtitle:     { en: 'Top-down 3D circuit racing', cz: '3D z\u00e1vodn\u00ed hra z pta\u010d\u00ed perspektivy' },
        start:        { en: 'Start Race', cz: 'Zah\u00e1jit z\u00e1vod' },
        restart:      { en: 'Race Again', cz: 'Z\u00e1vodit znovu' },
        backToMenu:   { en: 'Back to Menu', cz: 'Zp\u011bt do menu' },
        loading:      { en: 'Loading...', cz: 'Na\u010d\u00edt\u00e1n\u00ed...' },
        go:           { en: 'GO!', cz: 'JE\u010eTe!' },
        lap:          { en: 'Lap', cz: 'Kolo' },
        position:     { en: 'Position', cz: 'Pozice' },
        speed:        { en: 'Speed', cz: 'Rychlost' },
        time:         { en: 'Time', cz: '\u010cas' },
        bestLap:      { en: 'Best Lap', cz: 'Nejlep\u0161\u00ed kolo' },
        totalTime:    { en: 'Total Time', cz: 'Celkov\u00fd \u010das' },
        raceComplete: { en: 'Race Complete!', cz: 'Z\u00e1vod dokon\u010den!' },
        finished:     { en: 'You finished', cz: 'Skon\u010dili jste' },
        controls:     { en: '\u2191\u2193\u2190\u2192 or WASD to drive \u00b7 Space to brake', cz: '\u2191\u2193\u2190\u2192 nebo WASD k \u0159\u00edzen\u00ed \u00b7 Mezern\u00edk brzda' },
        difficulty:   { en: 'Difficulty', cz: 'Obt\u00ed\u017enost' },
        easy:         { en: 'Easy', cz: 'Lehk\u00e1' },
        medium:       { en: 'Medium', cz: 'St\u0159edn\u00ed' },
        hard:         { en: 'Hard', cz: 'T\u011b\u017ek\u00e1' },
        laps:         { en: 'Laps', cz: 'Kola' },
        player:       { en: 'You', cz: 'Vy' },
        results:      { en: 'Results', cz: 'V\u00fdsledky' },
        name:         { en: 'Name', cz: 'Jm\u00e9no' },
        threejsCredit:{ en: 'Powered by Three.js (MIT License)', cz: 'Powered by Three.js (MIT License)' }
    },

    config: {
        totalLaps: 3,
        aiCount: 4,
        countdownDuration: 3,

        maxSpeed: 2.0,
        acceleration: 0.04,
        brakeForce: 0.05,
        friction: 0.015,
        turnSpeed: 0.04,
        driftFactor: 0.92,
        offTrackPenalty: 0.96,
        reverseMax: 0.5,

        aiSpeedEasy: 0.90,
        aiSpeedMedium: 0.97,
        aiSpeedHard: 1.00,
        aiWander: 0.08,

        cameraHeight: 75,
        cameraLookAhead: 12,

        trackWidth: 22,

        carColors: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa'],
        aiNames: ['Blue', 'Green', 'Yellow', 'Purple']
    }
};
