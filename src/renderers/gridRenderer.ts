import type PianoRollEngine from "@/pianoRollEngine";
import { getSubdivisionTickInterval } from "../lib/utils";
import { Graphics, Container } from "pixi.js";
import type { MidiObject } from "types/project";

interface GridRendererDeps {
  engine: PianoRollEngine;
  graphics: Graphics;
  notesGrid: Container;
  appScreen: { width: number; height: number };
  midiObject: () => MidiObject;
  constants: {
    TOTAL_NOTES: number;
    PIANO_KEYS_WIDTH: number;
  };
}

export class GridRenderer {
  private deps: GridRendererDeps;

  constructor(deps: GridRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { graphics, notesGrid, appScreen, midiObject, constants } = this.deps;

    graphics.clear();

    const rowHeight = appScreen.height / constants.TOTAL_NOTES;

    const currentScaleX = notesGrid.scale.x;

    const viewLeftTick = notesGrid.toLocal({
      x: constants.PIANO_KEYS_WIDTH,
      y: 0,
    }).x;

    const viewRightTick = notesGrid.toLocal({
      x: appScreen.width,
      y: 0,
    }).x;

    const visibleWidthTicks = viewRightTick - viewLeftTick;

    graphics.beginPath();

    for (let i = 0; i < constants.TOTAL_NOTES; i++) {
      const midi = 127 - i;
      if (this.isBlackKey(midi)) {
        graphics.rect(viewLeftTick, i * rowHeight, visibleWidthTicks, rowHeight);
      }
    }

    graphics.fill({ color: "#2c2c2c" });

    graphics.beginPath();
    for (let i = 0; i <= constants.TOTAL_NOTES; i++) {
      graphics.moveTo(viewLeftTick, i * rowHeight).lineTo(viewRightTick, i * rowHeight);
    }

    graphics.stroke({ color: "#222222", width: 1, pixelLine: true });

    const ppq = midiObject().header.ppq;

    this.drawSubdivisions(getSubdivisionTickInterval(ppq, [1, 1]), "#272727", 20);
    this.drawSubdivisions(getSubdivisionTickInterval(ppq, [2, 1]), "#2c2c2c", 20);
    this.drawSubdivisions(getSubdivisionTickInterval(ppq, [4, 1]), "#555555", 20);
  }

  private drawSubdivisions(tickStep: number, color: string, minGap: number) {
    const { graphics, notesGrid, appScreen, midiObject, constants } = this.deps;

    const currentScaleX = notesGrid.scale.x;
    const gapInPixels = tickStep * currentScaleX;
    if (gapInPixels < minGap) return;

    const viewLeftTick = notesGrid.toLocal({
      x: constants.PIANO_KEYS_WIDTH,
      y: 0,
    }).x;

    const viewRightTick = notesGrid.toLocal({
      x: appScreen.width,
      y: 0,
    }).x;

    graphics.beginPath();

    const firstVisibleTick = Math.floor(viewLeftTick / tickStep) * tickStep;

    for (let i = firstVisibleTick; i <= viewRightTick; i += tickStep) {
      if (i < 0 || i > midiObject().durationInTicks) continue;
      graphics.moveTo(i, 0).lineTo(i, appScreen.height);
    }

    graphics.stroke({ color, pixelLine: true });
  }

  private isBlackKey(midi: number) {
    return [1, 3, 6, 8, 10].includes(midi % 12);
  }
}
