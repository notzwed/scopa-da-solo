(function () {
  "use strict";

  const logic = window.ScopaLogic;

  if (!logic) {
    return;
  }

  const BEST_SCOPE_STORAGE_KEY = "scopa-solo-best-scope";
  const COIN_TOTAL_STORAGE_KEY = "scopa-solo-coin-total";
  const COIN_REWARD_PER_CAPTURED_CARD = 1;
  const COIN_REWARD_SCOPA_BONUS = 6;
  const COIN_REWARD_CLEAN_TABLE_BONUS = 12;
  const COIN_REWARD_END_GAME_LOSS = 10;
  const COIN_REWARD_END_GAME_WIN = 15;
  const CLASSIC_RATIO = "680 / 980";
  const FACE_SPRITE_SHEET = {
    path: "playingCards.svg",
    width: 2092,
    height: 792,
    cardWidth: 136,
    cardHeight: 186,
    startX: 6,
    startY: 6,
    stepX: 150,
    stepY: 200
  };
  const BACK_SPRITE_SHEET = {
    path: "playingCards_back.svg",
    width: 750,
    height: 600,
    cardWidth: 140,
    cardHeight: 190,
    startX: 10,
    startY: 10,
    stepX: 150,
    stepY: 200,
    redModelColumn: 3,
    redModelRow: 0
  };
  const coarsePointerMedia =
    typeof window.matchMedia === "function" ? window.matchMedia("(pointer: coarse)") : null;
  const reducedMotionMedia =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const DISPLAY_RANK = {
    1: "A",
    8: "J",
    9: "Q",
    10: "K"
  };
  const SUIT_SPRITE_ROW = {
    spade: 0,
    bastoni: 1,
    denari: 2,
    coppe: 3
  };
  const SUIT_THEME = {
    bastoni: {
      css: "clubs",
      color: "#111111",
      accent: "#28426b",
      light: "#eef3ff"
    },
    coppe: {
      css: "hearts",
      color: "#c81e34",
      accent: "#a01727",
      light: "#fde8ed"
    },
    denari: {
      css: "diamonds",
      color: "#d64923",
      accent: "#bd6a12",
      light: "#fff0db"
    },
    spade: {
      css: "spades",
      color: "#111111",
      accent: "#3a495e",
      light: "#eef1f6"
    }
  };
  const FACE_PALETTES = {
    J: {
      robe: "#f2d34e",
      trim: "#d7263d",
      band: "#111111",
      hair: "#f1d389",
      line: "#111111",
      accent: "#2f65b8"
    },
    Q: {
      robe: "#d62839",
      trim: "#f2d34e",
      band: "#111111",
      hair: "#f0c865",
      line: "#111111",
      accent: "#2f65b8"
    },
    K: {
      robe: "#2f65b8",
      trim: "#f2d34e",
      band: "#d7263d",
      hair: "#f1d389",
      line: "#111111",
      accent: "#d62839"
    }
  };
  const PIP_LAYOUTS = {
    1: [{ x: 50, y: 50, size: 58 }],
    2: [
      { x: 50, y: 24, size: 52 },
      { x: 50, y: 76, size: 52, flip: true }
    ],
    3: [
      { x: 50, y: 22, size: 50 },
      { x: 50, y: 50, size: 54 },
      { x: 50, y: 78, size: 50, flip: true }
    ],
    4: [
      { x: 31, y: 24, size: 46 },
      { x: 69, y: 24, size: 46 },
      { x: 31, y: 76, size: 46, flip: true },
      { x: 69, y: 76, size: 46, flip: true }
    ],
    5: [
      { x: 31, y: 24, size: 44 },
      { x: 69, y: 24, size: 44 },
      { x: 50, y: 50, size: 52 },
      { x: 31, y: 76, size: 44, flip: true },
      { x: 69, y: 76, size: 44, flip: true }
    ],
    6: [
      { x: 31, y: 22, size: 42 },
      { x: 69, y: 22, size: 42 },
      { x: 31, y: 50, size: 42 },
      { x: 69, y: 50, size: 42 },
      { x: 31, y: 78, size: 42, flip: true },
      { x: 69, y: 78, size: 42, flip: true }
    ],
    7: [
      { x: 50, y: 15, size: 38 },
      { x: 31, y: 30, size: 40 },
      { x: 69, y: 30, size: 40 },
      { x: 31, y: 50, size: 40 },
      { x: 69, y: 50, size: 40 },
      { x: 31, y: 72, size: 40, flip: true },
      { x: 69, y: 72, size: 40, flip: true }
    ]
  };

  const initialGame = logic.createInitialState();

  const state = {
    game: initialGame,
    bestScope: loadBestScope(),
    coins: loadCoinTotal(),
    hasStarted: false,
    animating: false,
    dealAnimationQueued: false,
    coinEffectTimer: 0,
    drag: null,
    displayCounts: {
      deck: initialGame.deck.length,
      captured: initialGame.captured.length
    },
    dealIds: {
      hand: [],
      table: []
    }
  };

  const refs = {
    hudBank: document.getElementById("hud-bank"),
    coinCount: document.getElementById("coin-count"),
    coinGain: document.getElementById("coin-gain"),
    handZone: document.getElementById("hand-zone"),
    tableZone: document.getElementById("table-zone"),
    moveTargets: document.getElementById("move-targets"),
    feltBoard: document.getElementById("felt-board"),
    deckStack: document.getElementById("deck-stack"),
    scopeTracker: document.getElementById("scope-tracker"),
    capturePile: document.getElementById("capture-pile"),
    startScreen: document.getElementById("start-screen"),
    startGameButton: document.getElementById("start-game-btn"),
    newGameButton: document.getElementById("new-game-btn"),
    resetBestButton: document.getElementById("reset-best-btn"),
    playAgainButton: document.getElementById("play-again-btn"),
    startBestScope: document.getElementById("start-best-scope"),
    tableCount: document.getElementById("table-count"),
    handCount: document.getElementById("hand-count"),
    turnCount: document.getElementById("turn-count"),
    tableLeftCount: document.getElementById("table-left-count"),
    deckLeftCount: document.getElementById("deck-left-count"),
    gameOverBanner: document.getElementById("game-over-banner"),
    gameOverKicker: document.getElementById("game-over-kicker"),
    gameOverTitle: document.getElementById("game-over-title"),
    gameOverDetail: document.getElementById("game-over-detail")
  };

  document.documentElement.style.setProperty("--card-ratio", CLASSIC_RATIO);
  updateViewportHeight();

  function updateViewportHeight() {
    document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
  }

  function prefersTouchLayout() {
    return (coarsePointerMedia && coarsePointerMedia.matches) || window.innerWidth <= 1024;
  }

  function animationTimingMultiplier() {
    return prefersTouchLayout() ? 1.08 : 0.86;
  }

  function loadBestScope() {
    try {
      const raw = window.localStorage.getItem(BEST_SCOPE_STORAGE_KEY);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBestScope(value) {
    try {
      window.localStorage.setItem(BEST_SCOPE_STORAGE_KEY, String(value));
    } catch (error) {
      return;
    }
  }

  function loadCoinTotal() {
    try {
      const raw = window.localStorage.getItem(COIN_TOTAL_STORAGE_KEY);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveCoinTotal(value) {
    try {
      window.localStorage.setItem(COIN_TOTAL_STORAGE_KEY, String(value));
    } catch (error) {
      return;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function suitTheme(card) {
    return SUIT_THEME[card.suit];
  }

  function displayRank(card) {
    return DISPLAY_RANK[card.value] || String(card.value);
  }

  function formatCardName(card) {
    return card.rankLabel + " di " + card.suitLabel;
  }

  function formatScopeCount(count) {
    return count + " " + (count === 1 ? "scopa" : "scope");
  }

  function formatCoinCount(count) {
    return count.toLocaleString("it-IT");
  }

  function calculateTablePenalty(tableCount) {
    return Math.floor(tableCount * 0.5);
  }

  function getVictoryOutcome(game) {
    const tablePenalty = calculateTablePenalty(game.table.length);
    const finalScore = game.scopeCount - tablePenalty;
    const hasWon = finalScore > 0 && Math.abs(finalScore) % 2 === 1;

    return {
      tablePenalty: tablePenalty,
      finalScore: finalScore,
      hasWon: hasWon,
      parityLabel: Math.abs(finalScore) % 2 === 1 ? "dispari" : "pari"
    };
  }

  function getEndGameCoinBonus(game) {
    if (!game || !game.gameOver) {
      return 0;
    }

    return getVictoryOutcome(game).hasWon ? COIN_REWARD_END_GAME_WIN : COIN_REWARD_END_GAME_LOSS;
  }

  function totalCardCount(game) {
    return game.deck.length + game.hand.length + game.table.length + game.captured.length;
  }

  function faceSpriteColumn(value) {
    if (value >= 1 && value <= 7) {
      return value - 1;
    }

    if (value === 8) {
      return 10;
    }

    if (value === 9) {
      return 11;
    }

    return 12;
  }

  function spriteViewBox(sheet, column, row) {
    const x = sheet.startX + column * sheet.stepX;
    const y = sheet.startY + row * sheet.stepY;

    return x + " " + y + " " + sheet.cardWidth + " " + sheet.cardHeight;
  }

  function buildSpriteMarkup(path, sheet, column, row) {
    return (
      '<svg class="card-sprite" viewBox="' +
      spriteViewBox(sheet, column, row) +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<image href="' +
      path +
      '" width="' +
      sheet.width +
      '" height="' +
      sheet.height +
      '" preserveAspectRatio="xMinYMin meet"></image>' +
      "</svg>"
    );
  }

  function buildFaceSpriteMarkup(card) {
    return buildSpriteMarkup(
      FACE_SPRITE_SHEET.path,
      FACE_SPRITE_SHEET,
      faceSpriteColumn(card.value),
      SUIT_SPRITE_ROW[card.suit]
    );
  }

  function buildBackSpriteMarkup() {
    return buildSpriteMarkup(
      BACK_SPRITE_SHEET.path,
      BACK_SPRITE_SHEET,
      BACK_SPRITE_SHEET.redModelColumn,
      BACK_SPRITE_SHEET.redModelRow
    );
  }

  function handTilt(index, total) {
    if (window.innerWidth < 780 || total <= 1) {
      return "0deg";
    }

    const spread = Math.min(2.4, total * 0.72);
    const offset = index - (total - 1) / 2;
    return offset * spread + "deg";
  }

  function tableTilt(index) {
    const tilts = ["-0.14deg", "0.18deg", "-0.09deg", "0.12deg", "-0.12deg", "0.08deg"];
    return tilts[index % tilts.length];
  }

  function stackCardStyle(index, total, kind) {
    if (total <= 1) {
      return "--stack-x:0px;--stack-y:0px;--stack-rot:0deg;z-index:1;";
    }

    const progress = index / (total - 1);
    const spreadX = Math.min(9, (total - 1) * 0.24) * (kind === "deck" ? -1 : 1);
    const spreadY = Math.min(14, (total - 1) * 0.38);
    const rotation = (progress - 0.5) * (kind === "deck" ? -1.8 : 1.8);

    return (
      "--stack-x:" +
      (spreadX * progress).toFixed(2) +
      "px;--stack-y:" +
      (-spreadY * progress).toFixed(2) +
      "px;--stack-rot:" +
      rotation.toFixed(2) +
      "deg;z-index:" +
      (index + 1) +
      ";"
    );
  }

  function buildBackMarkup(index, total, kind) {
    return (
      '<span class="card-back stack-card" aria-hidden="true" style="' +
      stackCardStyle(index, total, kind) +
      '">' +
      buildBackSpriteMarkup() +
      "</span>"
    );
  }

  function renderBackStack(element, count, kind) {
    const safeCount = Math.max(0, count);
    element.classList.toggle("is-empty", safeCount === 0);
    element.innerHTML = Array.from({ length: safeCount })
      .map(function (_, index) {
        return buildBackMarkup(index, safeCount, kind);
      })
      .join("");
  }

  function scopeMarkerStyle(index, total) {
    const centerOffset = index - (total - 1) / 2;
    const offsetX = centerOffset * (total <= 4 ? 12 : 10);
    const offsetY = Math.min(index * 5, 18);
    const rotation = centerOffset * 2.4;

    return (
      "left:calc(50% + " +
      offsetX.toFixed(2) +
      "px);top:" +
      offsetY.toFixed(2) +
      "px;transform:translate(-50%, 0) rotate(" +
      (90 + rotation).toFixed(2) +
      "deg);z-index:" +
      (index + 1) +
      ";"
    );
  }

  function renderScopeTracker(count) {
    if (!refs.scopeTracker) {
      return;
    }

    const safeCount = Math.max(0, count || 0);
    const previousCount = Number(refs.scopeTracker.dataset.count || 0);
    refs.scopeTracker.dataset.count = String(safeCount);
    refs.scopeTracker.setAttribute(
      "aria-label",
      safeCount === 1 ? "1 scopa fatta" : safeCount + " scope fatte"
    );

    if (safeCount === previousCount && safeCount !== 0) {
      return;
    }

    refs.scopeTracker.innerHTML = Array.from({ length: safeCount })
      .map(function (_, index) {
        const isFresh = safeCount > previousCount && index >= previousCount;

        return (
          '<span class="scope-marker' +
          (isFresh ? " is-fresh" : "") +
          '" aria-hidden="true" style="' +
          scopeMarkerStyle(index, safeCount) +
          '"><span class="scope-marker-shell">' +
          buildBackSpriteMarkup() +
          "</span></span>"
        );
      })
      .join("");
  }

  function buildSuitDefs() {
    return (
      '<symbol id="pip-hearts" viewBox="0 0 100 100">' +
      '<path d="M50 88C22 64 10 49 10 30C10 16 20 8 33 8C42 8 48 13 50 20C52 13 58 8 67 8C80 8 90 16 90 30C90 49 78 64 50 88Z" />' +
      "</symbol>" +
      '<symbol id="pip-diamonds" viewBox="0 0 100 100">' +
      '<path d="M50 4L88 50L50 96L12 50Z" />' +
      "</symbol>" +
      '<symbol id="pip-clubs" viewBox="0 0 100 100">' +
      '<circle cx="50" cy="28" r="18" />' +
      '<circle cx="31" cy="52" r="18" />' +
      '<circle cx="69" cy="52" r="18" />' +
      '<path d="M44 56H56V86H64V96H36V86H44Z" />' +
      "</symbol>" +
      '<symbol id="pip-spades" viewBox="0 0 100 100">' +
      '<path d="M50 6C58 17 90 33 90 60C90 76 79 88 65 88C57 88 52 84 50 78C48 84 43 88 35 88C21 88 10 76 10 60C10 33 42 17 50 6Z" />' +
      '<path d="M44 72H56V88H65V96H35V88H44Z" />' +
      "</symbol>"
    );
  }

  function suitUse(theme, x, y, size, rotation) {
    const left = x - size / 2;
    const top = y - size / 2;
    const transform = rotation ? ' transform="rotate(' + rotation + " " + x + " " + y + ')"' : "";
    return (
      '<use href="#pip-' +
      theme.css +
      '" x="' +
      left +
      '" y="' +
      top +
      '" width="' +
      size +
      '" height="' +
      size +
      '" fill="' +
      theme.color +
      '"' +
      transform +
      " />"
    );
  }

  function buildSvgCorner(rank, theme, x, y, rotation) {
    return (
      '<g transform="translate(' +
      x +
      " " +
      y +
      ") rotate(" +
      rotation +
      ')">' +
      '<text x="0" y="0" text-anchor="middle" font-size="31" font-weight="700" font-family="Arial, Trebuchet MS, Segoe UI, sans-serif" fill="' +
      theme.color +
      '">' +
      rank +
      "</text>" +
      suitUse(theme, 0, 26, 22, 0) +
      "</g>"
    );
  }

  function buildSvgPips(value, theme) {
    const layout = PIP_LAYOUTS[value] || [];
    return layout
      .map(function (pip) {
        return (
          '<g transform="translate(' +
          (240 * pip.x) / 100 +
          " " +
          (336 * pip.y) / 100 +
          ") " +
          (pip.flip ? "rotate(180)" : "") +
          '">' +
          '<use href="#pip-' +
          theme.css +
          '" x="' +
          (-pip.size / 2) +
          '" y="' +
          (-pip.size / 2) +
          '" width="' +
          pip.size +
          '" height="' +
          pip.size +
          '" fill="' +
          theme.color +
          '" />' +
          "</g>"
        );
      })
      .join("");
  }

  function buildFacePortrait(theme, palette, rank, offsetY, upsideDown) {
    const transform =
      "translate(120 " +
      offsetY +
      ")" +
      (upsideDown ? " rotate(180)" : "");

    return (
      '<g transform="' +
      transform +
      '">' +
      '<rect x="-56" y="-70" width="112" height="140" rx="18" fill="#fffdfa" opacity="0.95" />' +
      '<path d="M-56 26L-26 2L0 20L26 2L56 26L56 70L-56 70Z" fill="' +
      palette.robe +
      '" stroke="' +
      palette.line +
      '" stroke-width="2.4" />' +
      '<path d="M-20 10L0 30L20 10L10 -4L0 0L-10 -4Z" fill="' +
      palette.trim +
      '" stroke="' +
      palette.line +
      '" stroke-width="1.8" />' +
      '<path d="M-52 16L-30 2L-16 20L-44 38Z" fill="' +
      palette.band +
      '" opacity="0.94" />' +
      '<path d="M52 16L30 2L16 20L44 38Z" fill="' +
      palette.band +
      '" opacity="0.94" />' +
      '<circle cx="0" cy="-18" r="24" fill="#f3d6b5" stroke="' +
      palette.line +
      '" stroke-width="2.2" />' +
      '<path d="M-28 -24Q-18 -60 0 -66Q18 -60 28 -24L20 -2Q0 -12 -20 -2Z" fill="' +
      palette.hair +
      '" />' +
      '<path d="M-32 -56L0 -82L32 -56L22 -38L0 -48L-22 -38Z" fill="' +
      palette.trim +
      '" stroke="' +
      palette.line +
      '" stroke-width="2.2" />' +
      '<rect x="-46" y="-50" width="92" height="8" rx="4" fill="' +
      palette.accent +
      '" opacity="0.92" />' +
      '<path d="M-34 -2Q0 18 34 -2L34 14Q0 30 -34 14Z" fill="#ffffff" stroke="' +
      palette.line +
      '" stroke-width="1.6" />' +
      '<circle cx="0" cy="30" r="15" fill="#ffffff" stroke="' +
      palette.line +
      '" stroke-width="1.8" />' +
      suitUse(theme, 0, 30, 18, 0) +
      '<path d="M-18 48L0 40L18 48L14 66L0 60L-14 66Z" fill="' +
      palette.trim +
      '" stroke="' +
      palette.line +
      '" stroke-width="1.8" />' +
      '<text x="0" y="0" text-anchor="middle" font-size="16" font-weight="700" font-family="Arial, Trebuchet MS, Segoe UI, sans-serif" fill="' +
      palette.line +
      '" opacity="0.78">' +
      rank +
      "</text>" +
      "</g>"
    );
  }

  function buildFacePattern(card, rank) {
    const theme = suitTheme(card);
    const palette = FACE_PALETTES[rank];

    return (
      '<rect x="58" y="50" width="124" height="236" rx="18" fill="#fffefa" stroke="#111111" stroke-width="2.3" />' +
      '<rect x="66" y="58" width="108" height="220" rx="14" fill="' +
      theme.light +
      '" stroke="#111111" stroke-opacity="0.12" stroke-width="1.4" />' +
      '<path d="M120 60L166 108L120 158L74 108Z" fill="' +
      palette.accent +
      '" opacity="0.15" />' +
      '<path d="M120 176L166 226L120 276L74 226Z" fill="' +
      palette.accent +
      '" opacity="0.15" />' +
      buildFacePortrait(theme, palette, rank, 114, false) +
      buildFacePortrait(theme, palette, rank, 222, true) +
      '<circle cx="120" cy="168" r="22" fill="#ffffff" stroke="' +
      palette.line +
      '" stroke-width="2" />' +
      suitUse(theme, 120, 168, 28, 0) +
      '<rect x="72" y="153" width="96" height="30" rx="15" fill="#ffffff" fill-opacity="0.9" stroke="#111111" stroke-opacity="0.15" stroke-width="1.2" />' +
      '<text x="120" y="173" text-anchor="middle" font-size="18" font-weight="700" font-family="Arial, Trebuchet MS, Segoe UI, sans-serif" fill="' +
      palette.line +
      '">' +
      rank +
      "</text>"
    );
  }

  function buildCardSvg(card) {
    const rank = displayRank(card);
    const theme = suitTheme(card);
    const centerMarkup =
      card.value <= 7
        ? buildSvgPips(card.value, theme)
        : buildFacePattern(card, rank);

    return (
      '<svg viewBox="0 0 240 336" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      escapeHtml(formatCardName(card)) +
      '">' +
      "<defs>" +
      buildSuitDefs() +
      '<linearGradient id="paper" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff" />' +
      '<stop offset="62%" stop-color="#fdfcf9" />' +
      '<stop offset="100%" stop-color="#f2efe8" />' +
      "</linearGradient>" +
      '<linearGradient id="sheen" x1="0" x2="1" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.78" />' +
      '<stop offset="50%" stop-color="#ffffff" stop-opacity="0" />' +
      '<stop offset="100%" stop-color="#ffffff" stop-opacity="0.14" />' +
      "</linearGradient>" +
      "</defs>" +
      '<rect x="2" y="2" width="236" height="332" rx="19" fill="url(#paper)" stroke="#cbcbc9" stroke-width="3" />' +
      '<rect x="8" y="8" width="224" height="320" rx="15" fill="none" stroke="#ffffff" stroke-opacity="0.88" stroke-width="2" />' +
      '<rect x="14" y="14" width="212" height="308" rx="13" fill="none" stroke="#111111" stroke-opacity="0.10" stroke-width="1.4" />' +
      '<path d="M20 18H220V96Q160 80 20 128Z" fill="url(#sheen)" opacity="0.34" />' +
      buildSvgCorner(rank, theme, 30, 38, 0) +
      buildSvgCorner(rank, theme, 210, 298, 180) +
      centerMarkup +
      "</svg>"
    );
  }

  function buildCardMarkup(card, options) {
    const classes = ["play-card", options.zone === "hand" ? "hand-card" : "table-card"];

    if (options.highlighted) {
      classes.push("is-highlighted");
    }

    if (options.armed) {
      classes.push("is-armed");
    }

    if (options.hiddenOrigin) {
      classes.push("is-hidden-origin");
    }

    if (options.pendingDeal) {
      classes.push("is-pending-deal");
    }

    if (options.faceDown) {
      classes.push("is-face-down");
    }

    return (
      '<div class="' +
      classes.join(" ") +
      '" data-' +
      options.zone +
      '-id="' +
      card.id +
      '" style="--card-tilt:' +
      options.tilt +
      ';" aria-label="' +
      escapeHtml(formatCardName(card)) +
      '">' +
      '<span class="card-shell">' +
      '<span class="card-face">' +
      buildFaceSpriteMarkup(card) +
      "</span>" +
      '<span class="card-back-face" aria-hidden="true">' +
      buildBackSpriteMarkup() +
      "</span>" +
      "</div>"
    );
  }

  function renderHud() {
    refs.tableCount.textContent = state.displayCounts.captured;
    refs.handCount.textContent = state.game.hand.length;
    refs.turnCount.textContent = state.game.turnCount;
    refs.tableLeftCount.textContent = state.game.table.length;
    refs.deckLeftCount.textContent = state.displayCounts.deck;
    refs.startBestScope.textContent = formatScopeCount(state.bestScope);
    refs.coinCount.textContent = formatCoinCount(state.coins);
  }

  function renderDeckStack() {
    refs.deckLeftCount.textContent = state.displayCounts.deck;
    refs.tableCount.textContent = state.displayCounts.captured;
    renderBackStack(refs.deckStack, state.displayCounts.deck, "deck");
    renderScopeTracker(state.game.scopeCount);
    renderBackStack(refs.capturePile, state.displayCounts.captured, "capture");
  }

  function captureCardRects(zoneElement, attributeName) {
    return Array.from(zoneElement.querySelectorAll("[" + attributeName + "]")).reduce(function (
      map,
      element
    ) {
      map.set(element.getAttribute(attributeName), element.getBoundingClientRect());
      return map;
    }, new Map());
  }

  function pulseStack(element) {
    return animateNode(
      element,
      [
        { transform: "translate3d(0, 0, 0) scale(1)" },
        { transform: "translate3d(0, -1px, 0) scale(1.025)" },
        { transform: "translate3d(0, 0, 0) scale(1)" }
      ],
      {
        duration: 200,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both"
      }
    );
  }

  function setCardFaceDown(element, faceDown) {
    element.classList.toggle("is-face-down", faceDown);
  }

  function animateCardFlip(element, faceDown, delay) {
    const shell = element.querySelector(".card-shell");

    if (!shell) {
      setCardFaceDown(element, faceDown);
      return Promise.resolve();
    }

    const fromRotation = faceDown ? 0 : 180;
    const toRotation = faceDown ? 180 : 0;
    setCardFaceDown(element, faceDown);

    return animateNode(
      shell,
      [
        { transform: "rotateY(" + fromRotation + "deg)" },
        { transform: "rotateY(" + toRotation + "deg)" }
      ],
      {
        duration: 280,
        delay: delay || 0,
        easing: "cubic-bezier(0.2, 0.85, 0.32, 1)",
        fill: "both"
      }
    ).then(function () {
      shell.style.transform = faceDown ? "rotateY(180deg)" : "rotateY(0deg)";
    });
  }

  function animateCardLayouts(previousRects, zoneElement, attributeName) {
    if (state.drag) {
      return;
    }

    zoneElement.querySelectorAll("[" + attributeName + "]").forEach(function (element, index) {
      const cardId = element.getAttribute(attributeName);
      const previousRect = previousRects.get(cardId);

      if (!previousRect || element.classList.contains("is-pending-deal")) {
        return;
      }

      const nextRect = element.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }

      const tilt =
        window.getComputedStyle(element).getPropertyValue("--card-tilt").trim() || "0deg";
      const travel = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const settleLift = clamp(3 + travel * 0.018, 3, 8);
      const recoilX = deltaX * 0.08;
      const recoilY = deltaY * 0.08 - settleLift;

      animateNode(
        element,
        [
          {
            transform:
              "translate3d(" +
              deltaX.toFixed(2) +
              "px, " +
              deltaY.toFixed(2) +
              "px, 0) rotate(" +
              tilt +
              ") scale(0.985)"
          },
          {
            transform:
              "translate3d(" +
              recoilX.toFixed(2) +
              "px, " +
              recoilY.toFixed(2) +
              "px, 0) rotate(" +
              tilt +
              ") scale(1.012)",
            offset: 0.72
          },
          {
            transform: "translate3d(0px, 0px, 0) rotate(" + tilt + ") scale(1)"
          }
        ],
        {
          duration: 205 + Math.min(index, 4) * 20,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both"
        }
      );
    });
  }

  function highlightedTableIds() {
    if (!state.drag || !state.drag.activeTarget) {
      return [];
    }

    return state.drag.activeTarget.selectedIds.slice();
  }

  function renderTable() {
    const highlighted = highlightedTableIds();
    const discardOnly =
      state.drag &&
      state.drag.targets.length === 1 &&
      state.drag.targets[0].selectedIds.length === 0;
    const pendingTableIds = new Set(state.dealIds.table);

    refs.tableZone.classList.toggle("is-discard-zone", Boolean(discardOnly));
    refs.tableZone.innerHTML =
      state.game.table.length === 0
        ? ""
        : state.game.table
            .map(function (card, index) {
              return buildCardMarkup(card, {
                zone: "table",
                tilt: tableTilt(index),
                highlighted: highlighted.includes(card.id),
                armed: false,
                hiddenOrigin: false,
                pendingDeal: pendingTableIds.has(card.id)
              });
            })
            .join("");
  }

  function renderHand() {
    const armedId = state.drag ? state.drag.handCardId : null;
    const pendingHandIds = new Set(state.dealIds.hand);

    refs.handZone.innerHTML = state.game.hand
      .map(function (card, index) {
        return buildCardMarkup(card, {
          zone: "hand",
          tilt: handTilt(index, state.game.hand.length),
          highlighted: false,
          armed: armedId === card.id,
          hiddenOrigin: armedId === card.id,
          pendingDeal: pendingHandIds.has(card.id)
        });
      })
      .join("");
  }

  function renderMoveTargets() {
    refs.moveTargets.innerHTML = "";
  }

  function renderStartScreen() {
    refs.startScreen.classList.toggle("visible", !state.hasStarted);
  }

  function renderGameOver() {
    const visible = state.game.gameOver;
    refs.gameOverBanner.classList.toggle("hidden", !visible);

    if (!visible) {
      return;
    }

    const outcome = getVictoryOutcome(state.game);
    const endGameBonus = getEndGameCoinBonus(state.game);
    refs.gameOverKicker.classList.add("hidden");
    refs.gameOverTitle.textContent = outcome.hasWon ? "Vittoria" : "Sconfitta";
    refs.gameOverDetail.innerHTML =
      '<strong class="game-over-coins-label">Monete</strong> <span class="game-over-coins-value">' +
      escapeHtml(formatCoinCount(state.coins)) +
      '</span> <span class="game-over-coins-bonus">+' +
      escapeHtml(formatCoinCount(endGameBonus)) +
      " bonus finale</span>";
  }

  function render() {
    const previousTableRects = captureCardRects(refs.tableZone, "data-table-id");
    const previousHandRects = captureCardRects(refs.handZone, "data-hand-id");

    renderHud();
    renderDeckStack();
    renderTable();
    renderHand();
    animateCardLayouts(previousTableRects, refs.tableZone, "data-table-id");
    animateCardLayouts(previousHandRects, refs.handZone, "data-hand-id");
    renderMoveTargets();
    renderStartScreen();
    renderGameOver();
    scheduleDealAnimations();
  }

  function hasPendingDeals() {
    return state.dealIds.hand.length > 0 || state.dealIds.table.length > 0;
  }

  function scheduleDealAnimations() {
    if (!hasPendingDeals() || state.dealAnimationQueued) {
      return;
    }

    state.dealAnimationQueued = true;
    window.requestAnimationFrame(function () {
      playDealAnimations();
    });
  }

  function collectDealEntries() {
    const entries = [];
    const pendingTableIds = new Set(state.dealIds.table);
    const pendingHandIds = new Set(state.dealIds.hand);

    state.game.table.forEach(function (card) {
      if (!pendingTableIds.has(card.id)) {
        return;
      }

      const element = refs.tableZone.querySelector('[data-table-id="' + card.id + '"]');
      if (element) {
        entries.push({ element, zone: "table" });
      }
    });

    state.game.hand.forEach(function (card) {
      if (!pendingHandIds.has(card.id)) {
        return;
      }

      const element = refs.handZone.querySelector('[data-hand-id="' + card.id + '"]');
      if (element) {
        entries.push({ element, zone: "hand" });
      }
    });

    return entries;
  }

  function deckOriginRect() {
    const topCard = refs.deckStack.querySelector(".card-back:last-child");
    return (topCard || refs.deckStack).getBoundingClientRect();
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function buildFlightKeyframes(options) {
    const dx = options.toLeft - options.fromLeft;
    const dy = options.toTop - options.fromTop;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const fromRotation = options.fromRotation || 0;
    const toRotation = options.toRotation || 0;
    const lift = options.lift != null ? options.lift : clamp(distance * 0.16, 18, 52);
    const curveX = options.curveX != null ? options.curveX : clamp(dx * 0.08, -18, 18);
    const midLeft =
      options.midLeft != null ? options.midLeft : options.fromLeft + dx * 0.58 + curveX;
    const midTop =
      options.midTop != null ? options.midTop : Math.min(options.fromTop, options.toTop) - lift;
    const midRotation =
      options.midRotation != null
        ? options.midRotation
        : clamp(fromRotation + dx * 0.02, -12, 12);
    const startScale = options.startScale != null ? options.startScale : 1;
    const midScale = options.midScale != null ? options.midScale : Math.min(1.04, startScale + 0.04);
    const endScale = options.endScale != null ? options.endScale : 1;
    const overshootScale =
      options.overshootScale != null ? options.overshootScale : Math.max(endScale, endScale * 1.01);
    const overshootY =
      options.overshootY != null ? options.overshootY : clamp(distance * 0.015, 3, 8);
    const nearEndLeft = options.nearEndLeft != null ? options.nearEndLeft : options.toLeft;
    const nearEndTop =
      options.nearEndTop != null ? options.nearEndTop : options.toTop - overshootY;
    const startOpacity = options.startOpacity != null ? options.startOpacity : 1;
    const midOpacity = options.midOpacity != null ? options.midOpacity : 1;
    const endOpacity = options.endOpacity != null ? options.endOpacity : 1;

    return [
      {
        left: options.fromLeft + "px",
        top: options.fromTop + "px",
        transform: "translate3d(0, 0, 0) rotate(" + fromRotation + "deg) scale(" + startScale + ")",
        opacity: startOpacity
      },
      {
        left: midLeft + "px",
        top: midTop + "px",
        transform: "translate3d(0, 0, 0) rotate(" + midRotation + "deg) scale(" + midScale + ")",
        opacity: midOpacity,
        offset: options.midOffset != null ? options.midOffset : 0.62
      },
      {
        left: nearEndLeft + "px",
        top: nearEndTop + "px",
        transform:
          "translate3d(0, 0, 0) rotate(" +
          (options.nearEndRotation != null ? options.nearEndRotation : toRotation * 0.4) +
          "deg) scale(" +
          overshootScale +
          ")",
        opacity: endOpacity,
        offset: options.nearEndOffset != null ? options.nearEndOffset : 0.9
      },
      {
        left: options.toLeft + "px",
        top: options.toTop + "px",
        transform: "translate3d(0, 0, 0) rotate(" + toRotation + "deg) scale(" + endScale + ")",
        opacity: endOpacity
      }
    ];
  }

  function animateFlight(node, options, animationOptions) {
    return animateNode(node, buildFlightKeyframes(options), animationOptions);
  }

  async function playDealAnimations() {
    const entries = collectDealEntries();

    if (entries.length === 0) {
      state.displayCounts.deck = state.game.deck.length;
      state.displayCounts.captured = state.game.captured.length;
      renderDeckStack();
      state.dealIds = { hand: [], table: [] };
      state.dealAnimationQueued = false;
      state.animating = false;
      return;
    }

    const originRect = deckOriginRect();
    const landedHandElements = [];

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const rect = entry.element.getBoundingClientRect();
      const clone = entry.element.cloneNode(true);
      const tilt =
        parseFloat(window.getComputedStyle(entry.element).getPropertyValue("--card-tilt")) || 0;
      const startLeft = originRect.left + originRect.width * 0.5 - rect.width * 0.5 + index * 1.5;
      const startTop = originRect.top + originRect.height * 0.18 - rect.height * 0.5 - index * 0.8;
      const curveX = (entry.zone === "table" ? -1 : 1) * (10 + Math.min(index, 2) * 2);
      const distance = Math.sqrt(
        (rect.left - startLeft) * (rect.left - startLeft) +
          (rect.top - startTop) * (rect.top - startTop)
      );

      clone.classList.remove("is-pending-deal");
      clone.classList.add("deal-shot");
      clone.classList.add("is-face-down");
      clone.style.left = startLeft + "px";
      clone.style.top = startTop + "px";
      clone.style.width = rect.width + "px";
      clone.style.height = rect.height + "px";
      clone.style.margin = "0";
      clone.style.transform = "scale(0.76) rotate(-8deg)";
      clone.style.opacity = "0";
      document.body.appendChild(clone);

      await animateFlight(
        clone,
        {
          fromLeft: startLeft,
          fromTop: startTop,
          toLeft: rect.left,
          toTop: rect.top,
          fromRotation: -5,
          midRotation: entry.zone === "table" ? -2.4 : 2.4,
          toRotation: tilt,
          startScale: 0.84,
          midScale: 0.94,
          endScale: 1,
          startOpacity: 0,
          midOpacity: 1,
          curveX: curveX,
          lift: clamp(distance * 0.14, 18, 40),
          nearEndTop: rect.top - 4,
          overshootScale: 1.015,
          midOffset: 0.6,
          nearEndOffset: 0.88
        },
        {
          duration: entry.zone === "table" ? 235 : 255,
          easing: "cubic-bezier(0.2, 0.85, 0.32, 1)",
          fill: "forwards"
        }
      );

      entry.element.classList.remove("is-pending-deal");
      setCardFaceDown(entry.element, true);

      if (entry.zone === "table") {
        animateCardFlip(entry.element, false, 12);
      } else {
        landedHandElements.push(entry.element);
      }

      state.displayCounts.deck = Math.max(state.game.deck.length, state.displayCounts.deck - 1);
      renderDeckStack();
      pulseStack(refs.deckStack);
      clone.remove();
      await wait(24);
    }

    if (landedHandElements.length > 0) {
      await Promise.all(
        landedHandElements.map(function (element, index) {
          return animateCardFlip(element, false, index * 72);
        })
      );
    }

    await wait(28);
    state.displayCounts.deck = state.game.deck.length;
    state.dealIds = { hand: [], table: [] };
    state.dealAnimationQueued = false;
    state.animating = false;
    renderDeckStack();
  }

  function computeDealIds(previousGame, nextGame) {
    const prevHandIds = new Set(
      previousGame.hand.map(function (card) {
        return card.id;
      })
    );
    const prevTableIds = new Set(
      previousGame.table.map(function (card) {
        return card.id;
      })
    );

    return {
      hand: nextGame.hand
        .filter(function (card) {
          return !prevHandIds.has(card.id);
        })
        .map(function (card) {
          return card.id;
        }),
      table: nextGame.table
        .filter(function (card) {
          return !prevTableIds.has(card.id) && !prevHandIds.has(card.id);
        })
        .map(function (card) {
          return card.id;
        })
    };
  }

  function targetCentroid(selectedIds) {
    if (!selectedIds || selectedIds.length === 0) {
      const tableRect = refs.tableZone.getBoundingClientRect();
      return {
        x: tableRect.left + tableRect.width * 0.5,
        y: tableRect.top + tableRect.height * 0.48
      };
    }

    const rects = selectedIds
      .map(function (id) {
        return refs.tableZone.querySelector('[data-table-id="' + id + '"]');
      })
      .filter(Boolean)
      .map(function (element) {
        return element.getBoundingClientRect();
      });

    if (rects.length === 0) {
      return targetCentroid([]);
    }

    const center = rects.reduce(
      function (accumulator, rect) {
        accumulator.x += rect.left + rect.width / 2;
        accumulator.y += rect.top + rect.height / 2;
        return accumulator;
      },
      { x: 0, y: 0 }
    );

    return {
      x: center.x / rects.length,
      y: center.y / rects.length
    };
  }

  function createTargetsForCard(handCardId) {
    const handCard = state.game.hand.find(function (card) {
      return card.id === handCardId;
    });

    if (!handCard) {
      return [];
    }

    const moves = logic.getValidMovesForCard(handCard, state.game.table);
    if (moves.length === 0) {
      const centroid = targetCentroid([]);
      return [
        {
          id: "discard",
          selectedIds: [],
          clientX: centroid.x,
          clientY: centroid.y
        }
      ];
    }

    return moves.map(function (move, index) {
      const centroid = targetCentroid(move.selectedIds);
      return {
        id: "move-" + index,
        selectedIds: move.selectedIds.slice(),
        handCardId: move.handCardId,
        clientX: centroid.x,
        clientY: centroid.y
      };
    });
  }

  function pickTarget(targets, clientX, clientY) {
    let best = null;
    let bestDistance = Infinity;
    const activationRadius = window.innerWidth < 760 ? 136 : 168;

    targets.forEach(function (target) {
      const dx = clientX - target.clientX;
      const dy = clientY - target.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < activationRadius && distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    });

    return best;
  }

  function createGhostFromElement(element) {
    const rect = element.getBoundingClientRect();
    const ghost = element.cloneNode(true);
    const tilt = parseFloat(window.getComputedStyle(element).getPropertyValue("--card-tilt")) || 0;
    ghost.classList.add("drag-ghost");
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.margin = "0";
    ghost.style.transform = "translate3d(0, 0, 0) rotate(" + tilt + "deg) scale(1)";
    document.body.appendChild(ghost);
    return { ghost, rect, tilt };
  }

  function animateNode(node, keyframes, options) {
    if (!node || typeof node.animate !== "function") {
      return Promise.resolve();
    }

    if (reducedMotionMedia && reducedMotionMedia.matches) {
      return Promise.resolve();
    }

    const animationOptions = Object.assign({}, options);
    const multiplier = animationTimingMultiplier();

    if (typeof animationOptions.duration === "number") {
      animationOptions.duration = Math.round(animationOptions.duration * multiplier);
    }

    if (typeof animationOptions.delay === "number") {
      animationOptions.delay = Math.round(animationOptions.delay * multiplier);
    }

    const animation = node.animate(keyframes, animationOptions);
    return animation.finished.catch(function () {
      return undefined;
    });
  }

  function createShotClone(element) {
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true);
    clone.classList.add("floating-shot");
    clone.style.left = rect.left + "px";
    clone.style.top = rect.top + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.margin = "0";
    document.body.appendChild(clone);
    return { clone, rect };
  }

  function updateBestScopeIfNeeded() {
    if (state.game.scopeCount > state.bestScope) {
      state.bestScope = state.game.scopeCount;
      saveBestScope(state.bestScope);
    }
  }

  function calculateCoinReward(moveResult, nextGame) {
    if (!moveResult || !moveResult.evaluation) {
      return 0;
    }

    let reward = moveResult.evaluation.captureCount * COIN_REWARD_PER_CAPTURED_CARD;

    if (moveResult.scopa) {
      reward += COIN_REWARD_SCOPA_BONUS;
    }

    if (nextGame && nextGame.gameOver && nextGame.table.length === 0) {
      reward += COIN_REWARD_CLEAN_TABLE_BONUS;
    }

    reward += getEndGameCoinBonus(nextGame);

    return reward;
  }

  function addCoins(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    state.coins += amount;
    saveCoinTotal(state.coins);
  }

  function clearCoinGainEffect() {
    if (state.coinEffectTimer) {
      window.clearTimeout(state.coinEffectTimer);
      state.coinEffectTimer = 0;
    }

    refs.hudBank.classList.remove("is-earning");
    refs.coinGain.classList.remove("is-visible");
    refs.coinGain.textContent = "";
  }

  function showCoinGain(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    clearCoinGainEffect();
    refs.coinGain.textContent = "+" + formatCoinCount(amount);
    refs.hudBank.classList.remove("is-earning");
    void refs.hudBank.offsetWidth;
    refs.hudBank.classList.add("is-earning");
    refs.coinGain.classList.add("is-visible");
    state.coinEffectTimer = window.setTimeout(function () {
      clearCoinGainEffect();
    }, 1650);
  }

  function clearTransientShots() {
    document.querySelectorAll(".deal-shot, .floating-shot, .drag-ghost").forEach(function (node) {
      node.remove();
    });
  }

  function releaseDragPointer(drag) {
    if (!drag || !drag.pointerOwner || !drag.pointerOwner.releasePointerCapture) {
      return;
    }

    try {
      if (drag.pointerOwner.hasPointerCapture(drag.pointerId)) {
        drag.pointerOwner.releasePointerCapture(drag.pointerId);
      }
    } catch (error) {
      return;
    }
  }

  function startNewGame() {
    clearTransientShots();
    clearCoinGainEffect();
    state.game = logic.createInitialState();
    state.hasStarted = true;
    state.animating = true;
    state.dealAnimationQueued = false;
    state.drag = null;
    state.displayCounts = {
      deck: totalCardCount(state.game),
      captured: 0
    };
    state.dealIds = {
      hand: state.game.hand.map(function (card) {
        return card.id;
      }),
      table: state.game.table.map(function (card) {
        return card.id;
      })
    };
    render();
  }

  function resetBestScope() {
    state.bestScope = 0;
    saveBestScope(0);
    render();
  }

  function moveGhost(clientX, clientY) {
    if (!state.drag) {
      return;
    }

    state.drag.ghost.style.left = clientX - state.drag.pointerOffsetX + "px";
    state.drag.ghost.style.top = clientY - state.drag.pointerOffsetY + "px";
    const now = performance.now();
    const dt = Math.max(16, now - state.drag.lastMoveAt);
    const dx = clientX - state.drag.lastClientX;
    const dy = clientY - state.drag.lastClientY;
    const velocityX = dx / dt;
    const velocityY = dy / dt;
    const targetRotation = clamp(state.drag.baseRotation + velocityX * 34, -9, 9);
    const lift = clamp((Math.abs(velocityX) + Math.abs(velocityY)) * 14, 1.5, 6);

    state.drag.currentRotation = state.drag.currentRotation * 0.72 + targetRotation * 0.28;
    state.drag.ghost.style.transform =
      "translate3d(0, -" +
      lift.toFixed(2) +
      "px, 0) rotate(" +
      state.drag.currentRotation.toFixed(2) +
      "deg) scale(1.02)";
    state.drag.lastClientX = clientX;
    state.drag.lastClientY = clientY;
    state.drag.lastMoveAt = now;
  }

  function refreshDragState(clientX, clientY) {
    if (!state.drag) {
      return;
    }

    const nextTarget = pickTarget(state.drag.targets, clientX, clientY);
    const previousId = state.drag.activeTarget ? state.drag.activeTarget.id : null;
    const nextId = nextTarget ? nextTarget.id : null;

    state.drag.activeTarget = nextTarget;

    if (previousId !== nextId) {
      renderTable();
    }
  }

  async function animateGhostTo(
    ghost,
    fromLeft,
    fromTop,
    toLeft,
    toTop,
    scale,
    duration,
    flightOptions
  ) {
    const options = flightOptions || {};
    const distance = Math.sqrt((toLeft - fromLeft) * (toLeft - fromLeft) + (toTop - fromTop) * (toTop - fromTop));

    await animateFlight(
      ghost,
      {
        fromLeft: fromLeft,
        fromTop: fromTop,
        toLeft: toLeft,
        toTop: toTop,
        fromRotation: options.fromRotation || 0,
        toRotation: options.toRotation || 0,
        startScale: options.startScale != null ? options.startScale : 1.02,
        midScale: options.midScale != null ? options.midScale : 1.03,
        endScale: scale,
        curveX: options.curveX,
        lift: options.lift != null ? options.lift : clamp(distance * 0.12, 12, 34),
        overshootScale: options.overshootScale != null ? options.overshootScale : Math.max(scale, scale * 1.008),
        overshootY: options.overshootY,
        midOffset: options.midOffset,
        nearEndOffset: options.nearEndOffset
      },
      {
        duration: duration,
        easing: options.easing || "cubic-bezier(0.2, 0.85, 0.32, 1)",
        fill: "forwards"
      }
    );

    ghost.style.left = toLeft + "px";
    ghost.style.top = toTop + "px";
    ghost.style.transform =
      "translate3d(0, 0, 0) rotate(" + (options.toRotation || 0) + "deg) scale(" + scale + ")";
  }

  async function animateReturnToHand() {
    const drag = state.drag;
    if (!drag) {
      return;
    }

    const fromLeft = parseFloat(drag.ghost.style.left);
    const fromTop = parseFloat(drag.ghost.style.top);

    await animateGhostTo(
      drag.ghost,
      fromLeft,
      fromTop,
      drag.originRect.left,
      drag.originRect.top,
      1,
      250,
      {
        fromRotation: drag.currentRotation,
        toRotation: drag.baseRotation,
        startScale: 1.02,
        midScale: 1.025
      }
    );
  }

  async function animateCaptureToPile(selectedIds) {
    const pileRect = refs.capturePile.getBoundingClientRect();
    const shots = selectedIds
      .map(function (id) {
        return refs.tableZone.querySelector('[data-table-id="' + id + '"]');
      })
      .filter(Boolean)
      .map(function (element) {
        return createShotClone(element);
      });

    const promises = shots.map(function (shot, index) {
      const endLeft = pileRect.left + index * 2;
      const endTop = pileRect.top - index * 2;
      const tilt =
        parseFloat(window.getComputedStyle(shot.clone).getPropertyValue("--card-tilt")) || 0;
      const distance = Math.sqrt(
        (endLeft - shot.rect.left) * (endLeft - shot.rect.left) +
          (endTop - shot.rect.top) * (endTop - shot.rect.top)
      );

      return animateFlight(
        shot.clone,
        {
          fromLeft: shot.rect.left,
          fromTop: shot.rect.top,
          toLeft: endLeft,
          toTop: endTop,
          fromRotation: tilt,
          toRotation: -6 + index * 0.7,
          startScale: 1,
          midScale: 0.86,
          endScale: 0.34,
          curveX: index % 2 === 0 ? -10 : 10,
          lift: clamp(distance * 0.15, 24, 50),
          overshootScale: 0.36,
          endOpacity: 0.92
        },
        {
          duration: 360,
          delay: 10 + index * 18,
          easing: "cubic-bezier(0.2, 0.85, 0.32, 1)",
          fill: "forwards"
        }
      )
        .then(function () {
          state.displayCounts.captured += 1;
          renderDeckStack();
          return pulseStack(refs.capturePile);
        })
        .finally(function () {
          shot.clone.remove();
        });
    });

    await Promise.all(promises);
  }

  async function commitDraggedMove(target) {
    const drag = state.drag;
    if (!drag) {
      return;
    }

    const result = logic.applyMove(state.game, {
      handCardId: drag.handCardId,
      selectedTableIds: target.selectedIds
    });

    if (!result.ok) {
      await animateReturnToHand();
      drag.ghost.remove();
      state.drag = null;
      state.animating = false;
      render();
      return;
    }

    const coinReward = calculateCoinReward(result.moveResult, result.state);
    const currentLeft = parseFloat(drag.ghost.style.left);
    const currentTop = parseFloat(drag.ghost.style.top);
    const settleLeft = target.clientX - drag.originRect.width / 2;
    const settleTop = target.clientY - drag.originRect.height / 2;

    await animateGhostTo(drag.ghost, currentLeft, currentTop, settleLeft, settleTop, 0.99, 180, {
      fromRotation: drag.currentRotation,
      toRotation: 0,
      startScale: 1.02,
      midScale: 1.03
    });

    if (target.selectedIds.length > 0) {
      const pileRect = refs.capturePile.getBoundingClientRect();
      const distance = Math.sqrt(
        (pileRect.left - settleLeft) * (pileRect.left - settleLeft) +
          (pileRect.top - settleTop) * (pileRect.top - settleTop)
      );
      const handFlight = animateFlight(
        drag.ghost,
        {
          fromLeft: settleLeft,
          fromTop: settleTop,
          toLeft: pileRect.left,
          toTop: pileRect.top,
          fromRotation: 0,
          toRotation: -7,
          startScale: 0.99,
          midScale: 0.82,
          endScale: 0.34,
          curveX: -8,
          lift: clamp(distance * 0.15, 24, 48),
          overshootScale: 0.36,
          endOpacity: 0.92
        },
        {
          duration: 360,
          easing: "cubic-bezier(0.2, 0.85, 0.32, 1)",
          fill: "forwards"
        }
      ).then(function () {
        state.displayCounts.captured += 1;
        renderDeckStack();
        return pulseStack(refs.capturePile);
      });

      await Promise.all([handFlight, animateCaptureToPile(target.selectedIds)]);
    } else {
      await animateGhostTo(drag.ghost, settleLeft, settleTop, settleLeft, settleTop, 0.99, 110, {
        fromRotation: 0,
        toRotation: 0,
        lift: 6,
        midScale: 1.01,
        overshootScale: 1.004
      });
    }

    drag.ghost.remove();
    const previousGame = state.game;
    state.game = result.state;
    addCoins(coinReward);
    state.dealIds = computeDealIds(previousGame, state.game);
    updateBestScopeIfNeeded();
    if (target.selectedIds.length === 0) {
      state.displayCounts.captured = state.game.captured.length;
    }
    state.drag = null;
    state.animating = hasPendingDeals();
    render();
    showCoinGain(coinReward);
  }

  function beginDrag(event, cardElement, handCardId) {
    if (state.animating || !state.hasStarted || state.game.gameOver) {
      return;
    }

    event.preventDefault();

    if (cardElement.setPointerCapture) {
      try {
        cardElement.setPointerCapture(event.pointerId);
      } catch (error) {
        // Alcuni browser o device possono rifiutare il capture senza compromettere il drag.
      }
    }

    const dragGhost = createGhostFromElement(cardElement);
    state.drag = {
      handCardId: handCardId,
      pointerId: event.pointerId,
      pointerOwner: cardElement,
      ghost: dragGhost.ghost,
      baseRotation: dragGhost.tilt,
      currentRotation: dragGhost.tilt,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      lastMoveAt: performance.now(),
      originRect: dragGhost.rect,
      pointerOffsetX: event.clientX - dragGhost.rect.left,
      pointerOffsetY: event.clientY - dragGhost.rect.top,
      targets: createTargetsForCard(handCardId),
      activeTarget: null
    };
    moveGhost(event.clientX, event.clientY);
    refreshDragState(event.clientX, event.clientY);
    render();
  }

  async function finishDrag(clientX, clientY) {
    if (!state.drag) {
      return;
    }

    releaseDragPointer(state.drag);
    state.animating = true;
    refreshDragState(clientX, clientY);
    let target = state.drag.activeTarget;

    if (!target) {
      const onlyDiscard =
        state.drag.targets.length === 1 && state.drag.targets[0].selectedIds.length === 0;
      if (onlyDiscard) {
        const tableRect = refs.tableZone.getBoundingClientRect();
        const insideTable =
          clientX >= tableRect.left &&
          clientX <= tableRect.right &&
          clientY >= tableRect.top &&
          clientY <= tableRect.bottom;

        if (insideTable) {
          target = state.drag.targets[0];
        }
      }
    }

    if (target) {
      await commitDraggedMove(target);
      return;
    }

    await animateReturnToHand();
    state.drag.ghost.remove();
    state.drag = null;
    state.animating = false;
    render();
  }

  window.addEventListener("pointermove", function (event) {
    if (!state.drag || state.animating) {
      return;
    }

    moveGhost(event.clientX, event.clientY);
    refreshDragState(event.clientX, event.clientY);
  });

  window.addEventListener("pointerup", function (event) {
    if (!state.drag || state.animating) {
      return;
    }

    finishDrag(event.clientX, event.clientY);
  });

  window.addEventListener("pointercancel", function () {
    if (!state.drag || state.animating) {
      return;
    }

    finishDrag(state.drag.originRect.left, state.drag.originRect.top);
  });

  refs.handZone.addEventListener("pointerdown", function (event) {
    const cardElement = event.target.closest("[data-hand-id]");
    if (!cardElement) {
      return;
    }

    beginDrag(event, cardElement, cardElement.getAttribute("data-hand-id"));
  });

  refs.startGameButton.addEventListener("click", startNewGame);
  refs.newGameButton.addEventListener("click", startNewGame);
  refs.resetBestButton.addEventListener("click", resetBestScope);
  refs.playAgainButton.addEventListener("click", startNewGame);
  window.addEventListener("resize", updateViewportHeight);
  window.addEventListener("orientationchange", updateViewportHeight);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewportHeight);
  }

  render();
})();
