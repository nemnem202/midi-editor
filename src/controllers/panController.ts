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

  tryPan(e: FederatedPointerEvent) {
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

  updateLastDragPos(e: FederatedPointerEvent) {
    this.lastDragPos = { x: e.global.x, y: e.global.y };
  }

  releaseLastDragPos() {
    this.lastDragPos = null;
  }
}
