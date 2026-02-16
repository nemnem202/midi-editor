import { Container, Graphics, FederatedPointerEvent } from "pixi.js";
import type { Note, MidiObject } from "types/project";
import { SelectNotesCommand, UnSelectAllNotesCommand, type Command } from "../commands";
import type { NoteSprite } from "../pianoRollEngine";
import type PianoRollEngine from "../pianoRollEngine";

interface SelectionDeps {
  engine: PianoRollEngine;
  notesGrid: Container;
  notesContainer: Container<NoteSprite>;
  selectSquare: Graphics;
  triggerMidiCommand: (command: Command<MidiObject>) => void;
}

export class SelectionController {
  private deps: SelectionDeps;
  private selectionOrigin: { x: number; y: number } | null = null;

  constructor(deps: SelectionDeps) {
    this.deps = deps;
  }
  updateSelectionOrigin(e: FederatedPointerEvent) {
    const pos = e.getLocalPosition(this.deps.notesGrid);
    this.selectionOrigin = { x: pos.x, y: pos.y };
  }

  tryDrawSelection(e: FederatedPointerEvent) {
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

  finalize(e: FederatedPointerEvent) {
    if (!this.selectionOrigin) return;

    const { notesGrid, notesContainer, selectSquare, triggerMidiCommand } = this.deps;

    const pos = e.getLocalPosition(notesGrid);

    const selectionRect = {
      x: Math.min(pos.x, this.selectionOrigin.x),
      y: Math.min(pos.y, this.selectionOrigin.y),
      width: Math.abs(pos.x - this.selectionOrigin.x),
      height: Math.abs(pos.y - this.selectionOrigin.y),
    };

    const selected: Note[] = [];

    notesContainer.children.forEach((graphic) => {
      if (!graphic.noteData.isInCurrentTrack) return;
      const noteRect = {
        x: graphic.x,
        y: graphic.y,
        width: graphic.width,
        height: graphic.height,
      };

      if (
        this.rectsIntersect(selectionRect, noteRect) &&
        graphic.noteData.isInCurrentTrack &&
        !selected.includes(graphic.noteData)
      ) {
        selected.push(graphic.noteData);
      }
    });

    triggerMidiCommand(new SelectNotesCommand(selected));

    selectSquare.clear();
    this.selectionOrigin = null;
  }

  unselectAll() {
    this.deps.triggerMidiCommand(new UnSelectAllNotesCommand([]));
  }

  private rectsIntersect(a: any, b: any) {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }
}
