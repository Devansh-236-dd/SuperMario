export const VIEW_WIDTH = 1152;
export const VIEW_HEIGHT = 432;
export const GROUND = 360;

export type GameStatus = "ready" | "playing" | "paused" | "dying" | "gameover" | "won";
export type Sound = "jump" | "coin" | "stomp" | "power" | "hurt" | "win" | "block";
export type Rect = { x: number; y: number; w: number; h: number };
export type Block = Rect & { kind: "brick" | "question" | "used" | "step"; reward?: "coin" | "mushroom"; bump: number };
export type Enemy = Rect & { vx: number; alive: boolean; squash: number; min: number; max: number };
export type Coin = { x: number; y: number; taken: boolean };
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; text?: string };
export type Mushroom = Rect & { vx: number; vy: number; active: boolean };
export type Input = { left: boolean; right: boolean; jump: boolean; run: boolean; jumpPressed: boolean };
export type Player = Rect & { vx: number; vy: number; grounded: boolean; facing: number; big: boolean; invincible: number; coyote: number; jumpBuffer: number };

export const WORLDS = [
  { name: "Mushroom Meadow", subtitle: "Every adventure starts with a jump.", sky: "#a8def3", far: "#9bccab", hill: "#75b987", grass: "#80ad48", accent: "#e75a3b" },
  { name: "Sunset Heights", subtitle: "A golden sky. A few bigger leaps.", sky: "#f9c99e", far: "#d5ac93", hill: "#aaa777", grass: "#819849", accent: "#d48834" },
  { name: "Starlight Valley", subtitle: "One last adventure under the stars.", sky: "#384365", far: "#4e5878", hill: "#607c83", grass: "#78916b", accent: "#8584c4" },
];

export type Game = {
  status: GameStatus;
  world: number;
  width: number;
  viewportWidth: number;
  player: Player;
  ground: Rect[];
  pipes: Rect[];
  blocks: Block[];
  enemies: Enemy[];
  coins: Coin[];
  mushrooms: Mushroom[];
  particles: Particle[];
  score: number;
  coinCount: number;
  lives: number;
  time: number;
  camera: number;
  elapsed: number;
  deathTimer: number;
  checkpoint: number;
  flagX: number;
};

export function emptyInput(): Input {
  return { left: false, right: false, jump: false, run: false, jumpPressed: false };
}

function newPlayer(x: number): Player {
  return { x, y: GROUND - 36, w: 26, h: 36, vx: 0, vy: 0, grounded: true, facing: 1, big: false, invincible: 0, coyote: 0.1, jumpBuffer: 0 };
}

export function createGame(world = 0, carry?: { score: number; coinCount: number; lives: number }): Game {
  const width = 4544 + world * 256;
  const gaps = world === 0 ? [[1376, 1504], [2848, 2976]] : world === 1 ? [[1344, 1472], [2240, 2384], [3424, 3568]] : [[1376, 1520], [2320, 2464], [3072, 3232], [4064, 4192]];
  const ground: Rect[] = [];
  let edge = 0;
  for (const [start, end] of gaps) {
    ground.push({ x: edge, y: GROUND, w: start - edge, h: VIEW_HEIGHT - GROUND + 80 });
    edge = end;
  }
  ground.push({ x: edge, y: GROUND, w: width - edge, h: VIEW_HEIGHT - GROUND + 80 });
  const pipes = [
    { x: 640, y: GROUND - 64, w: 64, h: 64 },
    { x: 1056, y: GROUND - 96, w: 64, h: 96 },
    { x: 1776, y: GROUND - 80, w: 64, h: 80 },
    { x: 2576, y: GROUND - 96, w: 64, h: 96 },
    { x: 3648, y: GROUND - 64, w: 64, h: 64 },
  ];
  const blocks: Block[] = [];
  const group = (x: number, y: number, pattern: string) => {
    [...pattern].forEach((kind, i) => blocks.push({ x: x + i * 32, y, w: 32, h: 32, kind: kind === "b" ? "brick" : "question", reward: kind === "m" ? "mushroom" : "coin", bump: 0 }));
  };
  group(352, 248, "bqmbq");
  group(832, 232, "bqb");
  group(1568, 248, "qbbm");
  group(world === 0 ? 2016 : world === 1 ? 1936 : 1888, 232, "bqbqb");
  group(world === 2 ? 2736 : 2432, 248, "mqb");
  group(3104 + (world === 2 ? 320 : 0), 248, "bqmqb");
  const stairStart = width - 688;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j <= i; j++) blocks.push({ x: stairStart + i * 32, y: GROUND - (j + 1) * 32, w: 32, h: 32, kind: "step", bump: 0 });
  }
  const coins: Coin[] = [];
  const coinArc = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) coins.push({ x: x + i * 32, y: y - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 28, taken: false });
  };
  coinArc(520, 260, 3);
  coinArc(840, 192, 3);
  coinArc(1160, 270, 4);
  coinArc(1584, 206, 4);
  coinArc(1920, 286, 3);
  coinArc(world === 2 ? 2754 : 2450, 204, 3);
  coinArc(2730, 264, 4);
  coinArc(world === 1 ? 3120 : 3328 + world * 160, 204, 4);
  coinArc(stairStart + 32, 166, 4);
  const enemyPositions = [760, 960, 1656, 1936, 2320 + world * 128, 2704, 3056 + world * 176, 3504 + world * 128];
  const enemies: Enemy[] = enemyPositions.filter((x) => !gaps.some(([a, b]) => x > a - 32 && x < b + 32) && !pipes.some((pipe) => x < pipe.x + pipe.w && x + 30 > pipe.x)).map((x) => {
    const surface = ground.find((g) => x >= g.x && x + 30 <= g.x + g.w)!;
    return { x, y: GROUND - 28, w: 30, h: 28, vx: -(38 + world * 11), alive: true, squash: 0, min: Math.max(surface.x, x - 160), max: Math.min(surface.x + surface.w - 30, x + 150) };
  });
  return {
    status: "ready", world, width, viewportWidth: VIEW_WIDTH, ground, pipes, blocks, enemies, coins, mushrooms: [], particles: [], player: newPlayer(112),
    score: carry?.score ?? 0, coinCount: carry?.coinCount ?? 0, lives: carry?.lives ?? 3,
    time: 400, camera: 0, elapsed: 0, deathTimer: 0, checkpoint: 112, flagX: width - 352,
  };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function popup(game: Game, x: number, y: number, text: string) {
  game.particles.push({ x, y, vx: 0, vy: -28, life: 1, color: "#fff9de", text });
}

function sparkle(game: Game, x: number, y: number, color: string, count = 8) {
  for (let i = 0; i < count; i++) game.particles.push({ x, y, vx: (Math.random() - 0.5) * 180, vy: -Math.random() * 160 - 40, life: 0.5 + Math.random() * 0.4, color });
}

function addCoin(game: Game, x: number, y: number, sound: (name: Sound) => void) {
  game.coinCount += 1;
  game.score += 200;
  if (game.coinCount % 100 === 0) { game.lives += 1; popup(game, x, y - 20, "1 UP!"); }
  sparkle(game, x, y, "#ffe078", 5);
  popup(game, x, y - 14, "+200");
  sound("coin");
}

function hurt(game: Game, sound: (name: Sound) => void, fatal = false) {
  const p = game.player;
  if (!fatal && p.invincible > 0) return;
  if (p.big && !fatal) {
    p.big = false;
    p.y += 12;
    p.h = 36;
    p.invincible = 2.5;
    sound("hurt");
    return;
  }
  game.status = "dying";
  game.deathTimer = 0;
  p.vy = -430;
  p.vx = 0;
  sound("hurt");
}

export function stepGame(game: Game, input: Input, dt: number, sound: (name: Sound) => void = () => {}) {
  game.elapsed += dt;
  if (game.status === "dying") {
    game.deathTimer += dt;
    game.player.vy += 1200 * dt;
    game.player.y += game.player.vy * dt;
    if (game.deathTimer > 1.3) {
      game.lives -= 1;
      if (game.lives <= 0) game.status = "gameover";
      else {
        game.player = newPlayer(game.checkpoint);
        game.player.invincible = 2;
        game.camera = Math.max(0, game.checkpoint - game.viewportWidth * 0.3);
        if (game.time <= 0) game.time = 200;
        game.status = "playing";
      }
    }
    return;
  }
  if (game.status !== "playing") return;
  game.time = Math.max(0, game.time - dt);
  if (game.time === 0) { hurt(game, sound, true); return; }
  const p = game.player;
  p.invincible = Math.max(0, p.invincible - dt);
  p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
  p.jumpBuffer = input.jumpPressed ? 0.14 : Math.max(0, p.jumpBuffer - dt);
  input.jumpPressed = false;
  const direction = Number(input.right) - Number(input.left);
  const maxSpeed = input.run ? 330 : 230;
  if (direction) {
    p.facing = direction;
    p.vx += direction * (p.grounded ? 1700 : 1150) * dt;
    p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
  } else {
    const friction = (p.grounded ? 1900 : 550) * dt;
    p.vx = Math.sign(p.vx) * Math.max(0, Math.abs(p.vx) - friction);
  }
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = -610;
    p.grounded = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    sound("jump");
  }
  if (!input.jump && p.vy < -260) p.vy += 2000 * dt;
  p.vy = Math.min(760, p.vy + 1450 * dt);
  const solids: Rect[] = [...game.ground, ...game.pipes, ...game.blocks];
  p.x += p.vx * dt;
  for (const s of solids) {
    if (!overlaps(p, s)) continue;
    if (p.vx > 0) p.x = s.x - p.w;
    else if (p.vx < 0) p.x = s.x + s.w;
    p.vx = 0;
  }
  p.x = Math.max(0, Math.min(game.width - p.w, p.x));
  const previousY = p.y;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const s of solids) {
    if (!overlaps(p, s)) continue;
    if (p.vy >= 0 && previousY + p.h <= s.y + 1) {
      p.y = s.y - p.h;
      p.vy = 0;
      p.grounded = true;
    } else if (p.vy < 0 && previousY >= s.y + s.h - 1) {
      p.y = s.y + s.h;
      p.vy = 0;
      if ("kind" in s) {
        const block = s as Block;
        block.bump = 0.22;
        if (block.kind === "question") {
          block.kind = "used";
          if (block.reward === "mushroom") {
            game.mushrooms.push({ x: block.x + 3, y: block.y - 28, w: 26, h: 28, vx: 65, vy: -80, active: true });
            sound("power");
          } else addCoin(game, block.x + 16, block.y - 12, sound);
        } else if (block.kind === "brick" && p.big) {
          game.blocks = game.blocks.filter((b) => b !== block);
          game.score += 50;
          sparkle(game, block.x + 16, block.y + 16, "#bd7651", 10);
          sound("block");
        } else sound("block");
      }
    }
  }
  for (const b of game.blocks) b.bump = Math.max(0, b.bump - dt);
  for (const coin of game.coins) {
    if (!coin.taken && overlaps(p, { x: coin.x - 9, y: coin.y - 13, w: 18, h: 26 })) {
      coin.taken = true;
      addCoin(game, coin.x, coin.y, sound);
    }
  }
  for (const enemy of game.enemies) {
    enemy.squash = Math.max(0, enemy.squash - dt);
    if (!enemy.alive) continue;
    enemy.x += enemy.vx * dt;
    if (enemy.x <= enemy.min || enemy.x >= enemy.max || game.pipes.some((pipe) => overlaps(enemy, pipe))) {
      enemy.x -= enemy.vx * dt;
      enemy.vx *= -1;
    }
    if (overlaps(p, enemy)) {
      if (p.vy > 0 && previousY + p.h <= enemy.y + 12) {
        enemy.alive = false;
        enemy.squash = 0.4;
        p.vy = input.jump ? -420 : -280;
        game.score += 100;
        popup(game, enemy.x + 15, enemy.y - 10, "+100");
        sound("stomp");
      } else hurt(game, sound);
    }
  }
  for (const m of game.mushrooms) {
    if (!m.active) continue;
    m.x += m.vx * dt;
    for (const s of solids) if (overlaps(m, s)) { m.x -= m.vx * dt; m.vx *= -1; break; }
    const oldY = m.y;
    m.vy = Math.min(600, m.vy + 1200 * dt);
    m.y += m.vy * dt;
    for (const s of solids) if (overlaps(m, s) && oldY + m.h <= s.y + 1) { m.y = s.y - m.h; m.vy = 0; }
    if (overlaps(p, m)) {
      m.active = false;
      if (!p.big) { p.y -= 12; p.h = 48; p.big = true; }
      p.invincible = 1;
      game.score += 1000;
      popup(game, p.x, p.y - 20, "+1000");
      sparkle(game, p.x + 12, p.y + 12, "#fff6b0", 12);
      sound("power");
    }
    if (m.y > VIEW_HEIGHT + 100) m.active = false;
  }
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    if (!particle.text) particle.vy += 360 * dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
  // Checkpoints are only placed on uninterrupted, safe ground.
  if (p.x > 1860 && p.grounded && game.checkpoint === 112) {
    game.checkpoint = 1880;
    popup(game, p.x, p.y - 24, "CHECKPOINT!");
  }
  if (p.y > VIEW_HEIGHT + 70) hurt(game, sound, true);
  if (p.x + p.w >= game.flagX && game.status === "playing") {
    game.status = "won";
    game.score += Math.ceil(game.time) * 10 + 1000;
    sparkle(game, p.x, p.y, "#ffe082", 36);
    sound("win");
  }
  const target = Math.max(0, Math.min(game.width - game.viewportWidth, p.x - game.viewportWidth * 0.32));
  game.camera += (target - game.camera) * Math.min(1, dt * 7);
}
