import type { Container, FederatedWheelEvent } from "pixi.js";
import type { MidiObject } from "types/project";

interface ViewportDeps {
  appScreen: { width: number; height: number };
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
    const { notesGrid, velocityContainer, pianoKeysContainer, midiObject, appScreen, constants } =
      this.deps;

    const worldPointerPos = { x: e.globalX, y: e.globalY };
    const localPointerPos = notesGrid.toLocal(worldPointerPos);

    const isZoomIn = e.deltaY < 0;
    const factor = isZoomIn ? this.ZOOM_FACTOR : 1 / this.ZOOM_FACTOR;

    if (e.ctrlKey) {
      notesGrid.scale.y = Math.min(
        Math.max(
          notesGrid.scale.y * factor,
          (appScreen.height - constants.VELOCITY_ZONE_HEIGHT) / appScreen.height,
        ),
        20,
      );
    } else {
      const minScaleX =
        (appScreen.width - constants.PIANO_KEYS_WIDTH) / midiObject().durationInTicks;

      const targetScaleX = notesGrid.scale.x * factor;
      notesGrid.scale.x = Math.max(targetScaleX, minScaleX);
    }

    const newWorldPointerPosition = notesGrid.toGlobal(localPointerPos);

    notesGrid.x -= newWorldPointerPosition.x - worldPointerPos.x;
    notesGrid.y -= newWorldPointerPosition.y - worldPointerPos.y;

    this.constrain();

    pianoKeysContainer.y = notesGrid.y;
    pianoKeysContainer.scale.y = notesGrid.scale.y;

    velocityContainer.x = notesGrid.x;
    velocityContainer.scale.x = notesGrid.scale.x;

    this.deps.onAfterTransform?.();
  }

  constrain() {
    const { notesGrid, midiObject, appScreen, constants } = this.deps;

    notesGrid.x = Math.min(notesGrid.x, constants.PIANO_KEYS_WIDTH);
    notesGrid.y = Math.min(notesGrid.y, 0);

    const contentWidth = midiObject().durationInTicks * notesGrid.scale.x;

    const minX = appScreen.width - contentWidth;
    notesGrid.x = Math.max(notesGrid.x, minX);

    const contentHeight = appScreen.height * notesGrid.scale.y;
    const minY = appScreen.height - contentHeight;

    notesGrid.y = Math.max(notesGrid.y, minY - constants.VELOCITY_ZONE_HEIGHT);
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
