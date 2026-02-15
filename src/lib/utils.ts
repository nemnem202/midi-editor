import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MidiObject, Note } from "types/project";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function grayFromScale(value: number): string {
  value = Math.min(10000, Math.max(0, value));

  const gray = Math.round((value / 10000) * 255);

  const hexGray = gray.toString(16).padStart(2, "0");
  return `#${hexGray}${hexGray}${hexGray}`;
}

export function colorFromValue(value: number, whitenPercent: number = 0): string {
  value = Math.max(0, value);

  let hue = (value * 137.508) % 360;

  const saturation = 95;
  const baseLightness = 55;

  // --- Exclusion du rouge (zone 340°–360° et 0°–20°) ---
  const RED_MIN = 340;
  const RED_MAX = 20;

  if (hue >= RED_MIN || hue <= RED_MAX) {
    // On pousse vers la limite la plus proche
    hue = hue <= 180 ? RED_MAX : RED_MIN;
  }

  // Clamp whiten
  const whiten = Math.min(Math.max(whitenPercent, 0), 100);

  // Interpolation vers blanc
  const lightness = baseLightness + (100 - baseLightness) * (whiten / 100);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function getMidiLength(midiObject: MidiObject): number {
  let midiLength = 0;
  const tracks = midiObject.tracks;
  for (let i = 0, tlen = tracks.length; i < tlen; i++) {
    const notes = tracks[i].notes;
    for (let j = 0, nlen = notes.length; j < nlen; j++) {
      const note = notes[j];
      const end = note.ticks + note.durationTicks;
      if (end > midiLength) midiLength = end;
    }
  }

  return midiLength;
}

export function getMidiLengthFromNotes(notes: Note[]): number {
  let midiLength = 0;
  for (let j = 0, nlen = notes.length; j < nlen; j++) {
    const note = notes[j];
    const end = note.ticks + note.durationTicks;
    if (end > midiLength) midiLength = end;
  }
  return midiLength;
}

export function findFirstNoteTick(notes: Note[]): number {
  let ticks = undefined;
  for (let j = 0, nlen = notes.length; j < nlen; j++) {
    const note = notes[j];
    if (!ticks || note.ticks < ticks) ticks = note.ticks;
  }
  return ticks ?? 0;
}
