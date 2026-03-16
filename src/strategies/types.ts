import type { Note } from "types/project";

export interface NoteGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditorStrategy {
  name: "classic" | "pianoroll";

  // Configuration de base
  interactive: boolean;
  showVelocity: boolean;
  showTracklist: boolean;

  // Coordonnées et Layout
  getNoteGeometry(note: Note, rowHeight: number, keyWidth: number): NoteGeometry;
  getKeyBounds(
    index: number,
    rowHeight: number,
    keyWidth: number,
    pianoHeight: number,
  ): NoteGeometry;
  getPitchAxis(): "x" | "y";
  getTimeAxis(): "x" | "y";

  getWhiteKeyBounds(
    midi: number,
    rowHeight: number,
    keyWidth: number,
    pianoSize: number,
  ): NoteGeometry;
  getBlackKeyBounds(
    midi: number,
    rowHeight: number,
    keyWidth: number,
    pianoSize: number,
  ): NoteGeometry;
}
