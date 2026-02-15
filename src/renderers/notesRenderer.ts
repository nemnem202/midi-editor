import {
  DeleteNoteCommand,
  MoveNotesCommand,
  SelectNotesCommand,
  UpdateNotesPositionCommand,
  type Command,
} from "../commands";
import { colorFromValue } from "../lib/utils";
import { Container, Graphics } from "pixi.js";
import type { MidiObject, Note } from "types/project";

export class NoteGraphic extends Graphics {
  noteData!: Note;
}

interface NotesRendererDeps {
  container: Container<NoteGraphic>;
  notesGrid: Container;
  appScreen: { width: number; height: number };
  midiObject: () => MidiObject;
  onCommand: (command: Command<MidiObject>) => void;
  constants: {
    TOTAL_NOTES: number;
  };
}

export class NotesRenderer {
  private deps: NotesRendererDeps;

  constructor(deps: NotesRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { container, midiObject } = this.deps;

    container.removeChildren().forEach((child) => child.destroy());

    const rowHeight = this.getRowHeight();

    midiObject().tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const graphic = new NoteGraphic();

        graphic
          .rect(0, 0, note.durationTicks, rowHeight)
          .stroke({ color: "#000000", pixelLine: true });

        graphic.fill(colorFromValue(track.channel));

        graphic.x = note.ticks;
        graphic.y = (127 - note.midi) * rowHeight;

        graphic.eventMode = "static";
        graphic.cursor = "pointer";
        graphic.noteData = note;

        if (note.isSelected) {
          graphic.tint = "#ff0000";
        }

        this.attachEvents(graphic);
        container.addChild(graphic);
      });
    });
  }

  private getRowHeight() {
    return this.deps.appScreen.height / this.deps.constants.TOTAL_NOTES;
  }

  private attachEvents(graphic: NoteGraphic) {
    const { notesGrid, onCommand } = this.deps;

    let dragInitialStates: Map<NoteGraphic, { x: number; y: number }> | null = null;
    let dragStartMousePos: { x: number; y: number } | null = null;

    graphic.on("rightclick", (e) => {
      e.stopPropagation();
      onCommand(new DeleteNoteCommand(graphic.noteData));
    });

    const finalizeDrag = () => {
      if (!dragInitialStates) return;

      const rowHeight = this.getRowHeight();

      const moved = Array.from(dragInitialStates.entries()).map(([g, initial]) => ({
        note: g.noteData,
        ticks: g.x,
        midi: 127 - Math.round(g.y / rowHeight),
      }));

      onCommand(new UpdateNotesPositionCommand(moved));

      dragInitialStates = null;
      dragStartMousePos = null;
    };

    graphic.on("pointerup", finalizeDrag);
    graphic.on("pointerupoutside", finalizeDrag);

    graphic.on("globalpointermove", (e) => {
      if (!dragInitialStates || !dragStartMousePos) return;

      const rowHeight = this.getRowHeight();
      const currentMousePos = notesGrid.toLocal(e.global);

      let dx = currentMousePos.x - dragStartMousePos.x;
      const dy = currentMousePos.y - dragStartMousePos.y;

      dragInitialStates.forEach((initial) => {
        if (initial.x + dx < 0) dx = -initial.x;
      });

      dragInitialStates.forEach((initial, g) => {
        g.x = initial.x + dx;

        const rawY = initial.y + dy;
        g.y = Math.round(rawY / rowHeight) * rowHeight;
      });
    });

    graphic.on("pointerdown", (e) => {
      if (e.button === 2 || e.altKey) return;
      e.stopPropagation();

      if (!graphic.noteData.isSelected) {
        onCommand(new SelectNotesCommand([graphic.noteData]));
      }

      dragStartMousePos = notesGrid.toLocal(e.global);

      dragInitialStates = new Map();

      this.deps.container.children.forEach((child) => {
        if (child.noteData.isSelected) {
          dragInitialStates!.set(child, {
            x: child.x,
            y: child.y,
          });
        }
      });
    });
  }
}
