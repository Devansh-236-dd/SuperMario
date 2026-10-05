import { GROUND, VIEW_HEIGHT, WORLDS, type Game, type Rect } from "./game";

const MARIO = [
  ".....RRRRRR.....", "....RRRRRRRRRR..", "....HHSSSKS.....", "...HSHSSSKSSS...",
  "...HSHHSSSHSSS..", "...HHSSSSHHHH...", ".....SSSSSSS....", "....RRBRRR......",
  "...RRRBRRBRRR...", "..RRRRBBBBRRRR..", "..SSRBYYBBRSS...", "..SSSBBBBBBSSS..",
  "....BBBBBBBB....", "....BBB..BBB....", "...HHH....HHH...", "..HHHH....HHHH..",
];
const GOOMBA = [
  ".....HHHHHH.....", "...HHHHHHHHHH...", "..HHHHHHHHHHHH..", ".HHHHHHHHHHHHHH.",
  ".HHKHWHHWKHHHHH.", "HHHKKWWHWKKHHHHH", "HHHWWWHHWWWHHHHH", "HHHHHHHHHHHHHHHH",
  ".HHHHSSSSHHHHHH.", "..HHSSSSSSHHHH..", "....SSSSSSSS....", "..KKKSSSSSSKKK..",
  ".KKKKK....KKKKK.", "KKKKKK....KKKKKK",
];
const MUSHROOM = [
  ".....RRRRRR.....", "...RRRWWWWRRR...", "..RRRWWWWWWRRR..", ".RRRRWWWWWWRRRR.",
  "RRWWRRWWWWRRWWRR", "RWWWWRRRRRRWWWWR", "RWWWWRRRRRRWWWWR", "RRWWRRRRRRRRWWRR",
  "RRRRRRRRRRRRRRRR", ".KKKSSSSSSSSKKK.", "...SSSSSSSSSS...", "...SSSKSSKSSS...",
  "...SSSSSSSSSS...", "....SSSSSSSS....",
];
const MARIO_COLORS: Record<string, string> = { R: "#e74b35", H: "#613e2d", S: "#ffd09a", K: "#352c29", B: "#4679a5", Y: "#ffdc73" };

function sprite(ctx: CanvasRenderingContext2D, pattern: string[], x: number, y: number, width: number, height: number, palette: Record<string, string>, flip = false) {
  const pw = width / 16;
  const ph = height / pattern.length;
  pattern.forEach((row, ry) => [...row].forEach((key, rx) => {
    if (!palette[key]) return;
    ctx.fillStyle = palette[key];
    ctx.fillRect(Math.round(x + (flip ? 15 - rx : rx) * pw), Math.round(y + ry * ph), Math.ceil(pw), Math.ceil(ph));
  }));
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, night = false) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  ctx.fillStyle = night ? "#626c88" : "#edf8f7";
  ctx.fillRect(0, 16, 96, 24);
  ctx.fillRect(12, 6, 64, 36);
  ctx.fillRect(28, 0, 32, 42);
  ctx.fillRect(-8, 24, 112, 10);
  ctx.fillStyle = night ? "#56627f" : "#d6ecec";
  ctx.fillRect(0, 34, 96, 8);
  ctx.fillRect(12, 42, 72, 4);
  ctx.fillStyle = night ? "#71809a" : "#ffffff";
  ctx.fillRect(30, 4, 24, 5);
  ctx.fillRect(15, 12, 12, 4);
  ctx.restore();
}

function hill(ctx: CanvasRenderingContext2D, x: number, baseline: number, width: number, height: number, color: string, detail: string) {
  ctx.fillStyle = color;
  const step = 12;
  for (let dx = 0; dx < width; dx += step) {
    const h = Math.sin((dx / width) * Math.PI) * height;
    ctx.fillRect(Math.round(x + dx), baseline - Math.round(h / step) * step, step + 1, Math.round(h / step) * step + 1);
  }
  ctx.fillStyle = detail;
  for (let i = 0; i < 8; i++) {
    const px = x + width * (0.22 + ((i * 37) % 60) / 100);
    const py = baseline - height * (0.14 + ((i * 13) % 55) / 100);
    ctx.fillRect(Math.round(px), Math.round(py), 4, 9);
    ctx.fillRect(Math.round(px) - 3, Math.round(py) + 3, 10, 3);
  }
}

function bush(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, night: boolean) {
  ctx.fillStyle = night ? "#55765f" : "#83ba6f";
  ctx.fillRect(x, y - 16, width, 16);
  for (let i = 0; i < width; i += 24) {
    ctx.fillRect(x + i + 4, y - 24 - (i % 48 === 0 ? 8 : 0), 20, 24);
    ctx.fillRect(x + i + 8, y - 36 - (i % 48 === 0 ? 4 : 0), 12, 12);
  }
  ctx.fillStyle = night ? "#789376" : "#b6d88d";
  for (let i = 0; i < width; i += 24) ctx.fillRect(x + i + 9, y - 27, 7, 4);
}

function drawGround(ctx: CanvasRenderingContext2D, rect: Rect, grass: string) {
  const start = Math.max(rect.x, Math.floor((rect.x - 64) / 32) * 32);
  ctx.fillStyle = "#bc8158";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  for (let row = 0; row < 3; row++) {
    for (let x = start - (row % 2) * 16; x < rect.x + rect.w; x += 32) {
      const y = rect.y + 12 + row * 28;
      ctx.fillStyle = "#dca579";
      ctx.fillRect(x + 2, y + 2, 28, 23);
      ctx.fillStyle = "#e5b88b";
      ctx.fillRect(x + 3, y + 3, 25, 3);
      ctx.fillRect(x + 3, y + 3, 3, 18);
      ctx.fillStyle = "#c88d62";
      ctx.fillRect(x + 9, y + 13, 4, 3);
      ctx.fillRect(x + 23, y + 19, 3, 3);
    }
  }
  ctx.fillStyle = grass;
  ctx.fillRect(rect.x, rect.y, rect.w, 10);
  ctx.fillStyle = "#bed17a";
  ctx.fillRect(rect.x, rect.y, rect.w, 3);
  ctx.fillStyle = grass;
  for (let x = rect.x; x < rect.x + rect.w; x += 16) ctx.fillRect(x, rect.y + 8, 8, 7);
  ctx.restore();
}

function drawPipe(ctx: CanvasRenderingContext2D, p: Rect) {
  ctx.fillStyle = "#456b3c";
  ctx.fillRect(p.x + 4, p.y + 18, p.w - 8, p.h - 18);
  ctx.fillStyle = "#91b75a";
  ctx.fillRect(p.x + 8, p.y + 18, p.w - 16, p.h - 18);
  ctx.fillStyle = "#b8d37c";
  ctx.fillRect(p.x + 12, p.y + 20, 8, p.h - 20);
  ctx.fillStyle = "#72994b";
  ctx.fillRect(p.x + p.w - 18, p.y + 20, 8, p.h - 20);
  ctx.fillStyle = "#456b3c";
  ctx.fillRect(p.x - 4, p.y, p.w + 8, 22);
  ctx.fillStyle = "#98bd60";
  ctx.fillRect(p.x, p.y + 4, p.w, 14);
  ctx.fillStyle = "#c5de8c";
  ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, 4);
  ctx.fillRect(p.x + 4, p.y + 8, 8, 8);
  ctx.fillStyle = "#719549";
  ctx.fillRect(p.x + p.w - 12, p.y + 8, 8, 8);
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const width = 6 + Math.abs(Math.cos(time * 3.4)) * 10;
  ctx.fillStyle = "#b58335";
  ctx.fillRect(Math.round(x - width / 2), y - 10, width, 20);
  ctx.fillRect(Math.round(x - width / 2) + 3, y - 13, Math.max(2, width - 6), 26);
  ctx.fillStyle = "#ffda66";
  ctx.fillRect(Math.round(x - width / 2) + 2, y - 9, Math.max(2, width - 4), 18);
  ctx.fillStyle = "#fff1a1";
  ctx.fillRect(Math.round(x - width / 2) + 3, y - 8, 3, 10);
  ctx.fillStyle = "#d49d3f";
  ctx.fillRect(Math.round(x + width / 2) - 5, y - 6, 2, 12);
}

function castle(ctx: CanvasRenderingContext2D, x: number) {
  const y = GROUND - 122;
  ctx.fillStyle = "#a3755d";
  ctx.fillRect(x, y + 22, 128, 100);
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 36, y + 6, 20, 20);
  ctx.fillStyle = "#d0a182";
  ctx.fillRect(x + 4, y + 25, 120, 94);
  for (let row = 0; row < 5; row++) {
    ctx.fillStyle = "#ad8064";
    ctx.fillRect(x + 4, y + 26 + row * 18, 120, 2);
    for (let col = 0; col < 6; col++) ctx.fillRect(x + col * 24 + (row % 2) * 12, y + 27 + row * 18, 2, 16);
  }
  ctx.fillStyle = "#514634";
  ctx.fillRect(x + 49, y + 76, 30, 46);
  ctx.fillRect(x + 54, y + 68, 20, 10);
  ctx.fillRect(x + 21, y + 42, 12, 18);
  ctx.fillRect(x + 95, y + 42, 12, 18);
  ctx.fillStyle = "#fff0ca";
  ctx.fillRect(x + 25, y + 43, 3, 14);
  ctx.fillRect(x + 99, y + 43, 3, 14);
}

export default function renderGame(ctx: CanvasRenderingContext2D, game: Game) {
  const theme = WORLDS[game.world];
  const viewport = game.viewportWidth;
  const night = game.world === 2;
  const camera = Math.round(game.camera);
  const t = game.elapsed;
  ctx.clearRect(0, 0, viewport, VIEW_HEIGHT);
  ctx.fillStyle = theme.sky;
  ctx.fillRect(0, 0, viewport, VIEW_HEIGHT);
  if (night) {
    ctx.fillStyle = "#e5daba";
    for (let i = 0; i < 35; i++) {
      const x = ((i * 137 + 28) % viewport) - (camera * 0.04 % 50);
      const y = (i * 53 + 23) % 210;
      ctx.globalAlpha = 0.5 + Math.sin(t * 1.5 + i) * 0.3;
      ctx.fillRect(x, y, i % 4 === 0 ? 4 : 2, i % 4 === 0 ? 4 : 2);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = night ? "#f7e4b2" : game.world === 1 ? "#fff1c3" : "#eef1c5";
  ctx.fillRect(viewport - 156 - camera * 0.025, 50, 40, 40);
  ctx.fillRect(viewport - 164 - camera * 0.025, 58, 56, 24);
  if (night) { ctx.fillStyle = theme.sky; ctx.fillRect(viewport - 142 - camera * 0.025, 46, 34, 28); }
  for (let i = -1; i < 9; i++) {
    const x = i * 540 - (camera * 0.12 % 540);
    hill(ctx, x, GROUND, 380, 132 + (i % 2) * 36, theme.far, night ? "#66718a" : "#b4d5b4");
  }
  for (let i = -1; i < 7; i++) {
    const x = i * 730 + 220 - (camera * 0.24 % 730);
    hill(ctx, x, GROUND, 300, 90 + (i % 2) * 48, theme.hill, night ? "#7f9691" : "#a3ce94");
  }
  const drift = Math.sin(t * 0.2) * 7;
  for (let i = -1; i < 7; i++) {
    const x = i * 346 + 72 - (camera * 0.1 % 346) + drift;
    cloud(ctx, x, 52 + (Math.abs(i) % 3) * 30, i % 2 === 0 ? 1 : 0.7, night);
  }
  ctx.save();
  ctx.translate(-camera, 0);
  for (let i = 0; i < 16; i++) bush(ctx, i * 312 + 248, GROUND, 64 + (i % 3) * 24, night);
  // Small wildflowers make the meadow feel a little more alive.
  for (let i = 0; i < 44; i++) {
    const x = i * 112 + 32;
    if (!game.ground.some((g) => x >= g.x && x < g.x + g.w)) continue;
    ctx.fillStyle = "#638942";
    ctx.fillRect(x + 3, GROUND - 10, 3, 10);
    ctx.fillStyle = i % 3 ? "#f8e6a0" : "#f3c2a5";
    ctx.fillRect(x, GROUND - 13, 9, 6);
    ctx.fillRect(x + 3, GROUND - 16, 3, 12);
    ctx.fillStyle = "#d7a54d";
    ctx.fillRect(x + 3, GROUND - 11, 3, 3);
  }
  for (const ground of game.ground) if (ground.x < camera + viewport && ground.x + ground.w > camera) drawGround(ctx, ground, theme.grass);
  // Starting sign.
  ctx.fillStyle = "#986b46";
  ctx.fillRect(218, 318, 6, 42);
  ctx.fillStyle = "#f2d79a";
  ctx.fillRect(194, 299, 57, 28);
  ctx.fillStyle = "#7b6544";
  ctx.fillRect(196, 301, 53, 2);
  ctx.fillRect(229, 312, 13, 3);
  ctx.fillRect(237, 308, 3, 11);
  ctx.font = "bold 10px monospace";
  ctx.fillText("GO", 204, 318);
  for (const p of game.pipes) drawPipe(ctx, p);
  for (const block of game.blocks) {
    if (block.x < camera - 32 || block.x > camera + viewport) continue;
    const x = block.x;
    const y = block.y - Math.sin(block.bump / 0.22 * Math.PI) * 9;
    const question = block.kind === "question";
    const brick = block.kind === "brick";
    ctx.fillStyle = question ? "#b38938" : "#8d6347";
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = question ? "#f8ce64" : block.kind === "used" ? "#b49b6d" : "#ce956a";
    ctx.fillRect(x + 2, y + 2, 28, 28);
    ctx.fillStyle = question ? "#ffe79b" : "#e4b287";
    ctx.fillRect(x + 3, y + 2, 26, 3);
    ctx.fillRect(x + 2, y + 3, 3, 26);
    if (question) {
      ctx.fillStyle = "#986b36";
      const q = [".111.", "11.11", "...11", "..11.", "..1..", ".....", "..1.."];
      q.forEach((row, ry) => [...row].forEach((s, rx) => { if (s === "1") ctx.fillRect(x + 9 + rx * 3, y + 6 + ry * 3, 3, 3); }));
      for (const [dx, dy] of [[4, 4], [25, 4], [4, 25], [25, 25]]) ctx.fillRect(x + dx, y + dy, 2, 2);
    } else if (brick) {
      ctx.fillStyle = "#956548";
      ctx.fillRect(x, y + 15, 32, 2);
      ctx.fillRect(x + 15, y, 2, 15);
      ctx.fillRect(x + 7, y + 17, 2, 15);
      ctx.fillRect(x + 25, y + 17, 2, 15);
    } else {
      ctx.fillStyle = "#94774e";
      ctx.fillRect(x + 6, y + 6, 20, 2);
      ctx.fillRect(x + 6, y + 6, 2, 20);
      ctx.fillStyle = "#dcc19a";
      ctx.fillRect(x + 7, y + 25, 19, 2);
      ctx.fillRect(x + 25, y + 7, 2, 19);
    }
  }
  for (const coin of game.coins) if (!coin.taken && coin.x > camera - 20 && coin.x < camera + viewport + 20) drawCoin(ctx, coin.x, coin.y + Math.sin(t * 3 + coin.x) * 3, t);
  for (const enemy of game.enemies) {
    if (!enemy.alive && enemy.squash <= 0) continue;
    const h = enemy.alive ? 28 : 9;
    const bob = enemy.alive ? Math.sin(t * 8) * 1.3 : 0;
    sprite(ctx, GOOMBA, enemy.x - 1, enemy.y + 28 - h + bob, 32, h, { H: "#9d6c4a", S: "#e9c49a", K: "#49362a", W: "#fff4d9" }, enemy.vx > 0);
  }
  for (const m of game.mushrooms) if (m.active) sprite(ctx, MUSHROOM, m.x - 2, m.y, 30, 28, { R: "#ed694c", W: "#fff5dc", S: "#f1dab4", K: "#50462e" });
  // Finish flag and the castle beyond it.
  ctx.fillStyle = "#ded9b0";
  ctx.fillRect(game.flagX, 130, 5, GROUND - 130);
  ctx.fillStyle = "#a59369";
  ctx.fillRect(game.flagX + 4, 132, 2, GROUND - 132);
  ctx.fillStyle = "#f2d77a";
  ctx.fillRect(game.flagX - 3, 123, 12, 12);
  const flagY = game.status === "won" ? 298 : 144;
  ctx.fillStyle = "#e55c43";
  ctx.beginPath();
  ctx.moveTo(game.flagX, flagY);
  ctx.lineTo(game.flagX - 46, flagY + 20);
  ctx.lineTo(game.flagX, flagY + 40);
  ctx.fill();
  ctx.fillStyle = "#fff1d4";
  ctx.fillRect(game.flagX - 21, flagY + 14, 5, 13);
  ctx.fillRect(game.flagX - 25, flagY + 18, 13, 5);
  castle(ctx, game.flagX + 110);
  const p = game.player;
  if (p.invincible === 0 || Math.floor(t * 12) % 2 === 0) {
    const moving = p.grounded && Math.abs(p.vx) > 20;
    const bounce = moving ? Math.sin(t * 18) * 1.5 : 0;
    ctx.save();
    if (game.status === "dying") ctx.globalAlpha = 0.8;
    sprite(ctx, MARIO, p.x - 5, p.y + bounce, 36, p.h, MARIO_COLORS, p.facing < 0);
    ctx.restore();
  }
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.min(1, particle.life * 2);
    ctx.fillStyle = particle.color;
    if (particle.text) {
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#665c3e";
      ctx.lineWidth = 3;
      ctx.strokeText(particle.text, particle.x, particle.y);
      ctx.fillText(particle.text, particle.x, particle.y);
      ctx.textAlign = "left";
    } else ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 4, 4);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
