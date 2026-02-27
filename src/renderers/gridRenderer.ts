import type PianoRollEngine from "../pianoRollEngine";
import { getSubdivisionTickInterval, grayFromScale } from "../lib/utils";
import { Graphics, Container } from "pixi.js";
import type { MidiObject } from "types/project";
import { BINARY_SUBDIVISIONS } from "@/config/constants";

interface GridRendererDeps {
  engine: PianoRollEngine;
  graphics: Graphics;
  notesGrid: Container;
  appScreen: { width: number; height: number };
  midiObject: () => MidiObject;
  constants: {
    TOTAL_NOTES: number;
    PIANO_KEYS_WIDTH: number;
    VELOCITY_ZONE_HEIGHT: number;
  };
}

export class GridRenderer {
  private deps: GridRendererDeps;

  constructor(deps: GridRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { graphics, notesGrid, appScreen, midiObject, constants, engine } = this.deps;

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

    const totalDurationTicks = midiObject().durationInTicks;
    graphics.rect(0, 0, totalDurationTicks, appScreen.height).fill({ color: "#131313" });

    graphics.beginPath();

    for (let i = 0; i < constants.TOTAL_NOTES; i++) {
      const midi = 127 - i;
      if (this.isBlackKey(midi)) {
        graphics.rect(viewLeftTick, i * rowHeight, visibleWidthTicks, rowHeight);
      }
    }

    graphics.fill({ color: "#aaaaaa", alpha: 0.05 });

    graphics.beginPath();
    for (let i = 0; i <= constants.TOTAL_NOTES; i++) {
      graphics.moveTo(viewLeftTick, i * rowHeight).lineTo(viewRightTick, i * rowHeight);
    }

    graphics.stroke({ color: "#222222", width: 1, pixelLine: true });

    const ppq = midiObject().header.ppq;

    const currentSub = engine.subdivision[0] / engine.subdivision[1];
    const subdivisionsToAdd = BINARY_SUBDIVISIONS.filter((sub) => sub[0] / sub[1] >= currentSub);
    subdivisionsToAdd.sort((a, b) => a[0] / a[1] - b[0] / b[1]);
    subdivisionsToAdd.forEach((s) => {
      const colorFactor = Math.min(
        3000,
        (s[0] / s[1]) ** 2 * 200 * Math.min(notesGrid.scale.x, 5) + 1700,
      );
      this.drawSubdivisions(
        getSubdivisionTickInterval(ppq, s),
        grayFromScale(colorFactor),
        s[0] === 4 ? 20 : 80,
      );
    });
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
