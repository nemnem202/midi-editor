import { BINARY_SUBDIVISIONS } from "@/config/constants";
import { getSubdivisionTickInterval, grayFromScale } from "@/lib/utils";
import type PianoRollEngine from "@/pianoRollEngine";
import { Graphics, Container } from "pixi.js";
import type { MidiObject } from "types/project";

interface VelocityGridRendererDeps {
  engine: PianoRollEngine;
  graphics: Graphics;
  notesGrid: Container;
  appScreen: { width: number; height: number };
  midiObject: () => MidiObject;
  constants: {
    PIANO_KEYS_WIDTH: number;
    VELOCITY_ZONE_HEIGHT: number;
  };
}

export class VelocityGridRenderer {
  private deps: VelocityGridRendererDeps;

  constructor(deps: VelocityGridRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { graphics, notesGrid, appScreen, midiObject, constants, engine } = this.deps;

    graphics.clear();

    const currentScaleX = notesGrid.scale.x;

    const viewLeftTick = notesGrid.toLocal({
      x: constants.PIANO_KEYS_WIDTH,
      y: 0,
    }).x;

    const viewRightTick = notesGrid.toLocal({
      x: appScreen.width,
      y: 0,
    }).x;

    graphics.beginPath();
    graphics.rect(viewLeftTick, 0, viewRightTick - viewLeftTick, constants.VELOCITY_ZONE_HEIGHT);
    graphics.fill({ color: "#1a1a1a" });

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

      graphics.moveTo(i, 0).lineTo(i, constants.VELOCITY_ZONE_HEIGHT);
    }

    graphics.stroke({ color, pixelLine: true });
  }
}
