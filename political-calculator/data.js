var DATA = {
    parties: [
        { id: 'ods', name: 'ODS', fullName: { en: 'Civic Democratic Party', cz: 'Občanská demokratická strana' }, leader: 'Martin Kupka', color: '#2640A0', spectrum: ['right'] },
        { id: 'top09', name: 'TOP 09', fullName: { en: 'TOP 09', cz: 'TOP 09' }, leader: 'Matěj Ondřej Havel', color: '#6A1B9A', spectrum: ['right', 'center'] },
        { id: 'kducsl', name: 'KDU-ČSL', fullName: { en: 'Christian and Democratic Union', cz: 'Křesťanská a demokratická unie' }, leader: 'Marek Výborný', color: '#FFD600', spectrum: ['center'] },
        { id: 'spd', name: 'SPD', fullName: { en: 'SPD – Freedom and Direct Democracy', cz: 'SPD – Svoboda a přímá demokracie' }, leader: 'Tomio Okamura', color: '#1A1A6E', spectrum: ['right'] },
        { id: 'motoriste', name: 'Motoristé', fullName: { en: 'Motoristé sobě', cz: 'Motoristé sobě' }, leader: 'Petr Macinka', color: '#E30613', spectrum: ['right'] },
        { id: 'prisaha', name: 'Přísaha', fullName: { en: 'Přísaha – Robert Šlachta', cz: 'Přísaha – Robert Šlachta' }, leader: 'Robert Šlachta', color: '#003366', spectrum: ['right'] },
        { id: 'ano', name: 'ANO', fullName: { en: 'ANO 2011', cz: 'ANO 2011' }, leader: 'Andrej Babiš', color: '#29166F', spectrum: ['center'] },
        { id: 'stan', name: 'STAN', fullName: { en: 'STAN – Mayors and Independents', cz: 'STAN – Starostové a nezávislí' }, leader: 'Vít Rakušan', color: '#00A650', spectrum: ['center'] },
        { id: 'pirati', name: 'Piráti', fullName: { en: 'Czech Pirate Party', cz: 'Česká pirátská strana' }, leader: 'Zdeněk Hřib', color: '#000000', spectrum: ['left'] },
        { id: 'socdem', name: 'SOCDEM', fullName: { en: 'SOCDEM – Social Democracy', cz: 'SOCDEM – Sociální demokracie' }, leader: 'Jana Maláčová', color: '#F05A28', spectrum: ['left'] }
    ],

    spectrums: {
        right: { en: 'Right', cz: 'Pravice' },
        center: { en: 'Center', cz: 'Střed' },
        left: { en: 'Left', cz: 'Levice' }
    },

    answerScale: [
        { value: 3, en: 'Definitely yes', cz: 'Určitě ano' },
        { value: 2, en: 'Yes', cz: 'Ano' },
        { value: 1, en: 'Probably yes', cz: 'Asi ano' },
        { value: 0, en: "Don't know", cz: 'Nevím' },
        { value: -1, en: 'Probably no', cz: 'Asi ne' },
        { value: -2, en: 'No', cz: 'Ne' },
        { value: -3, en: 'Definitely no', cz: 'Určitě ne' }
    ],

    questions: [
        {
            en: 'The Czech Republic should continue military and financial support for Ukraine.',
            cz: 'Česká republika by měla pokračovat ve vojenské a finanční podpoře Ukrajiny.',
            positions: { ods: 3, top09: 3, kducsl: 2, spd: -2, motoriste: -1, prisaha: 1, ano: 1, stan: 3, pirati: 3, socdem: 1 }
        },
        {
            en: 'The EU should have more power over member states\' policies.',
            cz: 'EU by měla mít větší pravomoci nad politikami členských států.',
            positions: { ods: -1, top09: 1, kducsl: 0, spd: -3, motoriste: -3, prisaha: -2, ano: -1, stan: 0, pirati: 1, socdem: 1 }
        },
        {
            en: 'The Czech Republic should adopt the Euro.',
            cz: 'Česká republika by měla přijmout euro.',
            positions: { ods: -1, top09: 1, kducsl: 0, spd: -3, motoriste: -3, prisaha: -2, ano: -1, stan: 0, pirati: 1, socdem: 0 }
        },
        {
            en: 'Immigration from non-EU countries should be more strictly limited.',
            cz: 'Imigrace ze zemí mimo EU by měla být přísněji omezena.',
            positions: { ods: 1, top09: 0, kducsl: 1, spd: 3, motoriste: 2, prisaha: 3, ano: 2, stan: 1, pirati: -1, socdem: -1 }
        },
        {
            en: 'Taxes for high earners should be increased.',
            cz: 'Daně pro vysokopříjmové by měly být zvýšeny.',
            positions: { ods: -3, top09: -2, kducsl: -1, spd: -2, motoriste: -3, prisaha: -1, ano: -1, stan: -1, pirati: 2, socdem: 3 }
        },
        {
            en: 'The minimum wage should be significantly raised.',
            cz: 'Minimální mzda by měla být výrazně zvýšena.',
            positions: { ods: -2, top09: -1, kducsl: 0, spd: 1, motoriste: -2, prisaha: 1, ano: 1, stan: 0, pirati: 2, socdem: 3 }
        },
        {
            en: 'Nuclear energy should be the main pillar of Czech energy policy.',
            cz: 'Jaderná energie by měla být hlavním pilířem české energetické politiky.',
            positions: { ods: 3, top09: 2, kducsl: 2, spd: 2, motoriste: 3, prisaha: 2, ano: 2, stan: 2, pirati: 1, socdem: 1 }
        },
        {
            en: 'The Czech Republic should meet NATO\'s 2% GDP defense spending target.',
            cz: 'Česká republika by měla plnit cíl NATO 2 % HDP na obranu.',
            positions: { ods: 3, top09: 3, kducsl: 2, spd: 1, motoriste: 2, prisaha: 2, ano: 1, stan: 2, pirati: 1, socdem: -1 }
        },
        {
            en: 'Cannabis should be legalized for recreational use.',
            cz: 'Konopí by mělo být legalizováno pro rekreační použití.',
            positions: { ods: -2, top09: 0, kducsl: -2, spd: -3, motoriste: 1, prisaha: -2, ano: -1, stan: -1, pirati: 3, socdem: 1 }
        },
        {
            en: 'The state should invest more in public healthcare.',
            cz: 'Stát by měl více investovat do veřejného zdravotnictví.',
            positions: { ods: 0, top09: 0, kducsl: 1, spd: 1, motoriste: -1, prisaha: 1, ano: 1, stan: 1, pirati: 2, socdem: 3 }
        },
        {
            en: 'Same-sex couples should be allowed to marry.',
            cz: 'Stejnopohlavní páry by měly mít právo uzavírat manželství.',
            positions: { ods: -1, top09: 2, kducsl: -3, spd: -3, motoriste: -1, prisaha: -2, ano: 0, stan: 1, pirati: 3, socdem: 2 }
        },
        {
            en: 'The government should increase spending on education and teacher salaries.',
            cz: 'Vláda by měla zvýšit výdaje na vzdělávání a platy učitelů.',
            positions: { ods: 1, top09: 1, kducsl: 2, spd: 1, motoriste: 0, prisaha: 1, ano: 1, stan: 2, pirati: 3, socdem: 3 }
        },
        {
            en: 'Environmental regulations should be relaxed to support economic growth.',
            cz: 'Ekologické regulace by měly být uvolněny na podporu ekonomického růstu.',
            positions: { ods: 1, top09: 0, kducsl: 0, spd: 3, motoriste: 3, prisaha: 2, ano: 1, stan: 0, pirati: -2, socdem: -1 }
        },
        {
            en: 'The Czech Republic should reduce dependence on Russian energy sources.',
            cz: 'Česká republika by měla snížit závislost na ruských energetických zdrojích.',
            positions: { ods: 3, top09: 3, kducsl: 2, spd: -1, motoriste: 1, prisaha: 1, ano: 1, stan: 2, pirati: 3, socdem: 1 }
        },
        {
            en: 'The retirement age should be raised to ensure pension sustainability.',
            cz: 'Věk odchodu do důchodu by měl být zvýšen pro zajištění udržitelnosti penzí.',
            positions: { ods: 2, top09: 2, kducsl: 1, spd: -1, motoriste: 1, prisaha: 0, ano: 0, stan: 1, pirati: -1, socdem: -2 }
        },
        {
            en: 'The state should build more affordable social housing.',
            cz: 'Stát by měl stavět více dostupného sociálního bydlení.',
            positions: { ods: -1, top09: -1, kducsl: 1, spd: 0, motoriste: -2, prisaha: 1, ano: 1, stan: 1, pirati: 2, socdem: 3 }
        },
        {
            en: 'Gun ownership laws should remain liberal (permissive) in the Czech Republic.',
            cz: 'Zákony o držení zbraní by měly v ČR zůstat liberální.',
            positions: { ods: 2, top09: 1, kducsl: 1, spd: 3, motoriste: 3, prisaha: 2, ano: 1, stan: 1, pirati: 1, socdem: -1 }
        },
        {
            en: 'Public Czech Television and Radio should remain independent from government.',
            cz: 'Česká televize a rozhlas by měly zůstat nezávislé na vládě.',
            positions: { ods: 2, top09: 3, kducsl: 2, spd: -2, motoriste: -1, prisaha: 0, ano: -1, stan: 2, pirati: 3, socdem: 2 }
        },
        {
            en: 'The government should do more to combat climate change, even at economic cost.',
            cz: 'Vláda by měla více bojovat proti změně klimatu, i za cenu ekonomických nákladů.',
            positions: { ods: -1, top09: 1, kducsl: 0, spd: -3, motoriste: -3, prisaha: -1, ano: -1, stan: 0, pirati: 3, socdem: 1 }
        },
        {
            en: 'Direct democracy tools (referendums) should be used more frequently.',
            cz: 'Nástroje přímé demokracie (referenda) by měly být využívány častěji.',
            positions: { ods: -1, top09: -1, kducsl: 0, spd: 3, motoriste: 1, prisaha: 2, ano: 1, stan: 0, pirati: 1, socdem: 1 }
        }
    ],

    ui: {
        title: { en: 'Political Calculator', cz: 'Politická kalkulačka' },
        subtitle: { en: 'Find out which Czech political party aligns with your views.', cz: 'Zjistěte, která česká politická strana odpovídá vašim názorům.' },
        start: { en: 'Start', cz: 'Začít' },
        chooseSpectrum: { en: 'Choose your political leaning', cz: 'Vyberte své politické zaměření' },
        spectrumHint: { en: 'This will filter which parties you are matched with.', cz: 'Tím se vyfiltrují strany, se kterými budete porovnáváni.' },
        question: { en: 'Question', cz: 'Otázka' },
        of: { en: 'of', cz: 'z' },
        back: { en: 'Back', cz: 'Zpět' },
        skip: { en: 'Skip', cz: 'Přeskočit' },
        results: { en: 'Your Top 3 Matches', cz: 'Vaše 3 nejlepší shody' },
        match: { en: 'match', cz: 'shoda' },
        leader: { en: 'Leader', cz: 'Předseda' },
        restart: { en: 'Start Over', cz: 'Začít znovu' },
        langToggle: { en: 'CZ', cz: 'EN' },
        disclaimer: { en: 'This calculator is for informational purposes only and does not represent an official endorsement.', cz: 'This calculator is for informational purposes only and does not represent an official endorsement.' }
    }
};
