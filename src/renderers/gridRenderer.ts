import type MidiEditorEngine from "../midiEditorEngine";
import { getSubdivisionTickInterval, grayFromScale } from "../lib/utils";
import { Graphics, Container } from "pixi.js";
import type { MidiObject } from "types/project";
import { BINARY_SUBDIVISIONS } from "@/config/constants";

interface GridRendererDeps {
  engine: MidiEditorEngine;
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
    const strategy = engine.strategy;
    const isPianoRoll = strategy.name === "pianoroll";

    graphics.clear();

    const totalDurationTicks = midiObject().durationInTicks;
    const ppq = midiObject().header.ppq;
    const signature = engine.project.config.signature;

    if (isPianoRoll) {
      const keyWidth = appScreen.width / 75;
      const rowHeight = appScreen.height / 75;

      let currentMidi = 0;

      for (let i = 0; i < 75; i++) {
        currentMidi += 1;
        if (![5, 0].includes(currentMidi % 12)) {
          const blackBounds = strategy.getBlackKeyBounds(i, rowHeight, keyWidth, 10);
          graphics
            .rect(
              blackBounds.x + blackBounds.width * 0.2,
              0,
              blackBounds.width * 0.6,
              totalDurationTicks,
            )
            .fill({ color: "#000000" });
          currentMidi += 1;
        }
      }
    } else {
      const rowHeight = appScreen.height / 75;
      graphics.rect(0, 0, totalDurationTicks, appScreen.height).fill({ color: "#131313" });

      for (let i = 0; i < 75; i++) {
        if (![2, 6].includes(i % 7)) {
          const yBase = (74 - i) * rowHeight - rowHeight / 2 + rowHeight * 0.1;
          graphics.rect(0, yBase, totalDurationTicks, rowHeight * 0.8).fill({ color: "#1a1a1a" });
        }
      }
    }

    const currentSub = engine.subdivision[0] / engine.subdivision[1];
    const subdivisionsToAdd = BINARY_SUBDIVISIONS.filter((sub) => sub[0] / sub[1] >= currentSub);
    subdivisionsToAdd.sort((a, b) => a[0] / a[1] - b[0] / b[1]);

    const measureTicks = ppq * 4 * (signature[0] / signature[1]);

    subdivisionsToAdd.forEach((s) => {
      if (s[0] / s[1] === 1) return;

      const currentScale = isPianoRoll ? notesGrid.scale.y : notesGrid.scale.x;
      const colorFactor = Math.min(
        3000,
        (s[0] / s[1]) ** 2 * 200 * Math.min(currentScale, 5) + 1700,
      );

      this.drawTimeLines(
        getSubdivisionTickInterval(ppq, s),
        grayFromScale(colorFactor),
        s[0] === 4 ? 20 : 80,
      );
    });

    this.drawTimeLines(measureTicks, "#ff00b33a", 20);
  }

  private drawTimeLines(tickStep: number, color: string, minGap: number) {
    const { graphics, notesGrid, appScreen, engine, constants } = this.deps;
    const isPianoRoll = engine.strategy.name === "pianoroll";

    const currentScale = isPianoRoll ? notesGrid.scale.y : notesGrid.scale.x;
    const gapInPixels = tickStep * currentScale;
    if (gapInPixels < minGap) return;

    const localTopLeft = notesGrid.toLocal({ x: 0, y: 0 });
    const localBottomRight = notesGrid.toLocal({ x: appScreen.width, y: appScreen.height });

    graphics.beginPath();

    if (isPianoRoll) {
      const startTick = Math.floor(localTopLeft.y / tickStep) * tickStep;
      for (let i = startTick; i <= localBottomRight.y; i += tickStep) {
        if (i < 0) continue;
        graphics.moveTo(0, i).lineTo(75 * (appScreen.width / 75), i);
      }
    } else {
      const startTick = Math.floor(localTopLeft.x / tickStep) * tickStep;
      for (let i = startTick; i <= localBottomRight.x; i += tickStep) {
        if (i < 0) continue;
        graphics.moveTo(i, 0).lineTo(i, appScreen.height);
      }
    }

    graphics.stroke({ color, pixelLine: true });
  }
}
