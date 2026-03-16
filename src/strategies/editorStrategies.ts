import { Rectangle } from "pixi.js";
import type { Note } from "types/project";
import type { EditorStrategy } from "./types";

export class ClassicStrategy implements EditorStrategy {
  name = "classic" as const;
  interactive = true;
  showVelocity = true;
  showTracklist = true;

  getNoteBounds(note: Note, rowHeight: number) {
    return {
      x: note.ticks,
      y: (127 - note.midi) * rowHeight,
      width: note.durationTicks,
      height: rowHeight,
    };
  }

  getGridBounds(durationTicks: number, screen: { width: number; height: number }) {
    return new Rectangle(0, 0, durationTicks, screen.height);
  }
}

export class PianoRollStrategy implements EditorStrategy {
  name = "pianoroll" as const;
  interactive = false;
  showVelocity = false;
  showTracklist = false;

  getNoteBounds(note: Note, rowHeight: number) {
    const keyWidth = 10;
    return {
      x: note.midi * keyWidth,
      y: note.ticks,
      width: keyWidth,
      height: note.durationTicks,
    };
  }

  getGridBounds(durationTicks: number, screen: { width: number; height: number }) {
    return new Rectangle(0, 0, 128 * 10, durationTicks);
  }
}
