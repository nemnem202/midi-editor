import type MidiEditorEngine from "@/midiEditorEngine";
import type { Container, FederatedWheelEvent } from "pixi.js";
import type { MidiObject } from "types/project";

interface ViewportDeps {
  appScreen: { width: number; height: number };
  engine: MidiEditorEngine;
  notesGrid: Container;
  velocityContainer: Container;
  pianoKeysContainer: Container;
  midiObject: () => MidiObject;
  constants: {
    PIANO_KEYS_WIDTH: number;
    VELOCITY_ZONE_HEIGHT: number;
  };
  onAfterTransform?: () => void;
}

export default class ViewportController {
  private deps: ViewportDeps;
  private ZOOM_FACTOR = 1.2;

  constructor(deps: ViewportDeps) {
    this.deps = deps;
  }

  handleZoom(e: FederatedWheelEvent) {
    const {
      notesGrid,
      velocityContainer,
      pianoKeysContainer,
      midiObject,
      appScreen,
      constants,
      engine,
    } = this.deps;

    const isPianoRoll = engine.strategy.name === "pianoroll";

    const availableWidth = isPianoRoll
      ? appScreen.width
      : appScreen.width - constants.PIANO_KEYS_WIDTH;

    const availableHeight = isPianoRoll
      ? appScreen.height - constants.PIANO_KEYS_WIDTH
      : appScreen.height - constants.VELOCITY_ZONE_HEIGHT;

    const worldPointerPos = { x: e.globalX, y: e.globalY };
    const localPointerPos = notesGrid.toLocal(worldPointerPos);

    const isZoomIn = e.deltaY < 0;
    const factor = isZoomIn ? this.ZOOM_FACTOR : 1 / this.ZOOM_FACTOR;

    if (e.ctrlKey) {
      let minScaleY;
      if (isPianoRoll) {
        minScaleY = availableHeight / midiObject().durationInTicks;
      } else {
        minScaleY = availableHeight / appScreen.height;
      }

      const targetScaleY = notesGrid.scale.y * factor;
      notesGrid.scale.y = Math.max(targetScaleY, minScaleY);
    } else {
      let minScaleX;
      if (isPianoRoll) {
        minScaleX = 1;
      } else {
        minScaleX = availableWidth / midiObject().durationInTicks;
      }

      const targetScaleX = notesGrid.scale.x * factor;
      notesGrid.scale.x = Math.max(targetScaleX, minScaleX);
    }

    const newWorldPointerPosition = notesGrid.toGlobal(localPointerPos);
    notesGrid.x -= newWorldPointerPosition.x - worldPointerPos.x;
    notesGrid.y -= newWorldPointerPosition.y - worldPointerPos.y;

    this.constrain();

    if (isPianoRoll) {
      pianoKeysContainer.scale.x = notesGrid.scale.x;
      pianoKeysContainer.x = notesGrid.x;

      pianoKeysContainer.y = appScreen.height - constants.PIANO_KEYS_WIDTH;
      pianoKeysContainer.scale.y = 1;
    } else {
      pianoKeysContainer.y = notesGrid.y;
      pianoKeysContainer.scale.y = notesGrid.scale.y;
      pianoKeysContainer.x = 0;
      pianoKeysContainer.scale.x = 1;

      velocityContainer.x = notesGrid.x;
      velocityContainer.scale.x = notesGrid.scale.x;
    }

    this.deps.onAfterTransform?.();
  }

  constrain() {
    const { notesGrid, midiObject, appScreen, constants, engine } = this.deps;
    const isPianoRoll = engine.strategy.name === "pianoroll";

    if (isPianoRoll) {
      const contentWidth = appScreen.width * notesGrid.scale.x;
      const minX = appScreen.width - contentWidth;

      notesGrid.x = Math.max(Math.min(notesGrid.x, 0), minX);

      const contentHeight = midiObject().durationInTicks * notesGrid.scale.y;

      const gridVisibleHeight = appScreen.height - constants.PIANO_KEYS_WIDTH;
      const minY = gridVisibleHeight - contentHeight;

      notesGrid.y = Math.max(Math.min(notesGrid.y, 0), minY);
    } else {
      const contentWidth = midiObject().durationInTicks * notesGrid.scale.x;

      const minX = appScreen.width - contentWidth;
      notesGrid.x = Math.max(notesGrid.x, minX);

      const contentHeight = appScreen.height * notesGrid.scale.y;
      const minY = appScreen.height - contentHeight;

      notesGrid.y = Math.max(notesGrid.y, minY - constants.VELOCITY_ZONE_HEIGHT);

      notesGrid.x = Math.min(notesGrid.x, constants.PIANO_KEYS_WIDTH);
      notesGrid.y = Math.min(notesGrid.y, 0);
    }
  }

  updateMidiSize() {
    const { notesGrid, velocityContainer, midiObject, appScreen, constants } = this.deps;

    const minScaleX = (appScreen.width - constants.PIANO_KEYS_WIDTH) / midiObject().durationInTicks;

    if (notesGrid.scale.x < minScaleX) {
      notesGrid.scale.x = minScaleX;
    }

    const contentWidth = midiObject().durationInTicks * notesGrid.scale.x;

    const minX = appScreen.width - contentWidth;

    notesGrid.x = Math.max(Math.min(notesGrid.x, constants.PIANO_KEYS_WIDTH), minX);

    velocityContainer.x = notesGrid.x;
    velocityContainer.scale.x = notesGrid.scale.x;
  }
}
