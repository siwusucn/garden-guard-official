(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = 1000;
  const H = 560;

  const GRID = {
    x: 20,
    y: 0,
    cols: 12,
    rows: 7,
    cell: 80,
  };

  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a, b, t) => a + (b - a) * t;

  const towerDefinitions = {
    carrot: {
      name: "胡萝卜弩手",
      role: "速射 · 单体",
      emoji: "🥕",
      cost: 55,
      damage: 17,
      range: 138,
      fireRate: 0.58,
      projectileSpeed: 470,
      color: "#e88338",
    },
    onion: {
      name: "洋葱炮手",
      role: "爆破 · 群伤",
      emoji: "🧅",
      cost: 100,
      damage: 35,
      range: 158,
      fireRate: 1.55,
      projectileSpeed: 265,
      splash: 58,
      color: "#a783a0",
    },
    chili: {
      name: "火焰辣椒",
      role: "灼烧 · 范围",
      emoji: "🌶️",
      cost: 85,
      damage: 11,
      range: 120,
      fireRate: 1.35,
      burnDamage: 5,
      burnDuration: 3.2,
      color: "#d95038",
    },
    pumpkin: {
      name: "南瓜投手",
      role: "重击 · 远射",
      emoji: "🎃",
      cost: 125,
      damage: 58,
      range: 205,
      fireRate: 2.25,
      projectileSpeed: 215,
      splash: 66,
      color: "#dd8b38",
    },
  };

  const phaseDefinitions = {
    day: {
      name: "白昼",
      icon: "☀",
      description: "虫群迟缓，草地会生长阳光露珠",
      rewardMultiplier: 0.75,
      hpMultiplier: 0.9,
      speedMultiplier: 0.92,
    },
    night: {
      name: "夜晚",
      icon: "☾",
      description: "虫群强化，击杀种子提高到 115%",
      rewardMultiplier: 1.15,
      hpMultiplier: 1.18,
      speedMultiplier: 1.08,
    },
  };

  const enemyDefinitions = {
    aphid: {
      name: "探路蚜虫",
      emoji: "🐛",
      hp: 52,
      speed: 61,
      reward: 9,
      radius: 13,
      color: "#79ad52",
    },
    beetle: {
      name: "硬壳甲虫",
      emoji: "🪲",
      hp: 155,
      speed: 43,
      reward: 16,
      radius: 16,
      color: "#745337",
    },
    moth: {
      name: "夜行飞蛾",
      emoji: "🦋",
      hp: 86,
      speed: 79,
      reward: 13,
      radius: 14,
      color: "#8e729b",
    },
    snail: {
      name: "铁壳蜗牛",
      emoji: "🐌",
      hp: 310,
      speed: 29,
      reward: 28,
      radius: 18,
      color: "#9b8062",
    },
    boss: {
      name: "瓢虫将军",
      emoji: "🐞",
      hp: 1650,
      speed: 26,
      reward: 110,
      radius: 27,
      color: "#b9493d",
      boss: true,
    },
  };

  const waves = [
    {
      name: "探路蚜虫",
      subtitle: "它们只是来尝一口",
      phase: "day",
      groups: [{ type: "aphid", count: 10, interval: 0.72 }],
    },
    {
      name: "硬壳小队",
      subtitle: "壳有点厚，牙口更好",
      phase: "night",
      groups: [
        { type: "aphid", count: 7, interval: 0.62 },
        { type: "beetle", count: 4, interval: 1.0 },
      ],
    },
    {
      name: "晨光飞蛾",
      subtitle: "天亮了，它们反而更急",
      phase: "day",
      groups: [
        { type: "moth", count: 9, interval: 0.58 },
        { type: "beetle", count: 3, interval: 0.95 },
      ],
    },
    {
      name: "蜗牛重装队",
      subtitle: "慢一点，但准备吃掉一整片地",
      phase: "night",
      groups: [
        { type: "snail", count: 4, interval: 1.45 },
        { type: "aphid", count: 8, interval: 0.55 },
        { type: "moth", count: 5, interval: 0.7 },
      ],
    },
    {
      name: "夕照混编军",
      subtitle: "四面八方都是咀嚼声",
      phase: "day",
      groups: [
        { type: "beetle", count: 7, interval: 0.72 },
        { type: "moth", count: 8, interval: 0.54 },
        { type: "snail", count: 4, interval: 1.2 },
        { type: "aphid", count: 8, interval: 0.48 },
      ],
    },
    {
      name: "瓢虫将军",
      subtitle: "今晚的最后一战",
      phase: "night",
      groups: [
        { type: "aphid", count: 6, interval: 0.38 },
        { type: "beetle", count: 5, interval: 0.8 },
        { type: "snail", count: 3, interval: 1.0 },
        { type: "boss", count: 1, interval: 1.8 },
      ],
    },
  ];

  const pathTiles = [
    { col: -0.75, row: 4 },
    { col: 1, row: 4 },
    { col: 1, row: 1 },
    { col: 4, row: 1 },
    { col: 4, row: 4 },
    { col: 7, row: 4 },
    { col: 7, row: 2 },
    { col: 10, row: 2 },
    { col: 10, row: 4 },
    { col: 11.35, row: 4 },
  ];

  const pathPoints = pathTiles.map(({ col, row }) => ({
    x: GRID.x + col * GRID.cell + GRID.cell / 2,
    y: GRID.y + row * GRID.cell + GRID.cell / 2,
  }));

  const pathSegments = [];
  let pathLength = 0;
  for (let i = 0; i < pathPoints.length - 1; i += 1) {
    const start = pathPoints[i];
    const end = pathPoints[i + 1];
    const length = distance(start, end);
    pathSegments.push({ start, end, length, offset: pathLength });
    pathLength += length;
  }

  const elements = {
    introOverlay: document.getElementById("introOverlay"),
    resultOverlay: document.getElementById("resultOverlay"),
    startGameButton: document.getElementById("startGameButton"),
    restartButton: document.getElementById("restartButton"),
    resultStamp: document.getElementById("resultStamp"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultWaves: document.getElementById("resultWaves"),
    resultKills: document.getElementById("resultKills"),
    livesValue: document.getElementById("livesValue"),
    seedsValue: document.getElementById("seedsValue"),
    waveTitle: document.getElementById("waveTitle"),
    waveCount: document.getElementById("waveCount"),
    waveProgress: document.getElementById("waveProgress"),
    wavePreview: document.getElementById("wavePreview"),
    phaseCard: document.getElementById("phaseCard"),
    phaseIcon: document.getElementById("phaseIcon"),
    phaseName: document.getElementById("phaseName"),
    phaseDescription: document.getElementById("phaseDescription"),
    phaseMultiplier: document.getElementById("phaseMultiplier"),
    phaseNodes: [...document.querySelectorAll("#phaseTrack span")],
    towerList: document.getElementById("towerList"),
    towerCards: [...document.querySelectorAll(".tower-card")],
    inspector: document.getElementById("inspector"),
    inspectorName: document.getElementById("inspectorName"),
    statDamage: document.getElementById("statDamage"),
    statRange: document.getElementById("statRange"),
    statSpeed: document.getElementById("statSpeed"),
    upgradeButton: document.getElementById("upgradeButton"),
    sellButton: document.getElementById("sellButton"),
    closeInspector: document.getElementById("closeInspector"),
    waveButton: document.getElementById("waveButton"),
    waveButtonLabel: document.getElementById("waveButtonLabel"),
    waveButtonSub: document.getElementById("waveButtonSub"),
    pauseButton: document.getElementById("pauseButton"),
    pauseIcon: document.getElementById("pauseIcon"),
    speedButton: document.getElementById("speedButton"),
    speedLabel: document.getElementById("speedLabel"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    soundButton: document.getElementById("soundButton"),
    soundIcon: document.getElementById("soundIcon"),
    helpButton: document.getElementById("helpButton"),
    helpModal: document.getElementById("helpModal"),
    closeHelpButton: document.getElementById("closeHelpButton"),
    canvasToast: document.getElementById("canvasToast"),
  };

  let state;
  let audioContext = null;
  let lastFrame = performance.now();
  let ambientTime = 0;
  let toastTimer = 0;
  let previewWaveIndex = -1;

  function createState() {
    return {
      status: "intro",
      lives: 10,
      seeds: 190,
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      floaters: [],
      effects: [],
      sunDrops: [],
      sunDropTimer: 5,
      sunDropHintShown: false,
      nightAmount: 0,
      nextTowerId: 1,
      selectedBuild: null,
      selectedTowerId: null,
      hoverCell: null,
      pointer: { x: -100, y: -100 },
      speed: 1,
      waveIndex: 0,
      waveActive: false,
      spawnQueue: [],
      spawnTimer: 0,
      waveStats: { total: 0, resolved: 0, spawned: 0 },
      kills: 0,
      totalEarned: 0,
      banner: null,
      shake: 0,
      flashRed: 0,
      endTimer: 0,
      soundEnabled: true,
    };
  }

  state = createState();

  const grassSpeckles = seededItems(145, (random) => ({
    x: GRID.x + random() * (GRID.cols * GRID.cell),
    y: GRID.y + random() * (GRID.rows * GRID.cell),
    size: 1 + random() * 2.2,
    tone: random() > 0.55 ? "#86ac6e" : "#bed18c",
    flower: random() > 0.92,
  }));

  const pathSpeckles = seededItems(95, (random) => {
    const pathDistance = random() * pathLength;
    const point = pointAtPathDistance(pathDistance);
    const side = random() > 0.5 ? 1 : -1;
    const offset = (4 + random() * 24) * side;
    return {
      x: point.x + Math.cos(point.angle + Math.PI / 2) * offset,
      y: point.y + Math.sin(point.angle + Math.PI / 2) * offset,
      size: 0.8 + random() * 2.1,
      alpha: 0.22 + random() * 0.22,
    };
  });

  const nightMotes = seededItems(24, (random) => ({
    x: GRID.x + 25 + random() * (GRID.cols * GRID.cell - 50),
    y: GRID.y + 25 + random() * (GRID.rows * GRID.cell - 50),
    size: 0.7 + random() * 1.5,
    phase: random() * TAU,
    speed: 0.45 + random() * 0.8,
  }));

  function seededItems(count, factory) {
    let seed = 28731;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    return Array.from({ length: count }, () => factory(random));
  }

  function pointAtPathDistance(targetDistance) {
    const safeDistance = clamp(targetDistance, 0, pathLength);
    let segment = pathSegments[pathSegments.length - 1];
    for (const candidate of pathSegments) {
      if (safeDistance <= candidate.offset + candidate.length) {
        segment = candidate;
        break;
      }
    }
    const localDistance = safeDistance - segment.offset;
    const t = clamp(localDistance / segment.length, 0, 1);
    return {
      x: lerp(segment.start.x, segment.end.x, t),
      y: lerp(segment.start.y, segment.end.y, t),
      angle: Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x),
    };
  }

  function pointToSegmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return distance(point, start);
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
  }

  function distanceToPath(point) {
    let closest = Infinity;
    for (const segment of pathSegments) {
      closest = Math.min(closest, pointToSegmentDistance(point, segment.start, segment.end));
    }
    return closest;
  }

  function cellCenter(col, row) {
    return {
      x: GRID.x + col * GRID.cell + GRID.cell / 2,
      y: GRID.y + row * GRID.cell + GRID.cell / 2,
    };
  }

  function cellAtPoint(x, y) {
    const col = Math.floor((x - GRID.x) / GRID.cell);
    const row = Math.floor((y - GRID.y) / GRID.cell);
    if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
    return { col, row };
  }

  function towerAtCell(cell) {
    return state.towers.find((tower) => tower.col === cell.col && tower.row === cell.row);
  }

  function isBuildableCell(cell) {
    if (!cell) return false;
    const center = cellCenter(cell.col, cell.row);
    return distanceToPath(center) > 57 && !towerAtCell(cell);
  }

  function selectedTower() {
    return state.towers.find((tower) => tower.id === state.selectedTowerId) || null;
  }

  function towerStats(tower) {
    const definition = towerDefinitions[tower.type];
    const levelMultiplier = 1 + (tower.level - 1) * 0.32;
    return {
      damage: Math.round(definition.damage * levelMultiplier),
      range: Math.round(definition.range + (tower.level - 1) * 13),
      fireRate: definition.fireRate * Math.pow(0.9, tower.level - 1),
      splash: definition.splash ? Math.round(definition.splash * (1 + (tower.level - 1) * 0.18)) : 0,
      burnDamage: definition.burnDamage
        ? Math.round(definition.burnDamage * levelMultiplier)
        : 0,
    };
  }

  function upgradeCost(tower) {
    if (tower.level >= 3) return 0;
    return Math.round(towerDefinitions[tower.type].cost * (0.75 + tower.level * 0.34));
  }

  function sellValue(tower) {
    return Math.floor(tower.invested * 0.62);
  }

  function showToast(message, duration = 2200) {
    elements.canvasToast.textContent = message;
    elements.canvasToast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.canvasToast.classList.remove("is-visible");
    }, duration);
  }

  function initializeAudio() {
    if (audioContext) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext = new AudioCtor();
  }

  function playTone(frequency, duration = 0.08, type = "sine", volume = 0.035, delay = 0) {
    if (!state.soundEnabled) return;
    initializeAudio();
    if (!audioContext) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.82), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSound(name) {
    if (name === "place") {
      playTone(280, 0.1, "triangle", 0.045);
      playTone(420, 0.1, "sine", 0.025, 0.05);
    } else if (name === "hit") {
      playTone(110, 0.055, "square", 0.012);
    } else if (name === "kill") {
      playTone(370, 0.08, "triangle", 0.02);
      playTone(520, 0.07, "sine", 0.018, 0.04);
    } else if (name === "wave") {
      playTone(240, 0.18, "triangle", 0.04);
      playTone(320, 0.2, "triangle", 0.035, 0.13);
    } else if (name === "loseLife") {
      playTone(145, 0.25, "sawtooth", 0.035);
    } else if (name === "victory") {
      [330, 415, 495, 660].forEach((frequency, index) => {
        playTone(frequency, 0.25, "triangle", 0.035, index * 0.12);
      });
    } else if (name === "upgrade") {
      playTone(460, 0.12, "sine", 0.04);
      playTone(610, 0.14, "sine", 0.03, 0.08);
    }
  }

  function startGame() {
    if (state.status !== "intro") return;
    elements.introOverlay.hidden = true;
    state.status = "running";
    state.soundEnabled = true;
    elements.soundIcon.textContent = "♪";
    elements.soundButton.setAttribute("aria-label", "关闭音效");
    selectBuild("carrot");
    updateHUD();
    showToast("先点一块发光的草地，种下胡萝卜弩手");
    playTone(330, 0.12, "triangle", 0.03);
  }

  function resetGame() {
    state = createState();
    state.status = "running";
    previewWaveIndex = -1;
    elements.resultOverlay.hidden = true;
    elements.introOverlay.hidden = true;
    elements.helpModal.hidden = true;
    elements.inspector.hidden = true;
    selectBuild("carrot");
    updateHUD();
    showToast("菜园已重新整备，准备迎接第 1 波");
  }

  function startWave() {
    if (state.status !== "running" || state.waveActive || state.waveIndex >= waves.length) return;

    const wave = waves[state.waveIndex];
    const queue = [];
    wave.groups.forEach((group, groupIndex) => {
      for (let i = 0; i < group.count; i += 1) {
        queue.push({
          type: group.type,
          interval: i === group.count - 1 && groupIndex < wave.groups.length - 1 ? 0.85 : group.interval,
        });
      }
    });

    state.waveActive = true;
    state.spawnQueue = queue;
    state.spawnTimer = 0.2;
    state.waveStats = { total: queue.length, resolved: 0, spawned: 0 };
    state.sunDrops = [];
    state.sunDropTimer = wave.phase === "day" ? 4.5 : 0;
    state.banner = {
      title: `第 ${state.waveIndex + 1} 波 · ${phaseDefinitions[wave.phase].name}`,
      subtitle:
        wave.phase === "day"
          ? "日照减产：点击阳光露珠补充种子"
          : "夜幕降临：虫群强化，击杀赏金提高",
      time: 3.1,
    };
    clearSelectedTower();
    playSound("wave");
    updateHUD();
    showToast(
      wave.phase === "day"
        ? "白昼：击杀种子 ×0.75，注意收集阳光露珠"
        : "夜晚：虫群更强，击杀种子 ×1.15，露珠不会生长"
    );
  }

  function spawnEnemy(typeName) {
    const definition = enemyDefinitions[typeName];
    const difficultyScale = 1 + state.waveIndex * 0.045;
    const phase = phaseDefinitions[waves[state.waveIndex].phase];
    const phaseHpScale = definition.boss ? 1 + (phase.hpMultiplier - 1) * 0.7 : phase.hpMultiplier;
    const enemy = {
      id: `${typeName}-${performance.now()}-${Math.random()}`,
      type: typeName,
      maxHp: Math.round(definition.hp * difficultyScale * phaseHpScale),
      hp: Math.round(definition.hp * difficultyScale * phaseHpScale),
      speed: definition.speed * phase.speedMultiplier,
      radius: definition.radius,
      reward: Math.max(3, Math.round(definition.reward * phase.rewardMultiplier)),
      pathDistance: 0,
      x: pathPoints[0].x,
      y: pathPoints[0].y,
      angle: 0,
      wobble: Math.random() * TAU,
      burnTime: 0,
      burnDps: 0,
      dead: false,
      reachedEnd: false,
    };
    state.enemies.push(enemy);
    state.waveStats.spawned += 1;
    return enemy;
  }

  function selectBuild(type) {
    if (!towerDefinitions[type]) return;
    state.selectedBuild = state.selectedBuild === type ? null : type;
    clearSelectedTower();
    syncTowerCards();
  }

  function tryBuild(cell, type) {
    if (!type || !state.selectedBuild) return;
    if (!isBuildableCell(cell)) {
      showToast("这里不能种菜：土路上和已经种下的格子都不行");
      return;
    }

    const definition = towerDefinitions[type];
    if (state.seeds < definition.cost) {
      showToast(`还差 ${definition.cost - state.seeds} 阳光种子`);
      playTone(130, 0.16, "square", 0.025);
      return;
    }

    const center = cellCenter(cell.col, cell.row);
    state.seeds -= definition.cost;
    state.totalEarned += definition.cost;
    const tower = {
      id: state.nextTowerId++,
      type,
      col: cell.col,
      row: cell.row,
      x: center.x,
      y: center.y,
      level: 1,
      cooldown: 0.25,
      invested: definition.cost,
      angle: -Math.PI / 2,
      fireFlash: 0,
      recoil: 0,
    };
    state.towers.push(tower);
    spawnBurst(center.x, center.y + 11, "#e7d58a", 9, 65);
    addFloater(center.x, center.y - 28, `-${definition.cost}`, "#fff7d2");
    playSound("place");
    updateHUD();
  }

  function selectTower(tower) {
    state.selectedBuild = null;
    state.selectedTowerId = tower.id;
    syncTowerCards();
    updateInspector();
  }

  function clearSelectedTower() {
    state.selectedTowerId = null;
    elements.inspector.hidden = true;
  }

  function updateInspector() {
    const tower = selectedTower();
    if (!tower) {
      elements.inspector.hidden = true;
      return;
    }
    const definition = towerDefinitions[tower.type];
    const stats = towerStats(tower);
    elements.inspector.hidden = false;
    elements.inspectorName.innerHTML = `${definition.name} <span>Lv.${tower.level}</span>`;
    elements.statDamage.textContent = stats.damage;
    elements.statRange.textContent = stats.range;
    elements.statSpeed.textContent = `${stats.fireRate.toFixed(2)}s`;

    if (tower.level >= 3) {
      elements.upgradeButton.disabled = true;
      elements.upgradeButton.innerHTML = "已满级 <span>MAX</span>";
    } else {
      const cost = upgradeCost(tower);
      elements.upgradeButton.disabled = state.seeds < cost;
      elements.upgradeButton.innerHTML = `升级 <span>✿ ${cost}</span>`;
    }
    elements.sellButton.textContent = `回收 +${sellValue(tower)}`;
  }

  function upgradeSelectedTower() {
    const tower = selectedTower();
    if (!tower || tower.level >= 3) return;
    const cost = upgradeCost(tower);
    if (state.seeds < cost) {
      showToast(`还差 ${cost - state.seeds} 阳光种子`);
      return;
    }
    state.seeds -= cost;
    tower.level += 1;
    tower.invested += cost;
    spawnBurst(tower.x, tower.y - 5, "#f1d55e", 16, 95);
    addFloater(tower.x, tower.y - 36, `Lv.${tower.level}`, "#fff5bb");
    playSound("upgrade");
    updateInspector();
    updateHUD();
  }

  function sellSelectedTower() {
    const tower = selectedTower();
    if (!tower) return;
    const refund = sellValue(tower);
    state.seeds += refund;
    state.towers = state.towers.filter((candidate) => candidate.id !== tower.id);
    spawnBurst(tower.x, tower.y, "#d8c477", 12, 80);
    addFloater(tower.x, tower.y - 20, `+${refund}`, "#fff2a7");
    clearSelectedTower();
    updateHUD();
    playTone(390, 0.12, "sine", 0.025);
  }

  function update(dt) {
    updatePhaseAtmosphere(dt);
    updateEconomy(dt);
    updateWave(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateEffects(dt);

    state.shake = Math.max(0, state.shake - dt * 16);
    state.flashRed = Math.max(0, state.flashRed - dt * 1.9);
    if (state.banner) {
      state.banner.time -= dt;
      if (state.banner.time <= 0) state.banner = null;
    }
  }

  function displayedPhaseKey() {
    if (state.waveIndex >= waves.length) return "night";
    const waveIndex = state.waveActive ? state.waveIndex : Math.min(state.waveIndex, waves.length - 1);
    return waves[waveIndex].phase;
  }

  function updatePhaseAtmosphere(dt) {
    const target = displayedPhaseKey() === "night" ? 1 : 0;
    state.nightAmount += (target - state.nightAmount) * Math.min(1, dt * 1.35);
  }

  function updateEconomy(dt) {
    for (const drop of state.sunDrops) {
      drop.life -= dt;
    }
    state.sunDrops = state.sunDrops.filter((drop) => drop.life > 0);

    if (!state.waveActive || waves[state.waveIndex]?.phase !== "day") {
      state.sunDropTimer = 0;
      return;
    }

    state.sunDropTimer -= dt;
    if (state.sunDropTimer <= 0 && state.sunDrops.length < 1) {
      spawnSunDrop();
      state.sunDropTimer = 8;
    }
  }

  function spawnSunDrop() {
    const candidates = [];
    for (let row = 0; row < GRID.rows; row += 1) {
      for (let col = 0; col < GRID.cols; col += 1) {
        const cell = { col, row };
        if (isBuildableCell(cell)) candidates.push(cellCenter(col, row));
      }
    }
    if (!candidates.length) {
      state.sunDropTimer = 5;
      return;
    }
    const position = candidates[Math.floor(Math.random() * candidates.length)];
    state.sunDrops.push({
      x: position.x,
      y: position.y,
      life: 7,
      maxLife: 7,
      phase: Math.random() * TAU,
    });

    if (!state.sunDropHintShown) {
      state.sunDropHintShown = true;
      showToast("阳光露珠出现了：点击金色光点，收集额外种子", 3000);
    }
  }

  function sunDropAtPoint(point) {
    return (
      state.sunDrops.find((drop) => Math.hypot(point.x - drop.x, point.y - drop.y) <= 28) || null
    );
  }

  function collectSunDrop(drop) {
    const amount = 6 + Math.floor(Math.random() * 5);
    state.seeds += amount;
    state.sunDrops = state.sunDrops.filter((candidate) => candidate !== drop);
    addFloater(drop.x, drop.y - 24, `阳光 +${amount}`, "#fff2a2", 1.15, 15);
    spawnParticles(drop.x, drop.y, "#f3cf5e", 14, 85, 0.75);
    playTone(520, 0.09, "sine", 0.03);
    playTone(690, 0.12, "sine", 0.022, 0.07);
    updateHUD();
  }

  function updateWave(dt) {
    if (!state.waveActive) return;
    if (state.spawnQueue.length) {
      state.spawnTimer -= dt;
      while (state.spawnTimer <= 0 && state.spawnQueue.length) {
        const spawn = state.spawnQueue.shift();
        spawnEnemy(spawn.type);
        state.spawnTimer += spawn.interval;
      }
    }
  }

  function updateEnemies(dt) {
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;

      if (enemy.burnTime > 0) {
        enemy.burnTime -= dt;
        damageEnemy(enemy, enemy.burnDps * dt, false, true);
        if (enemy.dead) continue;
      }

      enemy.pathDistance += enemy.speed * dt;
      const point = pointAtPathDistance(enemy.pathDistance);
      enemy.x = point.x;
      enemy.y = point.y;
      enemy.angle = point.angle;
      enemy.wobble += dt * (enemy.type === "moth" ? 11 : 7);

      if (enemy.pathDistance >= pathLength) {
        enemy.reachedEnd = true;
        enemy.dead = true;
        enemyReachedHome(enemy);
      }
    }

    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    state.enemies = state.enemies.filter((enemy) => !enemy.reachedEnd);

    if (
      state.waveActive &&
      state.spawnQueue.length === 0 &&
      state.enemies.length === 0 &&
      state.status === "running"
    ) {
      completeWave();
    }
  }

  function updateTowers(dt) {
    for (const tower of state.towers) {
      tower.cooldown -= dt;
      tower.fireFlash = Math.max(0, tower.fireFlash - dt * 3.3);
      tower.recoil = Math.max(0, tower.recoil - dt * 4.8);
      const stats = towerStats(tower);
      const target = findTarget(tower, stats.range);
      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0) {
        fireTower(tower, target, stats);
      }
    }
  }

  function findTarget(tower, range) {
    let best = null;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      if (distance(tower, enemy) > range + enemy.radius * 0.35) continue;
      if (!best || enemy.pathDistance > best.pathDistance) best = enemy;
    }
    return best;
  }

  function fireTower(tower, target, stats) {
    const definition = towerDefinitions[tower.type];
    tower.cooldown = stats.fireRate;
    tower.fireFlash = 1;
    tower.recoil = 1;

    if (tower.type === "chili") {
      state.effects.push({
        type: "firePulse",
        x: tower.x,
        y: tower.y,
        life: 0.46,
        maxLife: 0.46,
        radius: stats.range,
      });
      for (const enemy of state.enemies) {
        if (!enemy.dead && distance(tower, enemy) <= stats.range + enemy.radius) {
          damageEnemy(enemy, stats.damage, true);
          enemy.burnTime = Math.max(enemy.burnTime, definition.burnDuration);
          enemy.burnDps = Math.max(enemy.burnDps, stats.burnDamage);
          spawnParticles(enemy.x, enemy.y, "#e56b37", 3, 42, 0.45);
        }
      }
      playTone(180, 0.08, "sawtooth", 0.01);
      return;
    }

    const muzzleAngle = tower.angle;
    const muzzle = {
      x: tower.x + Math.cos(muzzleAngle) * 18,
      y: tower.y - 7 + Math.sin(muzzleAngle) * 13,
    };

    if (tower.type === "carrot") {
      state.projectiles.push({
        type: "carrotBolt",
        x: muzzle.x,
        y: muzzle.y,
        target,
        speed: definition.projectileSpeed,
        damage: stats.damage,
        angle: muzzleAngle,
        dead: false,
      });
    } else {
      const flightTime = tower.type === "onion" ? 0.58 : 0.78;
      state.projectiles.push({
        type: tower.type === "onion" ? "onionBomb" : "pumpkinBomb",
        sx: muzzle.x,
        sy: muzzle.y,
        x: muzzle.x,
        y: muzzle.y,
        target,
        tx: target.x,
        ty: target.y,
        t: 0,
        flightTime,
        damage: stats.damage,
        splash: stats.splash,
        angle: muzzleAngle,
        dead: false,
      });
    }
  }

  function updateProjectiles(dt) {
    for (const projectile of state.projectiles) {
      if (projectile.dead) continue;
      if (projectile.type === "carrotBolt") {
        if (!projectile.target || projectile.target.dead) {
          projectile.dead = true;
          continue;
        }
        const angle = Math.atan2(projectile.target.y - projectile.y, projectile.target.x - projectile.x);
        projectile.angle = angle;
        projectile.x += Math.cos(angle) * projectile.speed * dt;
        projectile.y += Math.sin(angle) * projectile.speed * dt;
        if (distance(projectile, projectile.target) <= projectile.target.radius + 4) {
          damageEnemy(projectile.target, projectile.damage, true);
          spawnParticles(projectile.x, projectile.y, "#f2b45e", 5, 58, 0.35);
          projectile.dead = true;
          playSound("hit");
        }
      } else {
        if (projectile.target && !projectile.target.dead && projectile.t < projectile.flightTime * 0.75) {
          projectile.tx = projectile.target.x;
          projectile.ty = projectile.target.y;
        }
        projectile.t += dt;
        const progress = clamp(projectile.t / projectile.flightTime, 0, 1);
        projectile.x = lerp(projectile.sx, projectile.tx, easeInOut(progress));
        projectile.y =
          lerp(projectile.sy, projectile.ty, easeInOut(progress)) -
          Math.sin(progress * Math.PI) * (projectile.type === "pumpkinBomb" ? 88 : 56);
        if (progress >= 1) {
          explodeProjectile(projectile);
          projectile.dead = true;
        }
      }
    }
    state.projectiles = state.projectiles.filter((projectile) => !projectile.dead);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function explodeProjectile(projectile) {
    const color = projectile.type === "onionBomb" ? "#bba1b4" : "#e5a045";
    state.effects.push({
      type: "burst",
      x: projectile.tx,
      y: projectile.ty,
      radius: projectile.splash,
      maxLife: 0.42,
      life: 0.42,
      color,
    });
    for (const enemy of state.enemies) {
      if (!enemy.dead && Math.hypot(enemy.x - projectile.tx, enemy.y - projectile.ty) <= projectile.splash + enemy.radius) {
        damageEnemy(enemy, projectile.damage, true);
      }
    }
    spawnParticles(projectile.tx, projectile.ty, color, 18, 125, 0.6);
    state.shake = Math.max(state.shake, projectile.type === "pumpkinBomb" ? 4 : 2);
    playTone(projectile.type === "pumpkinBomb" ? 105 : 150, 0.13, "triangle", 0.025);
  }

  function damageEnemy(enemy, amount, showHit = false, silent = false) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    if (showHit && Math.random() > 0.45) {
      spawnParticles(enemy.x, enemy.y, enemyDefinitions[enemy.type].color, 2, 38, 0.28);
    }
    if (enemy.hp <= 0) {
      enemy.dead = true;
      state.kills += 1;
      state.waveStats.resolved += 1;
      state.seeds += enemy.reward;
      addFloater(enemy.x, enemy.y - enemy.radius - 7, `+${enemy.reward}`, "#fff3a2");
      spawnParticles(enemy.x, enemy.y, enemyDefinitions[enemy.type].color, enemyDefinitions[enemy.type].boss ? 30 : 10, 105, 0.65);
      if (enemyDefinitions[enemy.type].boss) {
        state.shake = 8;
        state.banner = { title: "将军倒下了", subtitle: "菜园发出整齐的欢呼", time: 2.8 };
      }
      if (!silent) playSound("kill");
      updateHUD();
    }
  }

  function enemyReachedHome(enemy) {
    state.lives -= 1;
    state.waveStats.resolved += 1;
    state.shake = 7;
    state.flashRed = 1;
    addFloater(944, 330, "虫子偷吃了一口！", "#fff1e0", 1.4, 17);
    spawnParticles(940, 357, "#d45b49", 16, 110, 0.7);
    playSound("loseLife");
    updateHUD();
    if (state.lives <= 0) {
      finishGame(false);
    }
  }

  function completeWave() {
    state.waveActive = false;
    const completedWave = state.waveIndex + 1;
    const reward = 10 + completedWave * 4;
    state.seeds += reward;
    state.waveIndex += 1;

    if (state.waveIndex >= waves.length) {
      finishGame(true);
      return;
    }

    state.banner = {
      title: `第 ${completedWave} 波守住！`,
      subtitle: `节衣缩食，波次仅奖励 +${reward} 阳光种子`,
      time: 3.3,
    };
    addFloater(500, 350, `波次奖励 +${reward}`, "#fff0a0", 1.6, 20);
    playSound("victory");
    updateHUD();
  }

  function finishGame(won) {
    if (state.status === "won" || state.status === "lost") return;
    state.status = won ? "won" : "lost";
    state.waveActive = false;
    state.selectedBuild = null;
    clearSelectedTower();
    elements.waveButton.disabled = true;
    elements.resultWaves.textContent = `${Math.min(state.waveIndex, waves.length)} / ${waves.length}`;
    elements.resultKills.textContent = state.kills;

    if (won) {
      elements.resultStamp.textContent = "丰收";
      elements.resultKicker.textContent = "菜园保卫成功";
      elements.resultTitle.textContent = "晚餐保住了！";
      elements.resultCopy.textContent = "虫群暂时退去。蔬菜们收起武器，虫洞那边似乎还有新的动静……";
      playSound("victory");
    } else {
      elements.resultStamp.textContent = "失守";
      elements.resultKicker.textContent = "菜园保卫失败";
      elements.resultTitle.textContent = "今晚只能吃面了";
      elements.resultCopy.textContent = "虫子突破了菜篮。调整蔬菜搭配与升级顺序，再守一次。";
      playTone(145, 0.4, "sawtooth", 0.035);
    }

    window.setTimeout(() => {
      elements.resultOverlay.hidden = false;
    }, 700);
    updateHUD();
  }

  function spawnBurst(x, y, color, count, speed) {
    spawnParticles(x, y, color, count, speed, 0.7);
  }

  function spawnParticles(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 20,
        size: 1.5 + Math.random() * 3.3,
        color,
        life,
        maxLife: life,
      });
    }
  }

  function addFloater(x, y, text, color, life = 0.9, size = 13) {
    state.floaters.push({ x, y, text, color, life, maxLife: life, size });
  }

  function updateEffects(dt) {
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 120 * dt;
      particle.vx *= 0.98;
    }
    for (const floater of state.floaters) {
      floater.life -= dt;
      floater.y -= 25 * dt;
    }
    for (const effect of state.effects) {
      effect.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
    state.floaters = state.floaters.filter((floater) => floater.life > 0);
    state.effects = state.effects.filter((effect) => effect.life > 0);
  }

  function syncTowerCards() {
    for (const card of elements.towerCards) {
      const type = card.dataset.tower;
      const definition = towerDefinitions[type];
      card.classList.toggle("is-active", state.selectedBuild === type);
      card.classList.toggle("is-locked", state.seeds < definition.cost);
      card.setAttribute("aria-pressed", state.selectedBuild === type ? "true" : "false");
    }
  }

  function updatePhaseHUD(displayedWaveIndex) {
    const phaseKey =
      state.waveIndex >= waves.length ? "night" : waves[displayedWaveIndex].phase;
    const phase = phaseDefinitions[phaseKey];
    elements.phaseCard.dataset.phase = phaseKey;
    elements.phaseIcon.textContent = phase.icon;
    elements.phaseName.textContent = phase.name;
    elements.phaseDescription.textContent = phase.description;
    elements.phaseMultiplier.textContent = `击杀 ×${phase.rewardMultiplier.toFixed(2)}`;

    elements.phaseNodes.forEach((node, index) => {
      node.classList.toggle("is-current", index === displayedWaveIndex && state.status !== "won");
      node.classList.toggle(
        "is-complete",
        index < state.waveIndex || (state.status === "won" && index < waves.length)
      );
      node.setAttribute("aria-current", index === displayedWaveIndex ? "step" : "false");
    });
  }

  function updateHUD() {
    elements.livesValue.textContent = Math.max(0, state.lives);
    elements.seedsValue.textContent = state.seeds;
    syncTowerCards();
    updateInspector();

    const displayedWaveIndex = state.waveActive
      ? state.waveIndex
      : Math.min(state.waveIndex, waves.length - 1);
    const wave = waves[displayedWaveIndex];
    updatePhaseHUD(displayedWaveIndex);

    if (state.waveActive) {
      elements.waveTitle.textContent = `第 ${state.waveIndex + 1} 波 · ${wave.name}`;
      elements.waveCount.textContent = `${state.waveStats.resolved} / ${state.waveStats.total}`;
    } else if (state.waveIndex >= waves.length) {
      elements.waveTitle.textContent = "全部波次完成";
      elements.waveCount.textContent = `${waves.length} / ${waves.length}`;
    } else {
      elements.waveTitle.textContent = `下一波 · ${wave.name}`;
      elements.waveCount.textContent = `${state.waveIndex} / ${waves.length}`;
    }

    const progress = state.waveActive
      ? state.waveStats.resolved / Math.max(1, state.waveStats.total)
      : state.waveIndex / waves.length;
    elements.waveProgress.style.width = `${clamp(progress, 0, 1) * 100}%`;

    if (previewWaveIndex !== displayedWaveIndex) {
      previewWaveIndex = displayedWaveIndex;
      renderWavePreview(wave);
    }

    if (state.status === "won" || state.status === "lost") {
      elements.waveButton.disabled = true;
      elements.waveButtonLabel.textContent = state.status === "won" ? "守卫成功" : "菜园失守";
      elements.waveButtonSub.textContent = "查看本局结果";
    } else if (state.waveActive) {
      const remaining = state.waveStats.total - state.waveStats.resolved;
      elements.waveButton.disabled = true;
      elements.waveButtonLabel.textContent = "虫群来袭中";
      elements.waveButtonSub.textContent = `还剩 ${remaining} 只`;
    } else if (state.status === "intro") {
      elements.waveButton.disabled = true;
      elements.waveButtonLabel.textContent = "准备防守";
      elements.waveButtonSub.textContent = "先种下第一棵蔬菜";
    } else {
      elements.waveButton.disabled = false;
      elements.waveButtonLabel.textContent =
        state.waveIndex === 0 ? "开始第 1 波" : `迎接第 ${state.waveIndex + 1} 波`;
      elements.waveButtonSub.textContent =
        wave.phase === "day" ? "白昼收益低，记得留人收露珠" : "入夜更强，谨慎开战";
    }
  }

  function renderWavePreview(wave) {
    elements.wavePreview.innerHTML = "";
    for (const group of wave.groups) {
      const definition = enemyDefinitions[group.type];
      const item = document.createElement("span");
      item.className = "bug-preview";
      item.innerHTML = `<span class="bug-emoji">${definition.emoji}</span>${definition.name} × ${group.count}`;
      elements.wavePreview.appendChild(item);
    }
  }

  function togglePause() {
    if (state.status === "running") {
      state.status = "paused";
      elements.pauseIcon.textContent = "▶";
      showToast("已暂停，菜园时间停止了");
    } else if (state.status === "paused") {
      state.status = "running";
      elements.pauseIcon.textContent = "Ⅱ";
      showToast("继续守卫");
    }
  }

  function toggleSpeed() {
    state.speed = state.speed === 1 ? 2 : 1;
    elements.speedLabel.textContent = `${state.speed}×`;
    elements.speedButton.classList.toggle("is-active", state.speed === 2);
    showToast(`战斗速度 ${state.speed}×`);
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    elements.soundIcon.textContent = state.soundEnabled ? "♪" : "×";
    elements.soundButton.setAttribute("aria-label", state.soundEnabled ? "关闭音效" : "开启音效");
    if (state.soundEnabled) playTone(390, 0.1, "sine", 0.03);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        if (screen.orientation?.lock) {
          await screen.orientation.lock("landscape").catch(() => {});
        }
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      showToast("当前浏览器不允许自动全屏，请使用浏览器菜单中的“全屏”");
    }
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  function handlePointerMove(event) {
    state.pointer = canvasPoint(event);
    state.hoverCell = cellAtPoint(state.pointer.x, state.pointer.y);
    canvas.style.cursor = sunDropAtPoint(state.pointer)
      ? "pointer"
      : state.selectedBuild
        ? "cell"
        : "crosshair";
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || state.status !== "running") return;
    initializeAudio();
    const point = canvasPoint(event);
    const cell = cellAtPoint(point.x, point.y);
    state.pointer = point;
    state.hoverCell = cell;
    const sunDrop = sunDropAtPoint(point);
    if (sunDrop) {
      collectSunDrop(sunDrop);
      return;
    }
    if (!cell) return;
    const existingTower = towerAtCell(cell);
    if (existingTower && !state.selectedBuild) {
      selectTower(existingTower);
      return;
    }
    if (existingTower && state.selectedBuild) {
      selectTower(existingTower);
      return;
    }
    if (state.selectedBuild) {
      tryBuild(cell, state.selectedBuild);
      return;
    }
    clearSelectedTower();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    drawGarden();
    drawPath();
    drawGardenDetails();
    drawBuildOverlay();
    drawHomeAndBurrow();
    drawRangeIndicators();

    const drawableEntities = [
      ...state.enemies.map((enemy) => ({ kind: "enemy", item: enemy, y: enemy.y })),
      ...state.towers.map((tower) => ({ kind: "tower", item: tower, y: tower.y })),
    ].sort((a, b) => a.y - b.y);

    for (const entity of drawableEntities) {
      if (entity.kind === "enemy") drawEnemy(entity.item);
      else drawTower(entity.item);
    }

    drawProjectiles();
    drawEffects();
    drawAtmosphere();
    drawSunDrops();
    drawParticles();
    drawFloaters();
    drawBanner();

    if (state.status === "paused") drawPauseOverlay();
    if (state.flashRed > 0) {
      ctx.fillStyle = `rgba(190, 56, 40, ${state.flashRed * 0.16})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function drawGarden() {
    const gradient = ctx.createLinearGradient(GRID.x, GRID.y, GRID.x, GRID.y + GRID.rows * GRID.cell);
    gradient.addColorStop(0, "#b4d18b");
    gradient.addColorStop(1, "#99bd77");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    for (let row = 0; row < GRID.rows; row += 1) {
      for (let col = 0; col < GRID.cols; col += 1) {
        const x = GRID.x + col * GRID.cell;
        const y = GRID.y + row * GRID.cell;
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = "rgba(255, 255, 223, 0.045)";
          ctx.fillRect(x, y, GRID.cell, GRID.cell);
        }
        ctx.strokeStyle = "rgba(67, 109, 61, 0.075)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, GRID.cell - 1, GRID.cell - 1);
      }
    }

    ctx.strokeStyle = "rgba(61, 99, 55, 0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(GRID.x + 0.5, GRID.y + 0.5, GRID.cols * GRID.cell - 1, GRID.rows * GRID.cell - 1);

    for (const speckle of grassSpeckles) {
      if (speckle.flower) {
        ctx.fillStyle = "rgba(255, 249, 205, 0.8)";
        for (let petal = 0; petal < 5; petal += 1) {
          const angle = (petal / 5) * TAU;
          ctx.beginPath();
          ctx.arc(speckle.x + Math.cos(angle) * 3, speckle.y + Math.sin(angle) * 3, 1.6, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = "#d8b64c";
        ctx.beginPath();
        ctx.arc(speckle.x, speckle.y, 1.4, 0, TAU);
        ctx.fill();
      } else {
        ctx.strokeStyle = speckle.tone;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(speckle.x, speckle.y);
        ctx.lineTo(speckle.x - speckle.size, speckle.y - speckle.size * 2);
        ctx.stroke();
      }
    }

    drawBoardCornerLeaves();
  }

  function drawBoardCornerLeaves() {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#527b49";
    const corners = [
      { x: 31, y: 43, angle: -0.7 },
      { x: 968, y: H - 42, angle: -2.4 },
    ];
    for (const corner of corners) {
      ctx.save();
      ctx.translate(corner.x, corner.y);
      ctx.rotate(corner.angle);
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(8 + i * 7, Math.sin(i) * 5, 9, 3.5, Math.sin(i) * 0.3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPath() {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const tracePath = () => {
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i += 1) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
    };

    tracePath();
    ctx.strokeStyle = "rgba(56, 85, 50, 0.35)";
    ctx.lineWidth = 84;
    ctx.stroke();

    tracePath();
    ctx.strokeStyle = "#86623f";
    ctx.lineWidth = 78;
    ctx.stroke();

    tracePath();
    ctx.strokeStyle = "#b99364";
    ctx.lineWidth = 66;
    ctx.stroke();

    tracePath();
    ctx.strokeStyle = "rgba(238, 208, 155, 0.32)";
    ctx.lineWidth = 56;
    ctx.stroke();

    for (const speckle of pathSpeckles) {
      ctx.fillStyle = `rgba(94, 67, 42, ${speckle.alpha})`;
      ctx.beginPath();
      ctx.arc(speckle.x, speckle.y, speckle.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGardenDetails() {
    drawFencePost(64, 94, -0.1);
    drawFencePost(144, 94, 0.08);
    drawFencePost(224, 94, -0.06);
    drawFlowerPatch(850, 82);
    drawFlowerPatch(100, 500);
    drawFlowerPatch(570, 515);
    drawPebbles(654, 480);
  }

  function drawFencePost(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(87, 71, 42, 0.3)";
    ctx.beginPath();
    ctx.ellipse(3, 20, 13, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#876d45";
    ctx.fillRect(-3, -10, 6, 28);
    ctx.fillStyle = "#a88b59";
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(0, -16);
    ctx.lineTo(4, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(66, 84, 43, 0.45)";
    ctx.fillRect(-4, 4, 8, 2);
    ctx.restore();
  }

  function drawFlowerPatch(x, y) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * TAU;
      const radius = 10 + (i % 3) * 5;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * 0.55;
      ctx.strokeStyle = "rgba(62, 103, 53, 0.32)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py + 3);
      ctx.lineTo(px, py - 3);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? "rgba(249, 245, 213, 0.8)" : "rgba(241, 205, 106, 0.8)";
      ctx.beginPath();
      ctx.arc(px, py - 4, 2.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPebbles(x, y) {
    ctx.save();
    ctx.fillStyle = "rgba(92, 91, 60, 0.22)";
    [[0, 0, 4, 2], [13, 7, 3, 1.5], [-9, 11, 2.5, 1.2]].forEach(([px, py, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x + px, y + py, rx, ry, 0, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawBuildOverlay() {
    if (!state.selectedBuild) return;
    for (let row = 0; row < GRID.rows; row += 1) {
      for (let col = 0; col < GRID.cols; col += 1) {
        const cell = { col, row };
        if (!isBuildableCell(cell)) continue;
        const x = GRID.x + col * GRID.cell;
        const y = GRID.y + row * GRID.cell;
        const isHover = state.hoverCell && state.hoverCell.col === col && state.hoverCell.row === row;
        ctx.fillStyle = isHover ? "rgba(250, 246, 175, 0.33)" : "rgba(251, 248, 194, 0.1)";
        ctx.fillRect(x + 5, y + 5, GRID.cell - 10, GRID.cell - 10);
        ctx.strokeStyle = isHover ? "rgba(255, 250, 191, 0.92)" : "rgba(244, 242, 180, 0.22)";
        ctx.lineWidth = isHover ? 2 : 1;
        ctx.strokeRect(x + 6, y + 6, GRID.cell - 12, GRID.cell - 12);
        if (isHover) {
          ctx.fillStyle = "rgba(60, 90, 48, 0.72)";
          ctx.font = '700 20px "Microsoft YaHei"';
          ctx.textAlign = "center";
          ctx.fillText("+", x + GRID.cell / 2, y + GRID.cell / 2 + 7);
        }
      }
    }

    if (state.hoverCell && isBuildableCell(state.hoverCell)) {
      const center = cellCenter(state.hoverCell.col, state.hoverCell.row);
      const definition = towerDefinitions[state.selectedBuild];
      const stats = towerStats({ type: state.selectedBuild, level: 1 });
      drawRangeRing(center.x, center.y, stats.range, definition.color);
      ctx.save();
      ctx.globalAlpha = 0.62;
      drawTowerGhost(state.selectedBuild, center.x, center.y);
      ctx.restore();
    }
  }

  function drawRangeIndicators() {
    const tower = selectedTower();
    if (!tower) return;
    const stats = towerStats(tower);
    drawRangeRing(tower.x, tower.y, stats.range, towerDefinitions[tower.type].color);
  }

  function drawRangeRing(x, y, radius, color) {
    ctx.save();
    ctx.fillStyle = hexToRgba(color, 0.075);
    ctx.strokeStyle = hexToRgba(color, 0.52);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = Number.parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function drawHomeAndBurrow() {
    const start = pathPoints[0];
    const end = pathPoints[pathPoints.length - 1];

    ctx.save();
    ctx.translate(start.x + 17, start.y);
    ctx.fillStyle = "#5c4d33";
    ctx.beginPath();
    ctx.ellipse(0, 2, 27, 22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#252f23";
    ctx.beginPath();
    ctx.ellipse(7, 2, 17, 13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#839861";
    ctx.beginPath();
    ctx.ellipse(-6, -13, 15, 6, -0.25, 0, TAU);
    ctx.fill();
    ctx.restore();

    drawWoodSign(54, 316, "虫洞", -0.02);

    ctx.save();
    ctx.translate(end.x - 3, end.y);
    ctx.fillStyle = "rgba(55, 48, 29, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 24, 31, 8, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#8f643b";
    ctx.beginPath();
    ctx.roundRect(-28, -13, 57, 37, 8);
    ctx.fill();
    ctx.strokeStyle = "#6f4c2d";
    ctx.lineWidth = 2;
    for (let x = -21; x <= 21; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x + 2, 20);
      ctx.stroke();
    }
    ctx.fillStyle = "#a77c4b";
    ctx.beginPath();
    ctx.roundRect(-31, -17, 63, 10, 6);
    ctx.fill();

    drawMiniVegetable(end.x - 16, end.y - 21, "carrot");
    drawMiniVegetable(end.x + 2, end.y - 24, "leaf");
    drawMiniVegetable(end.x + 17, end.y - 19, "chili");
    ctx.restore();
  }

  function drawWoodSign(x, y, label, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "#7a5c38";
    ctx.fillRect(-2, -12, 4, 28);
    ctx.fillStyle = "#9e7b4a";
    ctx.beginPath();
    ctx.roundRect(-27, -22, 54, 24, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(79, 53, 30, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-23, -18, 46, 16);
    ctx.fillStyle = "#f2e2b6";
    ctx.font = '700 12px "Microsoft YaHei"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, -10);
    ctx.restore();
  }

  function drawMiniVegetable(x, y, type) {
    if (type === "carrot") {
      ctx.fillStyle = "#df7130";
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 9, -0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#4f7946";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x - 4, y - 14);
      ctx.moveTo(x + 1, y - 7);
      ctx.lineTo(x + 4, y - 13);
      ctx.stroke();
    } else if (type === "chili") {
      ctx.fillStyle = "#c84732";
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 8, 0.5, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = "#567c46";
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 9, 0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#78985b";
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 7);
      ctx.lineTo(x + 3, y + 7);
      ctx.stroke();
    }
  }

  function drawTowerGhost(type, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(44, 72, 42, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 25, 8, 0, 0, TAU);
    ctx.fill();
    drawTowerBody(type, { level: 1, angle: -Math.PI / 2, recoil: 0, fireFlash: 0 }, 0, 0, true);
    ctx.restore();
  }

  function drawTower(tower) {
    const selected = tower.id === state.selectedTowerId;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.fillStyle = "rgba(42, 67, 39, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 26, 8, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#8b6d49";
    ctx.beginPath();
    ctx.arc(0, 8, 24, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#b8a16e";
    ctx.beginPath();
    ctx.arc(0, 5, 21, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(98, 77, 48, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 5, 16, 0, TAU);
    ctx.stroke();

    if (selected) {
      ctx.strokeStyle = "#fff2a2";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 7, 29, 0, TAU);
      ctx.stroke();
    }

    drawTowerBody(tower.type, tower, 0, 0, false);

    ctx.fillStyle = "#30513a";
    ctx.beginPath();
    ctx.arc(18, -21, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f8efc8";
    ctx.font = '700 9px "Microsoft YaHei"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tower.level, 18, -21);
    ctx.restore();
  }

  function drawTowerBody(type, tower, originX, originY, ghost) {
    ctx.save();
    ctx.translate(originX, originY);
    const recoil = tower.recoil || 0;
    ctx.translate(-Math.cos(tower.angle || 0) * recoil * 2.5, -Math.sin(tower.angle || 0) * recoil * 2.5);
    if (tower.fireFlash > 0) {
      ctx.fillStyle = `rgba(255, 222, 104, ${tower.fireFlash * 0.25})`;
      ctx.beginPath();
      ctx.arc(0, -7, 29, 0, TAU);
      ctx.fill();
    }

    if (type === "carrot") drawCarrotTower(tower);
    else if (type === "onion") drawOnionTower(tower);
    else if (type === "chili") drawChiliTower(tower);
    else drawPumpkinTower(tower);

    if (ghost) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 250, 204, 0.4)";
      ctx.fillRect(-40, -50, 80, 80);
    }
    ctx.restore();
  }

  function drawCarrotTower(tower) {
    ctx.save();
    ctx.translate(0, 2);

    ctx.strokeStyle = "#517541";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.rotate(-0.6 + i * 0.28);
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.quadraticCurveTo(-3, -38, 2, -43);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "#ed8b3e";
    ctx.beginPath();
    ctx.moveTo(-13, -18);
    ctx.quadraticCurveTo(0, -28, 13, -18);
    ctx.lineTo(7, 15);
    ctx.quadraticCurveTo(0, 22, -7, 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(161, 75, 28, 0.35)";
    ctx.lineWidth = 1.5;
    for (let y = -9; y < 11; y += 8) {
      ctx.beginPath();
      ctx.moveTo(-7, y);
      ctx.lineTo(-1, y - 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#f4cfac";
    ctx.beginPath();
    ctx.arc(-4, -12, 3, 0, TAU);
    ctx.arc(5, -12, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#283d2b";
    ctx.beginPath();
    ctx.arc(-4, -12, 1.2, 0, TAU);
    ctx.arc(5, -12, 1.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#8d4e2f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -6, 4, 0.15, Math.PI - 0.2);
    ctx.stroke();

    ctx.rotate(tower.angle || 0);
    ctx.strokeStyle = "#5b4932";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(13, 0, 12, -1.15, 1.15);
    ctx.stroke();
    ctx.strokeStyle = "#d8bc80";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(14, -11);
    ctx.lineTo(14, 11);
    ctx.stroke();
    ctx.fillStyle = "#4f3e2d";
    ctx.beginPath();
    ctx.arc(19, 0, 2.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawOnionTower(tower) {
    ctx.save();
    ctx.translate(0, 2);
    ctx.fillStyle = "#a3839c";
    ctx.beginPath();
    ctx.ellipse(0, 1, 18, 23, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(94, 64, 90, 0.25)";
    ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(i * 7, 1, 11, 21, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = "#d3b7c8";
    ctx.beginPath();
    ctx.ellipse(-5, -5, 7, 12, -0.3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#55784d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(-6, -31, 6, -38);
    ctx.stroke();
    ctx.fillStyle = "#32422f";
    ctx.beginPath();
    ctx.arc(-5, 0, 2, 0, TAU);
    ctx.arc(6, 0, 2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#725069";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 6, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.rotate(tower.angle || 0);
    ctx.fillStyle = "#647e68";
    ctx.beginPath();
    ctx.roundRect(7, -8, 24, 16, 5);
    ctx.fill();
    ctx.fillStyle = "#324837";
    ctx.beginPath();
    ctx.ellipse(31, 0, 4, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#d9c5d2";
    ctx.beginPath();
    ctx.arc(10, -1, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawChiliTower(tower) {
    ctx.save();
    ctx.translate(0, 3);
    ctx.strokeStyle = "#4e7444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -19);
    ctx.quadraticCurveTo(-12, -31, -4, -38);
    ctx.stroke();
    ctx.fillStyle = "#4a7546";
    ctx.beginPath();
    ctx.ellipse(-8, -20, 12, 5, -0.3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#c94432";
    ctx.beginPath();
    ctx.moveTo(-8, -17);
    ctx.quadraticCurveTo(10, -14, 13, 2);
    ctx.quadraticCurveTo(15, 17, 4, 23);
    ctx.quadraticCurveTo(-4, 12, -8, -17);
    ctx.fill();
    ctx.strokeStyle = "rgba(115, 34, 28, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.quadraticCurveTo(7, 1, 5, 15);
    ctx.stroke();

    ctx.fillStyle = "#2e3b29";
    ctx.beginPath();
    ctx.arc(-2, -7, 2, 0, TAU);
    ctx.arc(6, -5, 2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#853c2a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(2, 2, 3.2, 0.2, Math.PI - 0.2);
    ctx.stroke();

    const flicker = Math.sin(ambientTime * 9 + tower.x) * 0.08;
    ctx.rotate(tower.angle || 0);
    ctx.fillStyle = `rgba(238, 151, 48, ${0.48 + flicker})`;
    ctx.beginPath();
    ctx.moveTo(13, -8);
    ctx.quadraticCurveTo(26, -13, 29, 0);
    ctx.quadraticCurveTo(25, 11, 13, 8);
    ctx.quadraticCurveTo(18, 0, 13, -8);
    ctx.fill();
    ctx.fillStyle = "#ffe17a";
    ctx.beginPath();
    ctx.ellipse(20, 0, 5, 3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawPumpkinTower(tower) {
    ctx.save();
    ctx.translate(0, 4);
    ctx.strokeStyle = "#5e7448";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-1, -17);
    ctx.quadraticCurveTo(2, -27, 8, -30);
    ctx.stroke();
    ctx.fillStyle = "#5f7f48";
    ctx.beginPath();
    ctx.ellipse(8, -29, 8, 4, -0.3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#df8f37";
    ctx.beginPath();
    ctx.ellipse(0, 2, 20, 18, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(142, 78, 29, 0.28)";
    ctx.lineWidth = 1.3;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(i * 7, 2, 10, 17, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = "#304029";
    ctx.beginPath();
    ctx.moveTo(-9, -1);
    ctx.lineTo(-3, -5);
    ctx.lineTo(-3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -1);
    ctx.lineTo(3, -5);
    ctx.lineTo(3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#82452c";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 6, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.rotate((tower.angle || 0) - 0.65 + Math.sin(ambientTime * 2.2) * 0.04);
    ctx.fillStyle = "#684b2c";
    ctx.fillRect(7, -3, 27, 5);
    ctx.beginPath();
    ctx.arc(8, 0, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#b58f58";
    ctx.beginPath();
    ctx.arc(33, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const definition = enemyDefinitions[enemy.type];
    const bob = Math.sin(enemy.wobble) * (enemy.type === "moth" ? 2.4 : 1.1);
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bob);

    ctx.fillStyle = "rgba(40, 56, 36, 0.18)";
    ctx.beginPath();
    ctx.ellipse(1, enemy.radius + 7, enemy.radius * 0.95, 4, 0, 0, TAU);
    ctx.fill();

    ctx.rotate(enemy.angle + Math.PI / 2);
    if (enemy.type === "aphid") drawAphid(enemy, definition);
    else if (enemy.type === "beetle") drawBeetle(enemy, definition);
    else if (enemy.type === "moth") drawMoth(enemy, definition);
    else if (enemy.type === "snail") drawSnail(enemy, definition);
    else drawBossBug(enemy, definition);
    ctx.restore();

    if (enemy.hp < enemy.maxHp) {
      const width = enemy.type === "boss" ? 54 : 28;
      const barY = enemy.y - enemy.radius - 15 + bob;
      ctx.fillStyle = "rgba(29, 46, 29, 0.45)";
      ctx.beginPath();
      ctx.roundRect(enemy.x - width / 2, barY, width, 4, 3);
      ctx.fill();
      ctx.fillStyle = enemy.hp / enemy.maxHp < 0.35 ? "#d55e43" : "#d8d267";
      ctx.beginPath();
      ctx.roundRect(enemy.x - width / 2, barY, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 4, 3);
      ctx.fill();
    }
  }

  function drawBugLegs(radius, color, speedWiggle) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const y = -5 + i * 6;
        const wiggle = Math.sin(speedWiggle + i * 1.8 + (side > 0 ? Math.PI : 0)) * 2;
        ctx.beginPath();
        ctx.moveTo(side * radius * 0.55, y);
        ctx.lineTo(side * (radius + 5), y + wiggle + 3);
        ctx.stroke();
      }
    }
  }

  function drawAphid(enemy, definition) {
    drawBugLegs(enemy.radius, "#4f6f36", enemy.wobble);
    ctx.strokeStyle = "#425e31";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, -enemy.radius + 2);
    ctx.lineTo(-9, -enemy.radius - 8);
    ctx.moveTo(4, -enemy.radius + 2);
    ctx.lineTo(9, -enemy.radius - 8);
    ctx.stroke();
    ctx.fillStyle = "#6a9c47";
    ctx.beginPath();
    ctx.ellipse(0, 7, 9, 12, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8bbd5e";
    ctx.beginPath();
    ctx.ellipse(0, -5, 9, 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#365235";
    ctx.beginPath();
    ctx.arc(0, -11, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f5e7b0";
    ctx.beginPath();
    ctx.arc(-3, -13, 1.8, 0, TAU);
    ctx.arc(3, -13, 1.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#243325";
    ctx.beginPath();
    ctx.arc(-3, -13, 0.8, 0, TAU);
    ctx.arc(3, -13, 0.8, 0, TAU);
    ctx.fill();
  }

  function drawBeetle(enemy, definition) {
    drawBugLegs(enemy.radius, "#463425", enemy.wobble);
    ctx.fillStyle = "#5f432d";
    ctx.beginPath();
    ctx.ellipse(0, 2, 13, 17, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8b6745";
    ctx.beginPath();
    ctx.ellipse(-3, -2, 8, 13, -0.12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#5e4029";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, -11);
    ctx.lineTo(1, 14);
    ctx.stroke();
    ctx.fillStyle = "#4e3727";
    ctx.beginPath();
    ctx.arc(0, -13, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#3f3022";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, -18);
    ctx.lineTo(-7, -27);
    ctx.moveTo(3, -18);
    ctx.lineTo(7, -27);
    ctx.stroke();
    ctx.fillStyle = "#e4ce8d";
    ctx.beginPath();
    ctx.arc(-3, -14, 1.4, 0, TAU);
    ctx.arc(3, -14, 1.4, 0, TAU);
    ctx.fill();
  }

  function drawMoth(enemy, definition) {
    const flap = 0.68 + Math.abs(Math.sin(enemy.wobble * 1.4)) * 0.32;
    ctx.fillStyle = "rgba(190, 167, 199, 0.82)";
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * flap, 1);
      ctx.beginPath();
      ctx.ellipse(13, -3, 15, 10, -0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(213, 190, 221, 0.8)";
      ctx.beginPath();
      ctx.ellipse(10, 8, 11, 7, 0.6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = "#68596e";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2, -11);
    ctx.quadraticCurveTo(-8, -19, -10, -22);
    ctx.moveTo(2, -11);
    ctx.quadraticCurveTo(8, -19, 10, -22);
    ctx.stroke();
    ctx.fillStyle = "#75607d";
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#493e4e";
    ctx.beginPath();
    ctx.arc(0, -12, 5.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f1d4a3";
    ctx.beginPath();
    ctx.arc(-2, -13, 1.2, 0, TAU);
    ctx.arc(2, -13, 1.2, 0, TAU);
    ctx.fill();
  }

  function drawSnail(enemy, definition) {
    ctx.fillStyle = "#8e785c";
    ctx.beginPath();
    ctx.ellipse(0, 8, 8, 18, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#9d845e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(-3, 18);
    ctx.stroke();
    ctx.fillStyle = "#b7a384";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#76614d";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0.2, TAU * 1.2);
    ctx.arc(0, 0, 5.5, 0.5, TAU * 1.2);
    ctx.stroke();
    ctx.fillStyle = "#8e785c";
    ctx.beginPath();
    ctx.ellipse(0, -15, 6, 5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#6e5b47";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, -18);
    ctx.lineTo(-7, -24);
    ctx.moveTo(3, -18);
    ctx.lineTo(7, -24);
    ctx.stroke();
    ctx.fillStyle = "#f5e6b4";
    ctx.beginPath();
    ctx.arc(-2, -16, 1.2, 0, TAU);
    ctx.arc(2, -16, 1.2, 0, TAU);
    ctx.fill();
  }

  function drawBossBug(enemy, definition) {
    drawBugLegs(enemy.radius, "#593c33", enemy.wobble);
    ctx.fillStyle = "#8f4438";
    ctx.beginPath();
    ctx.ellipse(0, 4, 22, 27, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#c25849";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(side * (10 + (i % 2) * 4), -11 + i * 12, 4.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "#6c342d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(0, 26);
    ctx.stroke();
    ctx.fillStyle = "#49352f";
    ctx.beginPath();
    ctx.arc(0, -23, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#553b2e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -30);
    ctx.quadraticCurveTo(-10, -39, -5, -43);
    ctx.moveTo(5, -30);
    ctx.quadraticCurveTo(10, -39, 5, -43);
    ctx.stroke();
    ctx.fillStyle = "#f6df91";
    ctx.beginPath();
    ctx.arc(-4, -24, 2.2, 0, TAU);
    ctx.arc(4, -24, 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#d5b44f";
    ctx.beginPath();
    ctx.moveTo(-10, -34);
    ctx.lineTo(-7, -43);
    ctx.lineTo(-2, -36);
    ctx.lineTo(2, -44);
    ctx.lineTo(6, -36);
    ctx.lineTo(11, -42);
    ctx.lineTo(9, -32);
    ctx.closePath();
    ctx.fill();
  }

  function drawProjectiles() {
    for (const projectile of state.projectiles) {
      if (projectile.type === "carrotBolt") {
        ctx.save();
        ctx.translate(projectile.x, projectile.y);
        ctx.rotate(projectile.angle);
        ctx.strokeStyle = "rgba(255, 217, 120, 0.35)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-13, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = "#f3a84f";
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-4, -3);
        ctx.lineTo(-4, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        const isPumpkin = projectile.type === "pumpkinBomb";
        ctx.fillStyle = "rgba(49, 63, 38, 0.13)";
        ctx.beginPath();
        ctx.ellipse(projectile.x, projectile.ty + 5, isPumpkin ? 9 : 6, 3, 0, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(projectile.x, projectile.y);
        ctx.rotate(projectile.t * 7);
        ctx.fillStyle = isPumpkin ? "#df8732" : "#b9a2b2";
        ctx.beginPath();
        ctx.arc(0, 0, isPumpkin ? 7.5 : 5.5, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = isPumpkin ? "#9b592a" : "#8f748b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 6);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawEffects() {
    for (const effect of state.effects) {
      const progress = 1 - effect.life / effect.maxLife;
      if (effect.type === "burst") {
        const radius = effect.radius * (0.25 + progress * 0.75);
        ctx.fillStyle = hexToRgba(effect.color, (1 - progress) * 0.18);
        ctx.strokeStyle = hexToRgba(effect.color, (1 - progress) * 0.7);
        ctx.lineWidth = 2 + (1 - progress) * 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, TAU);
        ctx.fill();
        ctx.stroke();
      } else {
        const radius = effect.radius * (0.2 + progress * 0.9);
        ctx.fillStyle = `rgba(239, 119, 45, ${(1 - progress) * 0.12})`;
        ctx.strokeStyle = `rgba(255, 185, 73, ${(1 - progress) * 0.58})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function drawAtmosphere() {
    const night = state.nightAmount;
    ctx.save();

    if (night < 0.995) {
      const dayAlpha = 1 - night;
      const sunGlow = ctx.createRadialGradient(810, 90, 10, 810, 90, 520);
      sunGlow.addColorStop(0, `rgba(255, 232, 158, ${0.14 * dayAlpha})`);
      sunGlow.addColorStop(0.45, `rgba(255, 228, 151, ${0.055 * dayAlpha})`);
      sunGlow.addColorStop(1, "rgba(255, 228, 151, 0)");
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, W, H);
    }

    if (night > 0.005) {
      const dusk = ctx.createLinearGradient(0, 0, 0, H);
      dusk.addColorStop(0, `rgba(24, 34, 76, ${0.44 * night})`);
      dusk.addColorStop(0.58, `rgba(31, 43, 75, ${0.34 * night})`);
      dusk.addColorStop(1, `rgba(19, 31, 59, ${0.46 * night})`);
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, W, H);

      const moonHalo = ctx.createRadialGradient(845, 105, 2, 845, 105, 94);
      moonHalo.addColorStop(0, `rgba(236, 236, 195, ${0.23 * night})`);
      moonHalo.addColorStop(1, "rgba(236, 236, 195, 0)");
      ctx.fillStyle = moonHalo;
      ctx.fillRect(735, 0, 220, 220);
      ctx.fillStyle = `rgba(239, 236, 192, ${0.74 * night})`;
      ctx.beginPath();
      ctx.arc(845, 105, 15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(42, 52, 83, ${0.8 * night})`;
      ctx.beginPath();
      ctx.arc(852, 99, 14, 0, TAU);
      ctx.fill();

      for (const mote of nightMotes) {
        const pulse = 0.35 + (Math.sin(ambientTime * mote.speed * 2 + mote.phase) + 1) * 0.25;
        ctx.globalAlpha = pulse * night;
        ctx.fillStyle = "#e7e79e";
        ctx.beginPath();
        ctx.arc(
          mote.x + Math.sin(ambientTime * mote.speed + mote.phase) * 3,
          mote.y + Math.cos(ambientTime * mote.speed * 0.7 + mote.phase) * 2,
          mote.size,
          0,
          TAU
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, W * 0.62);
      vignette.addColorStop(0, "rgba(14, 27, 46, 0)");
      vignette.addColorStop(1, `rgba(11, 24, 42, ${0.25 * night})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function drawSunDrops() {
    for (const drop of state.sunDrops) {
      const lifeRatio = clamp(drop.life / drop.maxLife, 0, 1);
      const bob = Math.sin(ambientTime * 3.2 + drop.phase) * 3;
      const pulse = 0.5 + Math.sin(ambientTime * 4 + drop.phase) * 0.18;
      ctx.save();
      ctx.translate(drop.x, drop.y + bob);

      const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 27);
      glow.addColorStop(0, "rgba(255, 237, 133, 0.62)");
      glow.addColorStop(1, "rgba(255, 221, 91, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 245, 174, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 20 + (1 - lifeRatio) * 4, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#f4c74e";
      for (let petal = 0; petal < 7; petal += 1) {
        const angle = (petal / 7) * TAU + ambientTime * 0.3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angle) * 10, Math.sin(angle) * 10, 5, 2.8, angle, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#fff2a5";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#b78325";
      ctx.font = '700 7px "Microsoft YaHei"';
      ctx.textAlign = "center";
      ctx.fillText("✿", 0, 2.5);

      ctx.fillStyle = "rgba(36, 66, 42, 0.82)";
      ctx.beginPath();
      ctx.roundRect(-20, 25, 40, 14, 7);
      ctx.fill();
      ctx.fillStyle = "#fff4bd";
      ctx.font = '700 8px "Microsoft YaHei"';
      ctx.fillText("阳光", 0, 34.5);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const particle of state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters() {
    for (const floater of state.floaters) {
      const alpha = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${floater.size}px "Microsoft YaHei"`;
      ctx.textAlign = "center";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(32, 62, 36, 0.65)";
      ctx.strokeText(floater.text, floater.x, floater.y);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.restore();
    }
  }

  function drawBanner() {
    if (!state.banner) return;
    const banner = state.banner;
    const elapsed = 3.3 - banner.time;
    const appear = clamp(elapsed / 0.35, 0, 1);
    const disappear = clamp(banner.time / 0.45, 0, 1);
    const alpha = Math.min(appear, disappear);
    ctx.save();
    ctx.globalAlpha = alpha;
    const centerX = W / 2;
    const top = 54 - (1 - appear) * 14;
    ctx.fillStyle = "rgba(27, 64, 42, 0.92)";
    ctx.beginPath();
    ctx.roundRect(centerX - 184, top, 368, 66, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(247, 238, 194, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#e2e277";
    ctx.font = '700 9px "Microsoft YaHei"';
    ctx.textAlign = "center";
    ctx.letterSpacing = "2px";
    ctx.fillText("· 菜园战报 ·", centerX, top + 18);
    ctx.fillStyle = "#fff9de";
    ctx.font = '700 20px "Microsoft YaHei"';
    ctx.fillText(banner.title, centerX, top + 38);
    ctx.fillStyle = "rgba(255, 249, 222, 0.62)";
    ctx.font = '400 10px "Microsoft YaHei"';
    ctx.fillText(banner.subtitle, centerX, top + 54);
    ctx.restore();
  }

  function drawPauseOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(20, 48, 31, 0.48)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(249, 244, 222, 0.96)";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 125, H / 2 - 54, 250, 108, 14);
    ctx.fill();
    ctx.fillStyle = "#244a32";
    ctx.font = '700 25px "Microsoft YaHei"';
    ctx.textAlign = "center";
    ctx.fillText("Ⅱ", W / 2, H / 2 - 12);
    ctx.fillStyle = "#496452";
    ctx.font = '700 12px "Microsoft YaHei"';
    ctx.fillText("菜园时间已暂停", W / 2, H / 2 + 16);
    ctx.fillStyle = "#8b9689";
    ctx.font = '400 9px "Microsoft YaHei"';
    ctx.fillText("按空格或右下角按钮继续", W / 2, H / 2 + 35);
    ctx.restore();
  }

  function updateProgressOnly() {
    if (!state.waveActive) return;
    elements.waveCount.textContent = `${state.waveStats.resolved} / ${state.waveStats.total}`;
    elements.waveProgress.style.width = `${clamp(
      state.waveStats.resolved / Math.max(1, state.waveStats.total),
      0,
      1
    ) * 100}%`;
    elements.waveButtonSub.textContent = `还剩 ${state.waveStats.total - state.waveStats.resolved} 只`;
  }

  function frame(now) {
    const realDelta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    ambientTime += realDelta;

    if (state.status === "running") {
      update(realDelta * state.speed);
      if (Math.floor(now / 120) % 2 === 0) updateProgressOnly();
    }

    render();
    requestAnimationFrame(frame);
  }

  elements.towerCards.forEach((card) => {
    card.addEventListener("click", () => {
      initializeAudio();
      selectBuild(card.dataset.tower);
    });
  });

  elements.startGameButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", resetGame);
  elements.waveButton.addEventListener("click", startWave);
  elements.pauseButton.addEventListener("click", togglePause);
  elements.speedButton.addEventListener("click", toggleSpeed);
  elements.fullscreenButton.addEventListener("click", toggleFullscreen);
  elements.soundButton.addEventListener("click", toggleSound);
  elements.upgradeButton.addEventListener("click", upgradeSelectedTower);
  elements.sellButton.addEventListener("click", sellSelectedTower);

  elements.closeInspector.addEventListener("click", () => {
    clearSelectedTower();
  });

  elements.helpButton.addEventListener("click", () => {
    elements.helpModal.hidden = false;
  });

  elements.closeHelpButton.addEventListener("click", () => {
    elements.helpModal.hidden = true;
  });

  elements.helpModal.addEventListener("click", (event) => {
    if (event.target === elements.helpModal) elements.helpModal.hidden = true;
  });

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerleave", () => {
    state.hoverCell = null;
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    state.selectedBuild = null;
    clearSelectedTower();
    syncTowerCards();
  });

  window.addEventListener("keydown", (event) => {
    if (!elements.helpModal.hidden) {
      if (event.key === "Escape") elements.helpModal.hidden = true;
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (state.status === "intro") startGame();
      else togglePause();
      return;
    }
    if (event.key === "Escape") {
      state.selectedBuild = null;
      clearSelectedTower();
      syncTowerCards();
      return;
    }
    const towerKeys = ["carrot", "onion", "chili", "pumpkin"];
    const keyIndex = Number.parseInt(event.key, 10) - 1;
    if (state.status === "running" && keyIndex >= 0 && keyIndex < towerKeys.length) {
      selectBuild(towerKeys[keyIndex]);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.status === "running") {
      state.status = "paused";
      elements.pauseIcon.textContent = "▶";
    }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  updateHUD();
  requestAnimationFrame((now) => {
    lastFrame = now;
    frame(now);
  });
})();
