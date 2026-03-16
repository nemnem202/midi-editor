import type MidiEditorEngine from "../midiEditorEngine";
import { getSubdivisionTickInterval, grayFromScale } from "../lib/utils";
import { Graphics, Container } from "pixi.js";
import type { MidiObject } from "types/project";
import { BINARY_SUBDIVISIONS } from "@/config/constants";

// TODO the grid is not correct, 2/1 instead of 1/1

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

  // draw() {
  //   const { graphics, notesGrid, appScreen, midiObject, constants, engine } = this.deps;
  //   const strategy = engine.strategy;
  //   const isPianoRoll = strategy.name === "pianoroll";

  //   graphics.clear();

  //   const rowHeight = appScreen.height / constants.TOTAL_NOTES;

  //   const totalDurationTicks = midiObject().durationInTicks;
  //   const ppq = midiObject().header.ppq;
  //   const signature = engine.project.config.signature;

  //   const viewLeftTick = notesGrid.toLocal({
  //     x: constants.PIANO_KEYS_WIDTH,
  //     y: 0,
  //   }).x;

  //   const viewRightTick = notesGrid.toLocal({
  //     x: appScreen.width,
  //     y: 0,
  //   }).x;

  //   const visibleWidthTicks = viewRightTick - viewLeftTick;

  //   graphics.rect(0, 0, totalDurationTicks, appScreen.height).fill({ color: "#131313" });

  //   graphics.beginPath();

  //   for (let i = 0; i < constants.TOTAL_NOTES; i++) {
  //     const midi = 127 - i;
  //     if (this.isBlackKey(midi)) {
  //       graphics.rect(viewLeftTick, i * rowHeight, visibleWidthTicks, rowHeight);
  //     }
  //   }

  //   graphics.fill({ color: "#aaaaaa", alpha: 0.05 });

  //   graphics.beginPath();
  //   for (let i = 0; i <= constants.TOTAL_NOTES; i++) {
  //     graphics.moveTo(viewLeftTick, i * rowHeight).lineTo(viewRightTick, i * rowHeight);
  //   }

  //   graphics.stroke({ color: "#222222", width: 1, pixelLine: true });

  //   const currentSub = engine.subdivision[0] / engine.subdivision[1];
  //   const subdivisionsToAdd = BINARY_SUBDIVISIONS.filter((sub) => sub[0] / sub[1] >= currentSub);
  //   subdivisionsToAdd.sort((a, b) => a[0] / a[1] - b[0] / b[1]);

  //   const measureTicks = ppq * 4 * (signature[0] / signature[1]);

  //   subdivisionsToAdd.forEach((s) => {
  //     if (s[0] / s[1] === 1) return;
  //     const colorFactor = Math.min(
  //       3000,
  //       (s[0] / s[1]) ** 2 * 200 * Math.min(notesGrid.scale.x, 5) + 1700,
  //     );

  //     this.drawSubdivisions(
  //       getSubdivisionTickInterval(ppq, s),
  //       grayFromScale(colorFactor),
  //       s[0] === 4 ? 20 : 80,
  //     );
  //   });

  //   this.drawSubdivisions(measureTicks, "#ff00b33a", 20);
  // }

  draw() {
    const { graphics, notesGrid, appScreen, midiObject, constants, engine } = this.deps;
    const strategy = engine.strategy;
    const isPianoRoll = strategy.name === "pianoroll";

    graphics.clear();

    const totalDurationTicks = midiObject().durationInTicks;
    const ppq = midiObject().header.ppq;
    const signature = engine.project.config.signature;

    // 1. DESSIN DU FOND ET DES TOUCHES NOIRES
    if (isPianoRoll) {
      const keyWidth = appScreen.width / 75;
      // Fond total
      graphics.rect(0, 0, appScreen.width, totalDurationTicks).fill({ color: "#131313" });

      // Coloration des colonnes des touches noires
      for (let i = 0; i < 75; i++) {
        if (![2, 6].includes(i % 7)) {
          // Logique identique à ton clavier
          const xBase = i * keyWidth + keyWidth / 2 + keyWidth * 0.1;
          graphics.rect(xBase, 0, keyWidth * 0.8, totalDurationTicks).fill({ color: "#1a1a1a" });
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

    // 2. DESSIN DES SUBDIVISIONS DE TEMPS
    const currentSub = engine.subdivision[0] / engine.subdivision[1];
    const subdivisionsToAdd = BINARY_SUBDIVISIONS.filter((sub) => sub[0] / sub[1] >= currentSub);
    subdivisionsToAdd.sort((a, b) => a[0] / a[1] - b[0] / b[1]);

    const measureTicks = ppq * 4 * (signature[0] / signature[1]);

    subdivisionsToAdd.forEach((s) => {
      if (s[0] / s[1] === 1) return;

      // On utilise le scale de l'axe temporel approprié
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

    // Lignes de mesure (en rose/rouge)
    this.drawTimeLines(measureTicks, "#ff00b33a", 20);
  }

  // private drawSubdivisions(tickStep: number, color: string, minGap: number) {
  //   const { graphics, notesGrid, appScreen, midiObject, constants } = this.deps;

  //   const currentScaleX = notesGrid.scale.x;
  //   const gapInPixels = tickStep * currentScaleX;
  //   if (gapInPixels < minGap) return;

  //   const viewLeftTick = notesGrid.toLocal({
  //     x: constants.PIANO_KEYS_WIDTH,
  //     y: 0,
  //   }).x;

  //   const viewRightTick = notesGrid.toLocal({
  //     x: appScreen.width,
  //     y: 0,
  //   }).x;

  //   graphics.beginPath();

  //   const firstVisibleTick = Math.floor(viewLeftTick / tickStep) * tickStep;

  //   for (let i = firstVisibleTick; i <= viewRightTick; i += tickStep) {
  //     if (i < 0 || i > midiObject().durationInTicks) continue;
  //     graphics.moveTo(i, 0).lineTo(i, appScreen.height);
  //   }

  //   graphics.stroke({ color, pixelLine: true });
  // }

  private drawTimeLines(tickStep: number, color: string, minGap: number) {
    const { graphics, notesGrid, appScreen, engine, constants } = this.deps;
    const isPianoRoll = engine.strategy.name === "pianoroll";

    const currentScale = isPianoRoll ? notesGrid.scale.y : notesGrid.scale.x;
    const gapInPixels = tickStep * currentScale;
    if (gapInPixels < minGap) return;

    // Calcul de la zone visible selon l'axe
    const localTopLeft = notesGrid.toLocal({ x: 0, y: 0 });
    const localBottomRight = notesGrid.toLocal({ x: appScreen.width, y: appScreen.height });

    graphics.beginPath();

    if (isPianoRoll) {
      // Lignes HORIZONTALES (Temps sur Y)
      const startTick = Math.floor(localTopLeft.y / tickStep) * tickStep;
      for (let i = startTick; i <= localBottomRight.y; i += tickStep) {
        if (i < 0) continue;
        graphics.moveTo(0, i).lineTo(75 * (appScreen.width / 75), i);
      }
    } else {
      // Lignes VERTICALES (Temps sur X)
      const startTick = Math.floor(localTopLeft.x / tickStep) * tickStep;
      for (let i = startTick; i <= localBottomRight.x; i += tickStep) {
        if (i < 0) continue;
        graphics.moveTo(i, 0).lineTo(i, appScreen.height);
      }
    }

    graphics.stroke({ color, pixelLine: true });
  }

  private isBlackKey(midi: number) {
    return [1, 3, 6, 8, 10].includes(midi % 12);
  }
}
