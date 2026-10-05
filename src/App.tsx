import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createGame, emptyInput, stepGame, VIEW_HEIGHT, VIEW_WIDTH, WORLDS, type Game, type Sound } from "./game";
import renderGame from "./renderGame";

type IconName = "sound" | "muted" | "expand" | "pause" | "play" | "restart" | "arrow" | "close" | "help" | "lock" | "check" | "chevron";
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    sound: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
    muted: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m16 9 6 6m0-6-6 6" /></>,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="4" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
    restart: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.2.7-1.5 1.1-1.5 2M12 16h.01" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PixelArt({ kind, className = "" }: { kind: "mushroom" | "coin" | "heart" | "flag" | "star"; className?: string }) {
  return <svg className={`pixel-art ${className}`} width="28" height="28" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
    {kind === "mushroom" && <><path fill="#e45b40" d="M5 1h6v1h2v2h2v3h1v3H0V7h1V4h2V2h2z" /><path fill="#fff5db" d="M5 2h5v4H5zM1 6h3v3H1zM12 6h3v3h-3z" /><path fill="#f0cf94" d="M4 10h8v5H4zM5 15h6v1H5z" /><path fill="#4b4534" d="M6 11h1v2H6zM9 11h1v2H9z" /></>}
    {kind === "coin" && <><path fill="#ad7d31" d="M5 0h6v1h2v2h1v10h-1v2h-2v1H5v-1H3v-2H2V3h1V1h2z" /><path fill="#f5c95c" d="M5 1h6v2h2v10h-2v2H5v-2H3V3h2z" /><path fill="#fff0a4" d="M5 3h2v9H5zM7 2h3v1H7z" /><path fill="#cf9b3d" d="M9 4h2v8H9z" /></>}
    {kind === "heart" && <><path fill="#d95742" d="M2 2h4v1h1v1h2V3h1V2h4v1h1v1h1v5h-1v2h-2v2h-2v2H5v-2H3v-2H1V9H0V4h1V3h1z" /><path fill="#f78b6e" d="M2 4h3v1H2zM1 5h2v3H1z" /></>}
    {kind === "flag" && <><path fill="#7e8752" d="M3 2h2v14H3z" /><path fill="#e55b42" d="M5 2h9v1h-2v1h-2v1h2v1h2v1H5z" /><path fill="#ddb65c" d="M2 0h4v2H2zM1 14h6v2H1z" /></>}
    {kind === "star" && <><path fill="#e4b34c" d="M7 0h2v4h2v1h5v2h-2v2h-2v2h1v4h-2v-1H9v-1H7v1H5v1H3v-4h1V9H2V7H0V5h5V4h2z" /><path fill="#ffe79a" d="M7 3h2v4H5V6h2z" /><path fill="#5e5133" d="M6 8h1v3H6zM9 8h1v3H9z" /></>}
  </svg>;
}

function readStored(key: string, fallback: number) {
  try { const value = Number(localStorage.getItem(key)); return Number.isFinite(value) && value >= fallback ? value : fallback; }
  catch { return fallback; }
}

function snapshot(game: Game) {
  return { status: game.status, world: game.world, score: game.score, coins: game.coinCount, lives: game.lives, time: Math.ceil(game.time), progress: Math.min(100, game.player.x / game.flagX * 100) };
}

const controlKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW", "KeyZ", "KeyX", "ShiftLeft", "ShiftRight"]);

export default function App() {
  const gameRef = useRef(createGame());
  const inputRef = useRef(emptyInput());
  const heldRef = useRef(new Set<string>());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const modalElementRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [hud, setHud] = useState(() => snapshot(gameRef.current));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(true);
  const [best, setBest] = useState(() => readStored("mario-arcade-best", 0));
  const bestRef = useRef(best);
  const [unlocked, setUnlocked] = useState(() => Math.min(2, readStored("mario-arcade-world", 0)));
  const unlockedRef = useRef(unlocked);
  const [modal, setModal] = useState<"help" | "worlds" | null>(null);
  const modalRef = useRef<"help" | "worlds" | null>(null);
  const resumeAfterModal = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const endedRef = useRef<Game | null>(null);

  const playSound = useCallback((name: Sound) => {
    if (!soundRef.current) return;
    try {
      const audio = audioRef.current ?? (audioRef.current = new AudioContext());
      if (audio.state === "suspended") void audio.resume();
      const notes: Record<Sound, number[]> = {
        jump: [294, 440, 587], coin: [988, 1319], stomp: [160, 90], power: [262, 330, 392, 523],
        hurt: [392, 330, 247, 165], win: [523, 659, 784, 659, 784, 1047], block: [120],
      };
      const length = name === "win" ? 0.13 : name === "hurt" ? 0.11 : 0.065;
      notes[name].forEach((frequency, i) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + i * length;
        oscillator.type = name === "stomp" || name === "block" ? "triangle" : "square";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.025, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + length + 0.01);
      });
    } catch { /* The game remains playable if browser audio is unavailable. */ }
  }, []);

  const clearInput = useCallback(() => { heldRef.current.clear(); inputRef.current = emptyInput(); }, []);
  const syncInput = useCallback(() => {
    const keys = heldRef.current;
    const input = inputRef.current;
    input.left = keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("TouchLeft");
    input.right = keys.has("ArrowRight") || keys.has("KeyD") || keys.has("TouchRight");
    input.run = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyX") || keys.has("TouchRun");
    const jump = ["Space", "ArrowUp", "KeyW", "KeyZ", "TouchJump"].some((key) => keys.has(key));
    if (jump && !input.jump) input.jumpPressed = true;
    input.jump = jump;
  }, []);

  const startGame = useCallback((restart = false) => {
    if (restart || gameRef.current.status === "gameover" || gameRef.current.status === "won") gameRef.current = createGame(gameRef.current.world);
    gameRef.current.status = "playing";
    clearInput();
    setHud(snapshot(gameRef.current));
    canvasRef.current?.focus({ preventScroll: true });
    playSound("power");
  }, [clearInput, playSound]);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (game.status === "playing") game.status = "paused";
    else if (game.status === "paused") game.status = "playing";
    clearInput();
    setHud(snapshot(game));
    if (game.status === "playing") canvasRef.current?.focus({ preventScroll: true });
  }, [clearInput]);

  const nextWorld = useCallback(() => {
    const game = gameRef.current;
    gameRef.current = createGame((game.world + 1) % WORLDS.length, game.world < 2 ? { score: game.score, coinCount: game.coinCount, lives: game.lives } : undefined);
    gameRef.current.status = "playing";
    clearInput();
    setHud(snapshot(gameRef.current));
    canvasRef.current?.focus({ preventScroll: true });
    playSound("power");
  }, [clearInput, playSound]);

  const openModal = useCallback((type: "help" | "worlds") => {
    if (modalRef.current) return;
    resumeAfterModal.current = gameRef.current.status === "playing";
    if (resumeAfterModal.current) gameRef.current.status = "paused";
    clearInput();
    modalRef.current = type;
    setModal(type);
    setHud(snapshot(gameRef.current));
  }, [clearInput]);

  const closeModal = useCallback(() => {
    modalRef.current = null;
    setModal(null);
    if (resumeAfterModal.current && gameRef.current.status === "paused") gameRef.current.status = "playing";
    resumeAfterModal.current = false;
    clearInput();
    setHud(snapshot(gameRef.current));
  }, [clearInput]);

  const selectWorld = (index: number) => {
    if (index > unlockedRef.current) return;
    gameRef.current = createGame(index);
    resumeAfterModal.current = false;
    closeModal();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;
    context.imageSmoothingEnabled = false;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.round(bounds.width / bounds.height * VIEW_HEIGHT);
      if (width > 0 && width !== canvas.width) canvas.width = width;
      context.imageSmoothingEnabled = false;
      gameRef.current.viewportWidth = canvas.width;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    let frame = 0;
    let previous = 0;
    let accumulator = 0;
    let lastHudUpdate = 0;
    const animate = (now: number) => {
      gameRef.current.viewportWidth = canvas.width;
      const delta = previous ? Math.min((now - previous) / 1000, 0.08) : 0;
      previous = now;
      accumulator += delta;
      while (accumulator >= 1 / 60) {
        stepGame(gameRef.current, inputRef.current, 1 / 60, playSound);
        accumulator -= 1 / 60;
      }
      renderGame(context, gameRef.current);
      const game = gameRef.current;
      if ((game.status === "won" || game.status === "gameover") && endedRef.current !== game) {
        endedRef.current = game;
        if (game.score > bestRef.current) {
          bestRef.current = game.score;
          setBest(game.score);
          try { localStorage.setItem("mario-arcade-best", String(game.score)); } catch { /* Storage is optional. */ }
        }
        if (game.status === "won" && game.world < 2 && unlockedRef.current < game.world + 1) {
          unlockedRef.current = game.world + 1;
          setUnlocked(game.world + 1);
          try { localStorage.setItem("mario-arcade-world", String(game.world + 1)); } catch { /* Storage is optional. */ }
        }
      }
      if (now - lastHudUpdate > 100) { setHud(snapshot(game)); lastHudUpdate = now; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [playSound]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable)) return;
      if (modalRef.current) {
        if (event.code === "Escape") { event.preventDefault(); closeModal(); }
        return;
      }
      // Let native buttons keep their normal Enter/Space behavior.
      if (event.target instanceof HTMLElement && event.target.closest("button, a") && (event.code === "Enter" || (event.code === "Space" && !["playing", "paused"].includes(gameRef.current.status)))) return;
      if (controlKeys.has(event.code) || ["Enter", "Escape", "KeyP", "KeyR"].includes(event.code)) event.preventDefault();
      if (event.repeat && ["Enter", "Escape", "KeyP", "KeyR"].includes(event.code)) return;
      const status = gameRef.current.status;
      if ((event.code === "Escape" || event.code === "KeyP") && (status === "playing" || status === "paused")) { togglePause(); return; }
      if (event.code === "KeyR" && status !== "ready") { startGame(true); return; }
      if (event.code === "Enter" || event.code === "Space") {
        if (status === "won") { nextWorld(); return; }
        if (status === "ready" || status === "gameover" || status === "paused") { startGame(); return; }
      }
      if (status !== "playing") return;
      heldRef.current.add(event.code);
      syncInput();
    };
    const onKeyUp = (event: KeyboardEvent) => { heldRef.current.delete(event.code); syncInput(); };
    const onBlur = () => {
      clearInput();
      if (gameRef.current.status === "playing") { gameRef.current.status = "paused"; setHud(snapshot(gameRef.current)); }
    };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clearInput, closeModal, nextWorld, startGame, syncInput, togglePause]);

  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const element = modalElementRef.current;
    element?.querySelector<HTMLButtonElement>("button")?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !element) return;
      const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      if (gameRef.current.status === "playing") canvasRef.current?.focus({ preventScroll: true });
      else previousFocus?.focus();
    };
  }, [modal]);

  useEffect(() => {
    const onFullscreen = () => setExpanded(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (expanded) setExpanded(false);
    else if (cabinetRef.current?.requestFullscreen) {
      try { await cabinetRef.current.requestFullscreen(); } catch { setExpanded(true); }
    } else setExpanded(true);
  };

  const toggleSound = () => {
    soundRef.current = !soundRef.current;
    setSoundEnabled(soundRef.current);
    if (soundRef.current) playSound("coin");
    else if (audioRef.current?.state === "running") void audioRef.current.suspend();
  };

  const touchControl = (key: string, down: boolean, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (down) { event.currentTarget.setPointerCapture(event.pointerId); heldRef.current.add(key); }
    else heldRef.current.delete(key);
    syncInput();
  };

  const pad = (key: string, label: string, content: React.ReactNode, className = "") => <button className={`touch-button ${className}`} aria-label={label} onPointerDown={(e) => touchControl(key, true, e)} onPointerUp={(e) => touchControl(key, false, e)} onPointerCancel={(e) => touchControl(key, false, e)} onLostPointerCapture={() => { heldRef.current.delete(key); syncInput(); }}>{content}</button>;
  const showOverlay = ["ready", "paused", "gameover", "won"].includes(hud.status) && !modal;
  const isWon = hud.status === "won";

  return <div className="arcade-app">
    <header className="site-header">
      <a className="brand" href="#" aria-label="Super Mario Browser Arcade home" onClick={(event) => { event.preventDefault(); gameRef.current = createGame(); clearInput(); setHud(snapshot(gameRef.current)); }}>
        <span className="brand-mark"><PixelArt kind="mushroom" /></span>
        <span className="brand-type">SUPER MARIO<span>THE BROWSER ARCADE</span></span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        <button className="nav-link active" onClick={() => { if (modal) closeModal(); cabinetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Play<span className="nav-dot" /></button>
        <button className={`nav-link ${modal === "worlds" ? "selected" : ""}`} onClick={() => openModal("worlds")}>Worlds</button>
        <button className={`nav-link ${modal === "help" ? "selected" : ""}`} onClick={() => openModal("help")}>How to play</button>
      </nav>
      <button className={`sound-button ${!soundEnabled ? "is-muted" : ""}`} onClick={toggleSound} aria-label={soundEnabled ? "Mute game sound" : "Enable game sound"} aria-pressed={soundEnabled}><Icon name={soundEnabled ? "sound" : "muted"} size={18} /><span>Sound {soundEnabled ? "on" : "off"}</span><span className="sound-indicator" /></button>
    </header>

    <main className="main-content">
      <section className="intro" aria-labelledby="page-title">
        <div>
          <div className="eyebrow"><span className="tiny-star">✦</span> SAME MAGIC. NEW ADVENTURE.</div>
          <h1 id="page-title">Let’s-a <span>go!</span><svg className="title-spark" viewBox="0 0 35 42" fill="none" aria-hidden="true"><path d="m5 21 12-6M20 4l-3 8m14 16-11-5" stroke="currentColor" strokeWidth="4" strokeLinecap="square" /></svg></h1>
        </div>
        <div className="intro-right"><p>A familiar face. A whole new adventure.<br />Jump back into the Mushroom Kingdom.</p><span className="online-tag"><i /> FREE TO PLAY · NO DOWNLOAD NEEDED</span></div>
      </section>

      <section className="game-section" aria-label="Super Mario platformer">
        <div className="game-topline"><div className="world-label"><PixelArt kind="flag" /><span>WORLD 1–{hud.world + 1}</span><span className="world-separator">/</span><span className="world-name">{WORLDS[hud.world].name}</span></div><div className="best-label"><PixelArt kind="star" /><span>YOUR BEST <strong>{String(best).padStart(6, "0")}</strong></span></div></div>
        <div className={`game-cabinet ${expanded ? "is-expanded" : ""}`} ref={cabinetRef}>
          <div className="game-hud">
            <div className="hud-stat score-stat"><span className="hud-label">MARIO</span><strong>{String(hud.score).padStart(6, "0")}</strong></div>
            <div className="hud-stat coin-stat"><PixelArt kind="coin" /><strong><span className="multiply">×</span> {String(hud.coins).padStart(2, "0")}</strong></div>
            <div className="hud-stat lives-stat"><PixelArt kind="heart" /><strong><span className="multiply">×</span> {hud.lives}</strong></div>
            <div className="hud-stat time-stat"><span className="hud-label">TIME</span><strong className={hud.time < 60 ? "time-low" : ""}>{String(hud.time).padStart(3, "0")}</strong></div>
            <div className="hud-divider" />
            <div className="hud-actions"><button onClick={togglePause} disabled={!["playing", "paused"].includes(hud.status)} aria-label={hud.status === "paused" ? "Resume game" : "Pause game"} title="Pause · P"><Icon name={hud.status === "paused" ? "play" : "pause"} size={17} /></button><button onClick={() => startGame(true)} aria-label="Restart this world" title="Restart · R"><Icon name="restart" size={19} /></button><button onClick={toggleFullscreen} aria-label={expanded ? "Exit fullscreen" : "Play fullscreen"} title="Fullscreen"><Icon name="expand" size={18} /></button></div>
          </div>
          <div className="game-screen">
            <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} tabIndex={0} aria-label="Mario platformer. Move with arrow keys or A and D. Jump with Space. Hold Shift to run." onPointerDown={() => canvasRef.current?.focus()} />
            <div className="screen-texture" />
            {showOverlay && <div className={`game-overlay ${hud.status !== "ready" ? "dimmed" : ""}`}>
              <div className={`start-card ${isWon ? "win-card" : ""}`}>
                <div className="card-world-tag">{hud.status === "ready" ? `WORLD 1–${hud.world + 1}` : hud.status === "paused" ? "TAKE A BREATHER" : isWon ? "FLAG REACHED!" : "ONE MORE TRY?"}</div>
                {isWon ? <PixelArt kind="star" className="overlay-art" /> : hud.status === "gameover" ? <PixelArt kind="heart" className="overlay-art" /> : <PixelArt kind="mushroom" className="overlay-art" />}
                <h2>{hud.status === "ready" ? <>READY,<br />PLAYER ONE?</> : hud.status === "paused" ? <>BE RIGHT<br />BACK.</> : isWon ? <>WORLD<br />COMPLETE!</> : <>GAME<br />OVER.</>}</h2>
                <p>{hud.status === "ready" ? "A little jump. A big adventure." : hud.status === "paused" ? "Your adventure will be right here." : isWon ? (hud.world === 2 ? "The kingdom is yours. What a run!" : "Another world is waiting for you.") : "Every great run starts with a retry."}</p>
                {isWon && <div className="end-score">SCORE <strong>{String(hud.score).padStart(6, "0")}</strong></div>}
                <button className="primary-button start-button" onClick={() => { if (isWon) nextWorld(); else startGame(); }}><Icon name="play" size={16} />{hud.status === "ready" ? "LET’S-A GO!" : hud.status === "paused" ? "KEEP GOING" : isWon ? (hud.world === 2 ? "PLAY AGAIN" : "NEXT WORLD") : "TRY AGAIN"}<Icon name="arrow" size={18} /></button>
                <span className="enter-hint">or press <kbd>ENTER</kbd> to {isWon ? "continue" : hud.status === "paused" ? "resume" : "start"}</span>
              </div>
            </div>}
            {hud.status === "dying" && <div className="death-caption">Oops! Let’s try that again.</div>}
            <div className="world-progress" aria-hidden="true"><span style={{ width: `${hud.progress}%` }} /></div>
          </div>
          <div className="cabinet-bottom"><span><i /> {hud.status === "playing" ? "ADVENTURE IN PROGRESS" : hud.status === "won" ? "NICELY DONE, PLAYER ONE" : "GOOD TIMES, JUST ONE JUMP AWAY"}</span><span>1 PLAYER <span className="bottom-dot">·</span> 3 WORLDS <span className="bottom-dot">·</span> ENDLESS NOSTALGIA</span></div>
          <div className="touch-controls"><div className="touch-directions">{pad("TouchLeft", "Move left", "←")}{pad("TouchRight", "Move right", "→")}</div><div className="touch-actions">{pad("TouchRun", "Hold to run", "RUN", "run-pad")}{pad("TouchJump", "Jump", "JUMP", "jump-pad")}</div></div>
        </div>
      </section>

      <section className="controls-row" aria-label="Quick controls">
        <div className="control-item"><div className="key-group"><kbd>←</kbd><kbd>→</kbd></div><div><h3>Find your feet</h3><p>Arrow keys or A / D to move</p></div></div>
        <div className="control-item"><div className="key-group"><kbd className="wide-key">SPACE</kbd></div><div><h3>Aim a little higher</h3><p>Hold to jump higher. Stomp enemies.</p></div></div>
        <div className="control-item"><div className="key-group"><kbd className="wide-key">SHIFT</kbd></div><div><h3>Pick up the pace</h3><p>Hold while moving to sprint</p></div></div>
        <button className="help-button" onClick={() => openModal("help")} aria-label="Open full controls and tips"><Icon name="help" size={22} /></button>
      </section>

      <section className="adventure-strip"><div className="adventure-copy"><span className="adventure-icon"><PixelArt kind="coin" /></span><div><h3>A coin here. A mushroom there.</h3><p>Take the scenic route. There’s a little magic in every block.</p></div></div><button onClick={() => openModal("worlds")}>EXPLORE THE WORLDS <Icon name="arrow" size={18} /></button></section>
    </main>

    <footer className="site-footer"><span>Made for the kid in all of us.<span className="footer-heart"> ♥</span></span><span>LESS SCROLLING. MORE SIDE-SCROLLING.</span><span className="footer-credit">A fan-made browser adventure</span></footer>

    {modal && <div className="modal-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className={`modal ${modal === "worlds" ? "worlds-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalElementRef}>
      <button className="modal-close" onClick={closeModal} aria-label="Close dialog"><Icon name="close" /></button>
      <div className="eyebrow"><PixelArt kind={modal === "worlds" ? "flag" : "mushroom"} /> {modal === "worlds" ? "A LITTLE FURTHER, A LITTLE BRAVER" : "YOU’VE GOT THIS, PLAYER ONE"}</div>
      <h2 id="modal-title">{modal === "worlds" ? "Pick your adventure." : "Small jumps. Big things."}</h2>
      {modal === "worlds" ? <><p className="modal-intro">Reach the flag to unlock the next world. Your progress stays with you.</p><div className="world-cards">{WORLDS.map((world, index) => <button className={`world-card ${index > unlocked ? "locked" : ""} ${index === hud.world ? "current-world" : ""}`} key={world.name} onClick={() => selectWorld(index)} disabled={index > unlocked}>
        <div className={`world-thumbnail world-thumbnail-${index}`}><span className="mini-cloud" /><span className="mini-hill hill-one" /><span className="mini-hill hill-two" /><span className="mini-pipe" /><span className="mini-ground" />{index === 2 && <span className="mini-moon" />}{index > unlocked && <span className="world-lock"><Icon name="lock" size={22} /></span>}</div><div className="world-card-copy"><span>WORLD 1–{index + 1}</span><h3>{world.name}</h3><p>{world.subtitle}</p><div className="world-card-action">{index > unlocked ? `COMPLETE WORLD 1–${index}` : "LET’S EXPLORE"}<Icon name={index > unlocked ? "lock" : "arrow"} size={16} /></div></div>
      </button>)}</div></> : <><p className="modal-intro">Get to the flag, collect a few coins, and enjoy the journey.</p><div className="full-controls"><div><span>Move left / right</span><span><kbd>←</kbd> <kbd>→</kbd> <small>or</small> <kbd>A</kbd> <kbd>D</kbd></span></div><div><span>Jump <small>hold for more height</small></span><span><kbd>SPACE</kbd> <small>or</small> <kbd>W</kbd></span></div><div><span>Run faster</span><span><kbd>SHIFT</kbd> <small>or</small> <kbd>X</kbd></span></div><div><span>Pause / restart</span><span><kbd>P</kbd> <small>/</small> <kbd>R</kbd></span></div></div><div className="tips-grid"><div><PixelArt kind="coin" /><p><strong>Leave no coin behind.</strong> Each coin is worth 200 points. Collect 100 for an extra life.</p></div><div><PixelArt kind="mushroom" /><p><strong>A little growing room.</strong> Hit ? blocks from below. Mushrooms make you bigger and protect you from one hit.</p></div><div><PixelArt kind="flag" /><p><strong>Keep your eyes on the flag.</strong> Jump on enemies to defeat them, avoid the gaps, and reach the end before time runs out.</p></div></div><button className="primary-button modal-play" onClick={closeModal}>GOT IT. LET’S GO! <Icon name="arrow" size={18} /></button></>}
    </div></div>}
  </div>;
}
