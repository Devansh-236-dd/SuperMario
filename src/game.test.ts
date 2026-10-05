import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, emptyInput, GROUND, stepGame, type Game, type Input } from "./game.ts";

function playing(world = 0) {
  const game = createGame(world);
  game.status = "playing";
  return game;
}

function advance(game: Game, input: Input, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) stepGame(game, input, 1 / 60);
}

test("a held jump rises higher than a tapped jump and lands back on the ground", () => {
  const held = playing();
  const tapped = playing();
  const holdInput = { ...emptyInput(), jump: true, jumpPressed: true };
  const tapInput = { ...emptyInput(), jump: true, jumpPressed: true };
  stepGame(held, holdInput, 1 / 60);
  stepGame(tapped, tapInput, 1 / 60);
  tapInput.jump = false;
  let highestHeld = held.player.y;
  let highestTapped = tapped.player.y;
  for (let i = 0; i < 60; i++) {
    stepGame(held, holdInput, 1 / 60);
    stepGame(tapped, tapInput, 1 / 60);
    highestHeld = Math.min(highestHeld, held.player.y);
    highestTapped = Math.min(highestTapped, tapped.player.y);
  }
  assert.ok(highestHeld < highestTapped - 40);
  assert.equal(held.player.y + held.player.h, GROUND);
  assert.equal(held.player.grounded, true);
});

test("sprinting is faster, and a pipe blocks walking through it", () => {
  const walk = playing();
  const run = playing();
  advance(walk, { ...emptyInput(), right: true }, 0.3);
  advance(run, { ...emptyInput(), right: true, run: true }, 0.3);
  assert.ok(run.player.x > walk.player.x + 10);
  walk.player.x = 590;
  advance(walk, { ...emptyInput(), right: true }, 1);
  assert.equal(walk.player.x + walk.player.w, walk.pipes[0].x);
});

test("hitting a question block awards its coin only once", () => {
  const game = playing();
  const block = game.blocks.find((b) => b.kind === "question" && b.reward === "coin")!;
  game.player.x = block.x + 3;
  const input = { ...emptyInput(), jump: true, jumpPressed: true };
  advance(game, input, 1);
  assert.equal(block.kind, "used");
  assert.equal(game.coinCount, 1);
  assert.equal(game.score, 200);
  input.jumpPressed = true;
  advance(game, input, 1);
  assert.equal(game.coinCount, 1);
});

test("a mushroom block spawns a power-up, and collecting it protects from one hit", () => {
  const game = playing();
  const block = game.blocks.find((b) => b.reward === "mushroom")!;
  game.player.x = block.x + 3;
  advance(game, { ...emptyInput(), jump: true, jumpPressed: true }, 0.4);
  assert.equal(game.mushrooms.length, 1);
  const mushroom = game.mushrooms[0];
  game.player.x = mushroom.x;
  game.player.y = mushroom.y;
  stepGame(game, emptyInput(), 1 / 60);
  assert.equal(game.player.big, true);
  assert.equal(game.score, 1000);
  assert.equal(mushroom.active, false);
  game.player.invincible = 0;
  game.player.x = 760;
  game.player.y = GROUND - game.player.h;
  game.player.vy = 0;
  game.enemies = [{ x: 760, y: GROUND - 28, w: 30, h: 28, vx: 0, alive: true, squash: 0, min: 700, max: 900 }];
  stepGame(game, emptyInput(), 1 / 60);
  assert.equal(game.player.big, false);
  assert.equal(game.status, "playing");
  assert.ok(game.player.invincible > 0);
});

test("falling onto an enemy stomps it and bounces the player", () => {
  const game = playing();
  game.enemies = [{ x: 550, y: GROUND - 28, w: 30, h: 28, vx: 0, alive: true, squash: 0, min: 500, max: 600 }];
  game.coins = [];
  Object.assign(game.player, { x: 550, y: 288, vy: 160, grounded: false });
  advance(game, emptyInput(), 0.08);
  assert.equal(game.enemies[0].alive, false);
  assert.equal(game.score, 100);
  assert.ok(game.player.vy < 0);
  assert.equal(game.lives, 3);
});

test("falling into a gap consumes a life and respawns safely", () => {
  const game = playing();
  Object.assign(game.player, { x: 1420, y: GROUND - 20, grounded: false });
  advance(game, emptyInput(), 2.3);
  assert.equal(game.lives, 2);
  assert.equal(game.status, "playing");
  assert.equal(game.player.x, game.checkpoint);
  assert.equal(game.player.y + game.player.h, GROUND);
});

test("a last-life collision ends the game, while pausing freezes gameplay", () => {
  const paused = playing();
  paused.status = "paused";
  const oldX = paused.player.x;
  const oldTime = paused.time;
  advance(paused, { ...emptyInput(), right: true }, 2);
  assert.equal(paused.player.x, oldX);
  assert.equal(paused.time, oldTime);
  const game = playing();
  game.lives = 1;
  game.player.x = game.enemies[0].x;
  advance(game, emptyInput(), 1.5);
  assert.equal(game.status, "gameover");
  assert.equal(game.lives, 0);
});

test("reaching the flag awards the timer bonus, and a new world carries run progress", () => {
  const game = playing();
  game.player.x = game.flagX;
  game.score = 400;
  game.coinCount = 2;
  stepGame(game, emptyInput(), 1 / 60);
  assert.equal(game.status, "won");
  assert.equal(game.score, 5400);
  const next = createGame(1, { score: game.score, coinCount: game.coinCount, lives: game.lives });
  assert.equal(next.score, 5400);
  assert.equal(next.coinCount, 2);
  assert.equal(next.lives, 3);
  assert.equal(next.world, 1);
  assert.equal(next.time, 400);
});

test("the camera follows within the bounds of a narrow mobile viewport", () => {
  const game = playing();
  game.viewportWidth = 540;
  game.player.x = 500;
  advance(game, emptyInput(), 1);
  assert.ok(Math.abs(game.camera - (500 - 540 * 0.32)) < 1);
  assert.ok(game.player.x - game.camera < game.viewportWidth);
});

test("all three level layouts can be traversed with running and jumping", () => {
  for (let world = 0; world < 3; world++) {
    const game = playing(world);
    // Isolate level geometry; enemy combat is covered separately above.
    game.enemies = [];
    const input = { ...emptyInput(), right: true, run: true };
    let lastJumpX = -100;
    let releaseFrames = 0;
    for (let frame = 0; frame < 60 * 60 && game.status === "playing"; frame++) {
      const p = game.player;
      const ahead = p.x + p.w;
      const pipe = game.pipes.some((r) => r.x >= ahead - 2 && r.x - ahead < 120 && r.y < p.y + p.h);
      const stair = game.blocks.some((b) => b.kind === "step" && b.x >= ahead - 2 && b.x - ahead < 70 && b.y < p.y + p.h);
      const surface = game.ground.find((g) => ahead >= g.x && ahead < g.x + g.w);
      const gap = surface && surface.x + surface.w - ahead < 80 && surface.x + surface.w < game.width;
      if (releaseFrames > 0) { input.jump = false; releaseFrames--; }
      else if (p.grounded && (pipe || stair || gap) && p.x - lastJumpX > 3) {
        input.jump = true;
        input.jumpPressed = true;
        lastJumpX = p.x;
      } else if (p.grounded && input.jump) { input.jump = false; releaseFrames = 1; }
      stepGame(game, input, 1 / 60);
    }
    assert.equal(game.status, "won", `World ${world + 1} must have a traversable route`);
    assert.equal(game.lives, 3);
  }
});
