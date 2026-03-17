import { isBlackKey } from "@/lib/utils";
import type MidiEditorEngine from "@/midiEditorEngine";
import type { EditorStrategy, NoteGeometry } from "@/strategies/types";
import { Graphics, type Application, type Container } from "pixi.js";

interface KeyboardDeps {
  app: Application;
  engine: MidiEditorEngine;
  piano_keys_container: Container;
  constants: {
    PIANO_KEYS_WIDTH: number;
  };
}

export default class PianoKeyboardRenderer {
  private baseGraphics = new Graphics();
  private highlightGraphics = new Graphics();
  private keyPositions: Map<number, NoteGeometry> = new Map();

  constructor(private deps: KeyboardDeps) {
    this.deps.piano_keys_container.addChild(this.baseGraphics, this.highlightGraphics);
  }

  draw = () => {
    console.log("draw pianokeyboard");
    const { app, constants, engine } = this.deps;
    const strategy = engine.strategy;

    this.baseGraphics.clear();
    this.keyPositions.clear();

    const rowHeight = app.screen.height / 75;
    const keyWidth = app.screen.width / 75;
    const pianoSize = constants.PIANO_KEYS_WIDTH;

    const totalWidth = strategy.name === "classic" ? pianoSize : app.screen.width;
    const totalHeight = strategy.name === "classic" ? app.screen.height : pianoSize;
    this.baseGraphics.rect(0, 0, totalWidth, totalHeight).fill({ color: "#ffffff" });

    this.baseGraphics.beginPath();

    let currentMidi = 0;

    for (let i = 0; i < 75; i++) {
      this.drawWhiteNote(strategy, i, rowHeight, keyWidth, pianoSize, currentMidi);

      if (![4, 11].includes(currentMidi % 12)) currentMidi += 2;
      else currentMidi += 1;
    }
    this.baseGraphics.stroke({ color: "#000000", width: 0.5, pixelLine: true });
    currentMidi = 0;

    for (let i = 0; i < 75; i++) {
      currentMidi += 1;
      if (![5, 0].includes(currentMidi % 12)) {
        this.drawBlackNote(strategy, i, rowHeight, keyWidth, pianoSize, currentMidi);
        currentMidi += 1;
      }
    }

    this.updateHighlights(engine.curentlyPlayedNotes);
  };

  updateHighlights = (playedMidis: number[]) => {
    this.highlightGraphics.clear();

    playedMidis.forEach((midi) => {
      const bounds = this.keyPositions.get(midi);

      if (bounds) {
        this.highlightGraphics
          .rect(bounds.x, bounds.y, bounds.width, bounds.height)
          .fill({ color: "#44ff44" })
          .stroke({ color: "#000000", pixelLine: true });
      }
      if (!playedMidis.includes(midi - 1) && isBlackKey(midi - 1)) {
        const prevBounds = this.keyPositions.get(midi - 1);
        if (!prevBounds) return;
        this.highlightGraphics
          .rect(prevBounds.x, prevBounds.y, prevBounds.width, prevBounds.height)
          .fill({ color: "#000000" });
      }
      if (!playedMidis.includes(midi + 1) && isBlackKey(midi + 1)) {
        const nextBounds = this.keyPositions.get(midi + 1);
        if (!nextBounds) return;
        this.highlightGraphics
          .rect(nextBounds.x, nextBounds.y, nextBounds.width, nextBounds.height)
          .fill({ color: "#000000" });
      }
    });
  };

  drawWhiteNote(
    strategy: EditorStrategy,
    i: number,
    rowHeight: number,
    keyWidth: number,
    pianoSize: number,
    currentMidi: number,
  ) {
    const bounds = strategy.getWhiteKeyBounds(i, rowHeight, keyWidth, pianoSize);
    this.keyPositions.set(currentMidi, bounds);

    this.baseGraphics
      .moveTo(bounds.x, bounds.y)
      .lineTo(
        strategy.name === "classic" ? bounds.width : bounds.x,
        strategy.name === "classic" ? bounds.y : bounds.height,
      );
  }
  drawBlackNote(
    strategy: EditorStrategy,
    i: number,
    rowHeight: number,
    keyWidth: number,
    pianoSize: number,
    currentMidi: number,
  ) {
    const bounds = strategy.getBlackKeyBounds(i, rowHeight, keyWidth, pianoSize);
    this.keyPositions.set(currentMidi, bounds);

    this.baseGraphics
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .fill({ color: "#000000" });
  }
}
