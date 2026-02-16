import { Application, Container, Graphics, Rectangle } from "pixi.js";
import type { MidiObject } from "types/project";

interface LayoutDeps {
  app: Application;
  rootDiv: HTMLDivElement;
  notesGrid: Container;
  pianoKeysContainer: Container;
  velocityContainer: Container;
  mainMask: Graphics;
  velocityMask: Graphics;
  pianoRollBg: Graphics;
  velocityBg: Graphics;
  midiObject: () => MidiObject;
  constants: {
    PIANO_KEYS_WIDTH: number;
    VELOCITY_ZONE_HEIGHT: number;
    VELOCITY_ZONE_GAP: number;
    CORNER_RADIUS: number;
  };
  onResize?: () => void;
}

export class LayoutManager {
  private deps: LayoutDeps;

  constructor(deps: LayoutDeps) {
    this.deps = deps;
  }

  init() {
    this.resizeOnInit();
    this.updateMask();
    this.attachResize();
  }

  private resizeOnInit() {
    const { app, notesGrid, velocityContainer, midiObject, constants } = this.deps;

    const availableWidth = app.screen.width - constants.PIANO_KEYS_WIDTH;

    const initialScaleX = availableWidth / midiObject().durationInTicks;

    notesGrid.scale.set(initialScaleX, 1);
    notesGrid.position.set(constants.PIANO_KEYS_WIDTH, 0);

    velocityContainer.scale.set(initialScaleX, 1);
    velocityContainer.position.set(
      constants.PIANO_KEYS_WIDTH,
      app.screen.height - constants.VELOCITY_ZONE_HEIGHT + constants.VELOCITY_ZONE_GAP,
    );
  }

  private attachResize() {
    this.deps.app.renderer.on("resize", () => {
      this.resizeOnInit();
      this.updateMask();
      this.updateHitbox();

      this.deps.pianoKeysContainer.y = this.deps.notesGrid.y;

      this.deps.pianoKeysContainer.scale.y = this.deps.notesGrid.scale.y;

      this.deps.onResize?.();
    });
  }

  updateMask() {
    const { app, mainMask, velocityMask, pianoRollBg, velocityBg, constants } = this.deps;

    const w = app.screen.width;
    const h = app.screen.height - constants.VELOCITY_ZONE_HEIGHT;
    const v_h = constants.VELOCITY_ZONE_HEIGHT - constants.VELOCITY_ZONE_GAP;

    pianoRollBg
      .clear()
      .roundRect(0, 0, w, h, constants.CORNER_RADIUS)
      .stroke({ color: "#161616", alignment: 1, width: 1 });

    mainMask.clear().roundRect(0, 0, w, h, constants.CORNER_RADIUS).fill(0xffffff);

    velocityBg
      .clear()
      .roundRect(
        constants.PIANO_KEYS_WIDTH,
        h + constants.VELOCITY_ZONE_GAP,
        w - constants.PIANO_KEYS_WIDTH,
        v_h,
        constants.CORNER_RADIUS,
      )
      .stroke({ color: "#161616", alignment: 1, width: 1 });

    velocityMask
      .clear()
      .roundRect(
        constants.PIANO_KEYS_WIDTH,
        h + constants.VELOCITY_ZONE_GAP,
        w - constants.PIANO_KEYS_WIDTH,
        v_h,
        constants.CORNER_RADIUS,
      )
      .fill(0xffffff);
  }

  updateHitbox() {
    const { notesGrid, app } = this.deps;

    const topLeft = notesGrid.toLocal({ x: 0, y: 0 });
    const bottomRight = notesGrid.toLocal({
      x: app.screen.width,
      y: app.screen.height,
    });

    notesGrid.hitArea = new Rectangle(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );
  }
}
