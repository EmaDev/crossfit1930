"use client";

/**
 * Señales sonoras del timer (cuenta 3-2-1, cambio de intervalo, fin) con Web
 * Audio puro: sin archivos de audio que descargar, funciona offline.
 *
 * Un solo `AudioContext` reutilizado (crear uno por beep tiene latencia y la
 * mayoría de los navegadores limita cuántos se pueden tener vivos); se crea
 * recién al primer beep porque necesita un gesto del usuario para arrancar
 * "unlocked" en iOS Safari.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, durationMs: number, volume = 0.2) {
  const audio = getCtx();
  if (!audio) return;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(audio.destination);

  const startAt = audio.currentTime;
  const endAt = startAt + durationMs / 1000;
  // Fade-out corto para no cortar el sonido en seco (clicks).
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, endAt);

  osc.start(startAt);
  osc.stop(endAt);
}

/** Beep corto de la cuenta 3-2-1. */
export function beepCountdown() {
  tone(880, 110);
}

/** Tono más grave y largo: arranca un intervalo/ronda nueva. */
export function beepTransition() {
  tone(660, 220);
}

/** Doble tono agudo: fin del timer. */
export function beepFinish() {
  tone(988, 160);
  setTimeout(() => tone(1320, 260), 180);
}
