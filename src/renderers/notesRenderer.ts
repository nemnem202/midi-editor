import type PianoRollEngine from "../pianoRollEngine";
import {
  DeleteNoteCommand,
  SelectNotesCommand,
  UpdateNotesCommand,
  type Command,
} from "../commands";
import { colorFromValue, getNearestSubdivisionRoundedTick, grayFromScale } from "../lib/utils";
import { Container, FederatedPointerEvent, Graphics, Texture } from "pixi.js";
import type { MidiObject, Note } from "types/project";
import { NoteSprite } from "../pianoRollEngine";

// export class NoteSprite extends Graphics {
//   noteData!: Note;
// }

interface NotesRendererDeps {
  engine: PianoRollEngine;
  container: Container<NoteSprite>;
  notesGrid: Container;
  appScreen: { width: number; height: number };
  midiObject: () => MidiObject;
  triggerMidiCommand: (command: Command<MidiObject>) => void;
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
    const { container, midiObject, engine } = this.deps;
    const rowHeight = this.getRowHeight();

    const allNotes = midiObject().tracks.flatMap((track, index) =>
      track.notes.map((note) => ({
        note: { ...note, isInCurrentTrack: index === engine.project.config.displayedTrackIndex },
        channel: track.channel,
      })),
    );

    allNotes.sort((a, b) => {
      if (a.note.isSelected === b.note.isSelected && !a.note.isInCurrentTrack) return 0;
      return a.note.isInCurrentTrack ? 1 : -1;
    });

    container.removeChildren().forEach((child) => child.destroy());

    allNotes.forEach(({ note, channel }) => {
      const sprite = new NoteSprite({ texture: Texture.WHITE });

      // sprite
      //   .rect(0, 0, note.durationTicks, rowHeight)
      //   .stroke({ color: "#000000", pixelLine: true });

      sprite.width = note.durationTicks;
      sprite.height = rowHeight;
      sprite.x = note.ticks;
      sprite.y = (127 - note.midi) * rowHeight;
      sprite.noteData = note;
      sprite.eventMode = "static";
      sprite.alpha = 1;
      if (!note.isInCurrentTrack) {
        sprite.alpha = 0.3;
        sprite.eventMode = "none";
        sprite.tint = colorFromValue(channel);
        return container.addChild(sprite);
      }

      if (note.isSelected) {
        // sprite.tint({ color:  });
        sprite.tint = "#ff0000";
      } else {
        sprite.tint = colorFromValue(channel);
      }

      this.attachEvents(sprite);
      container.addChild(sprite);
    });
  }

  private getRowHeight() {
    return this.deps.appScreen.height / this.deps.constants.TOTAL_NOTES;
  }

  private attachEvents(graphic: NoteSprite) {
    const { notesGrid, triggerMidiCommand } = this.deps;

    const state = {
      initialStates: null as Map<NoteSprite, { x: number; y: number; duration: number }> | null,
      startMousePos: null as { x: number; y: number } | null,
      behavior: null as "leftResize" | "rightResize" | "move" | null,
    };

    const HANDLE_SIZE = 15;
    const MIN_DURATION = 10;

    const getMouseX = (e: FederatedPointerEvent) => notesGrid.toLocal(e.global).x;

    const getZone = (e: FederatedPointerEvent): typeof state.behavior => {
      const x = getMouseX(e);
      const isLargEnought = this.deps.notesGrid.scale.x * graphic.noteData.durationTicks > 60;
      if (x > graphic.x + graphic.noteData.durationTicks - HANDLE_SIZE && isLargEnought)
        return "rightResize";
      if (x < graphic.x + HANDLE_SIZE && isLargEnought) return "leftResize";
      return "move";
    };

    const updateCursor = (behavior: typeof state.behavior) => {
      const cursorMap = {
        leftResize: "w-resize",
        rightResize: "e-resize",
        move: "move",
      };
      const newCursor = behavior ? cursorMap[behavior] : "pointer";
      graphic.cursor = newCursor;
      if (state.behavior) document.body.style.cursor = newCursor;
    };

    const handleMove = (dx: number, dy: number) => {
      const rowHeight = this.getRowHeight();

      let offsetDx = dx;
      state.initialStates?.forEach((init) => {
        if (init.x + offsetDx < 0) offsetDx = offsetDx - init.x;
      });

      state.initialStates?.forEach((init, g) => {
        g.x = getNearestSubdivisionRoundedTick(
          this.deps.midiObject().header.ppq,
          [1, 1],
          init.x + offsetDx,
          this.deps.engine.project.config.magnetism,
        );
        const rawY = init.y + dy;
        g.y = Math.round(rawY / rowHeight) * rowHeight;
      });
    };

    const handleResize = (dx: number) => {
      const rowHeight = this.getRowHeight();
      state.initialStates?.forEach((init, g) => {
        let newDuration = init.duration;
        if (state.behavior === "rightResize") {
          newDuration = getNearestSubdivisionRoundedTick(
            this.deps.midiObject().header.ppq,
            [1, 1],
            Math.max(MIN_DURATION, init.duration + dx),
            this.deps.engine.project.config.magnetism,
          );
        } else {
          newDuration = getNearestSubdivisionRoundedTick(
            this.deps.midiObject().header.ppq,
            [1, 1],
            Math.max(MIN_DURATION, init.duration - dx),
            this.deps.engine.project.config.magnetism,
          );
          g.x = getNearestSubdivisionRoundedTick(
            this.deps.midiObject().header.ppq,
            [1, 1],
            init.x + (init.duration - newDuration),
            this.deps.engine.project.config.magnetism,
          );
        }

        (g as any).tempDuration = newDuration;
        g.width = newDuration;
        // .rect(0, 0, newDuration, rowHeight)
        // .fill(g.noteData.isSelected ? "#ffffff" : colorFromValue(0))
        // .stroke({ color: "#000000", pixelLine: true });
      });
    };

    const finalize = () => {
      if (!state.initialStates) return;

      const rowHeight = this.getRowHeight();
      const updates = Array.from(state.initialStates.entries()).map(([g]) => ({
        note: g.noteData,
        ticks: g.x,
        midi: 127 - Math.round(g.y / rowHeight),
        durationTicks: (g as any).tempDuration || g.noteData.durationTicks,
      }));

      triggerMidiCommand(new UpdateNotesCommand(updates));

      state.initialStates = null;
      state.startMousePos = null;
      state.behavior = null;
      document.body.style.cursor = "default";
    };

    graphic.on("rightclick", (e) => {
      e.stopPropagation();
      triggerMidiCommand(new DeleteNoteCommand(graphic.noteData));
    });

    graphic.on("pointerdown", (e) => {
      if (e.button === 2 || e.altKey) return;
      e.stopPropagation();

      if (!graphic.noteData.isSelected) {
        triggerMidiCommand(new SelectNotesCommand([graphic.noteData]));
        return;
      }

      state.behavior = getZone(e);
      state.startMousePos = notesGrid.toLocal(e.global);
      state.initialStates = new Map();

      this.deps.container.children.forEach((child) => {
        if (child.noteData.isSelected) {
          state.initialStates!.set(child, {
            x: child.x,
            y: child.y,
            duration: child.noteData.durationTicks,
          });
        }
      });
      updateCursor(state.behavior);
    });

    graphic.on("globalpointermove", (e) => {
      if (!state.initialStates || !state.startMousePos) {
        updateCursor(getZone(e));
        return;
      }

      const currentPos = notesGrid.toLocal(e.global);
      const dx = currentPos.x - state.startMousePos.x;
      const dy = currentPos.y - state.startMousePos.y;

      if (state.behavior === "move") handleMove(dx, dy);
      else handleResize(dx);
    });

    graphic.on("pointerup", finalize);
    graphic.on("pointerupoutside", finalize);

    graphic.on("pointerout", () => {
      if (!state.behavior) {
        graphic.cursor = "pointer";
        document.body.style.cursor = "default";
      }
    });
  }
}
