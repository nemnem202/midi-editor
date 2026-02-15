import { Container, FederatedPointerEvent } from "pixi.js";

interface PanDeps {
  notesGrid: Container;
  pianoKeysContainer: Container;
  velocityContainer: Container;
  constrain: () => void;
  onAfterPan?: () => void;
}

export class PanController {
  private deps: PanDeps;
  private lastDragPos: { x: number; y: number } | null = null;

  constructor(deps: PanDeps) {
    this.deps = deps;
  }

  attach() {
    const { notesGrid } = this.deps;

    notesGrid.on("pointerdown", (e) => {
      if (e.button === 0 && e.altKey) {
        this.lastDragPos = { x: e.global.x, y: e.global.y };
      }
    });

    notesGrid.on("globalpointermove", (e) => {
      this.tryPan(e);
    });

    notesGrid.on("pointerup", () => (this.lastDragPos = null));
    notesGrid.on("pointerupoutside", () => (this.lastDragPos = null));
  }

  private tryPan(e: FederatedPointerEvent) {
    if (!this.lastDragPos) return;

    const { notesGrid, pianoKeysContainer, velocityContainer, constrain, onAfterPan } = this.deps;

    const dx = e.global.x - this.lastDragPos.x;
    const dy = e.global.y - this.lastDragPos.y;

    notesGrid.x += dx;
    notesGrid.y += dy;

    constrain();

    pianoKeysContainer.y = notesGrid.y;
    velocityContainer.x = notesGrid.x;

    this.lastDragPos = { x: e.global.x, y: e.global.y };

    onAfterPan?.();
  }
}
