import { Container, Graphics, FederatedPointerEvent } from "pixi.js";
import type { Note, MidiObject } from "types/project";
import { SelectNotesCommand, UnSelectAllNotesCommand, type Command } from "../commands";
import type { NoteGraphic } from "../renderers/notesRenderer";

interface SelectionDeps {
  notesGrid: Container;
  notesContainer: Container<NoteGraphic>;
  selectSquare: Graphics;
  onCommand: (command: Command<MidiObject>) => void;
}

export class SelectionController {
  private deps: SelectionDeps;
  private selectionOrigin: { x: number; y: number } | null = null;

  constructor(deps: SelectionDeps) {
    this.deps = deps;
  }

  attach() {
    const { notesGrid } = this.deps;

    notesGrid.on("rightdown", (e) => {
      console.log("right down");
      const pos = e.getLocalPosition(notesGrid);
      this.selectionOrigin = { x: pos.x, y: pos.y };
    });

    notesGrid.on("pointerdown", () => {
      this.deps.onCommand(new UnSelectAllNotesCommand([]));
    });

    notesGrid.on("globalpointermove", (e) => {
      this.tryDrawSelection(e);
    });

    notesGrid.on("pointerup", (e) => this.finalize(e));
    notesGrid.on("pointerupoutside", (e) => this.finalize(e));
  }

  private tryDrawSelection(e: FederatedPointerEvent) {
    if (!this.selectionOrigin) return;

    const { notesGrid, selectSquare } = this.deps;
    const pos = e.getLocalPosition(notesGrid);

    const rect = {
      x: Math.min(pos.x, this.selectionOrigin.x),
      y: Math.min(pos.y, this.selectionOrigin.y),
      width: Math.abs(pos.x - this.selectionOrigin.x),
      height: Math.abs(pos.y - this.selectionOrigin.y),
    };

    selectSquare
      .clear()
      .rect(rect.x, rect.y, rect.width, rect.height)
      .fill({ color: 0xffffff, alpha: 0.3 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
  }

  private finalize(e: FederatedPointerEvent) {
    if (!this.selectionOrigin) return;

    const { notesGrid, notesContainer, selectSquare, onCommand } = this.deps;

    const pos = e.getLocalPosition(notesGrid);

    const selectionRect = {
      x: Math.min(pos.x, this.selectionOrigin.x),
      y: Math.min(pos.y, this.selectionOrigin.y),
      width: Math.abs(pos.x - this.selectionOrigin.x),
      height: Math.abs(pos.y - this.selectionOrigin.y),
    };

    const selected: Note[] = [];

    notesContainer.children.forEach((graphic) => {
      const noteRect = {
        x: graphic.x,
        y: graphic.y,
        width: graphic.width,
        height: graphic.height,
      };

      if (this.rectsIntersect(selectionRect, noteRect)) {
        selected.push(graphic.noteData);
      }
    });

    onCommand(new SelectNotesCommand(selected));

    selectSquare.clear();
    this.selectionOrigin = null;
  }

  private rectsIntersect(a: any, b: any) {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }
}
