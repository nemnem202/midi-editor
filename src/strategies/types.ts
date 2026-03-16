import type { Note } from "types/project";
import type { Rectangle } from "pixi.js";

export interface EditorStrategy {
  name: "classic" | "pianoroll";

  // Configuration de base
  interactive: boolean;
  showVelocity: boolean;
  showTracklist: boolean;

  // Coordonnées et Layout
  getNoteBounds(
    note: Note,
    rowHeight: number,
  ): { x: number; y: number; width: number; height: number };
  getGridBounds(durationTicks: number, screen: { width: number; height: number }): Rectangle;
}
