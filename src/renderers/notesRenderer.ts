import type PianoRollEngine from "../pianoRollEngine";
import {
  DeleteNoteCommand,
  SelectNotesCommand,
  UpdateNotesCommand,
  type Command,
} from "../commands";
import { colorFromValue, getNearestSubdivisionRoundedTick } from "../lib/utils";
import { Container, FederatedPointerEvent, Texture } from "pixi.js";
import type { MidiObject } from "types/project";
import { NoteSprite } from "../pianoRollEngine";

const MIN_DURATION = 10;

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
  private pool: NoteSprite[] = [];

  constructor(deps: NotesRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { container, midiObject, engine } = this.deps;
    const rowHeight = this.getRowHeight();
    const currentTrackIndex = engine.currentTrack;

    const notesToDraw = midiObject().tracks.flatMap((track, index) =>
      track.notes.map((note) => ({
        note,
        channel: track.channel,
        isCurrent: index === currentTrackIndex,
      })),
    );

    notesToDraw.sort((a, b) =>
      a.note.isSelected === b.note.isSelected ? 0 : a.note.isSelected ? 1 : -1,
    );

    container.children.forEach((c) => (c.visible = false));

    notesToDraw.forEach(({ note, channel, isCurrent }, index) => {
      let sprite: NoteSprite;

      if (index < container.children.length) {
        sprite = container.children[index];
      } else {
        sprite = this.pool.pop() || new NoteSprite(Texture.WHITE);
        this.attachEvents(sprite);
        container.addChild(sprite);
      }

      sprite.visible = true;
      sprite.noteData = note;
      sprite.x = note.ticks;
      sprite.y = (127 - note.midi) * rowHeight;
      sprite.width = note.durationTicks;
      sprite.height = rowHeight;

      sprite.alpha = isCurrent ? 1 : 0.2;
      sprite.eventMode = isCurrent ? "static" : "none";

      if (note.isSelected) {
        sprite.tint = 0xff8888;
      } else {
        sprite.tint = colorFromValue(channel);
      }

      (sprite as any).tempDuration = note.durationTicks;
    });

    while (container.children.length > notesToDraw.length) {
      const unused = container.removeChildAt(container.children.length - 1);
      unused.visible = false;
      this.pool.push(unused);
    }
  }

  private attachEvents(sprite: NoteSprite) {
    const { notesGrid, triggerMidiCommand, engine } = this.deps;

    if (sprite.noteData.track !== engine.currentTrack) return;

    const state = {
      initialStates: null as Map<NoteSprite, { x: number; y: number; duration: number }> | null,
      startMousePos: null as { x: number; y: number } | null,
      behavior: null as "leftResize" | "rightResize" | "move" | null,
    };

    const getLocalX = (e: FederatedPointerEvent) => notesGrid.toLocal(e.global).x;

    const getHandleSizeTicks = () => {
      return 12 / notesGrid.scale.x;
    };

    const getBehavior = (e: FederatedPointerEvent): typeof state.behavior => {
      const hSize = getHandleSizeTicks();
      const localX = getLocalX(e);
      const relX = localX - sprite.x;

      if (sprite.width * notesGrid.scale.x < 30) return "move";

      if (relX < hSize) return "leftResize";
      if (relX > sprite.noteData.durationTicks - hSize) return "rightResize";
      return "move";
    };

    sprite.on("pointerdown", (e) => {
      if (e.button === 2 || e.altKey) return;
      e.stopPropagation();

      if (!sprite.noteData.isSelected) {
        triggerMidiCommand(
          new SelectNotesCommand([sprite.noteData], this.deps.engine.currentTrack),
        );
        engine.lastTouchedNote = sprite.noteData;
        return;
      }

      state.behavior = getBehavior(e);
      state.startMousePos = notesGrid.toLocal(e.global);
      state.initialStates = new Map();

      this.deps.container.children.forEach((child) => {
        if (child.visible && child.noteData.isSelected) {
          state.initialStates!.set(child, {
            x: child.x,
            y: child.y,
            duration: child.noteData.durationTicks,
          });
        }
      });
    });

    sprite.on("globalpointermove", (e) => {
      if (!state.initialStates || !state.startMousePos) {
        const b = getBehavior(e);
        sprite.cursor = b === "move" ? "move" : "ew-resize";
        return;
      }

      const mouse = notesGrid.toLocal(e.global);
      const rawDx = mouse.x - state.startMousePos.x;
      const rawDy = mouse.y - state.startMousePos.y;

      const rowH = this.getRowHeight();
      const ppq = engine.midiObject.header.ppq;
      const magnetism = engine.project.config.magnetism;

      const targetInit = state.initialStates.get(sprite)!;

      let snappedDx = rawDx;
      let snappedDDuration = rawDx;
      let snappedDy = Math.round(rawDy / rowH) * rowH;

      if (state.behavior === "move") {
        const targetNewX = getNearestSubdivisionRoundedTick(
          ppq,
          [1, 1],
          targetInit.x + rawDx,
          magnetism,
        );
        snappedDx = targetNewX - targetInit.x;
      } else if (state.behavior === "rightResize") {
        const newDuration = Math.max(MIN_DURATION, targetInit.duration + rawDx);
        const snappedDuration = getNearestSubdivisionRoundedTick(
          ppq,
          [1, 1],
          newDuration,
          magnetism,
        );
        snappedDDuration = snappedDuration - targetInit.duration;
      } else if (state.behavior === "leftResize") {
        const newX = getNearestSubdivisionRoundedTick(ppq, [1, 1], targetInit.x + rawDx, magnetism);

        const clampedNewX = Math.min(newX, targetInit.x + targetInit.duration - MIN_DURATION);
        snappedDx = clampedNewX - targetInit.x;

        snappedDDuration = -snappedDx;
      }

      state.initialStates.forEach((init, s) => {
        if (s.noteData.track !== engine.currentTrack) return;
        if (state.behavior === "move") {
          s.x = init.x + snappedDx;
          s.y = init.y + snappedDy;
        } else if (state.behavior === "rightResize") {
          const newDur = Math.max(MIN_DURATION, init.duration + snappedDDuration);
          s.width = newDur;
          (s as any).tempDuration = newDur;
        } else if (state.behavior === "leftResize") {
          const newDur = Math.max(MIN_DURATION, init.duration + snappedDDuration);
          s.x = init.x - (newDur - init.duration);
          s.width = newDur;
          (s as any).tempDuration = newDur;
        }
      });

      document.body.style.cursor = sprite.cursor ?? document.body.style.cursor;
    });

    const finalize = () => {
      if (!state.initialStates) return;

      const updates = Array.from(state.initialStates.entries()).map(([s]) => ({
        note: s.noteData,
        ticks: s.x,
        midi: 127 - Math.round(s.y / this.getRowHeight()),
        durationTicks: (s as any).tempDuration || s.noteData.durationTicks,
      }));

      triggerMidiCommand(new UpdateNotesCommand(updates, engine.currentTrack));

      state.initialStates = null;
      state.behavior = null;
      document.body.style.cursor = "default";
    };

    sprite.on("pointerup", finalize);
    sprite.on("pointerupoutside", finalize);

    sprite.on("rightclick", (e) => {
      e.stopPropagation();
      triggerMidiCommand(new DeleteNoteCommand(sprite.noteData));
    });
  }

  private getRowHeight() {
    return this.deps.appScreen.height / this.deps.constants.TOTAL_NOTES;
  }
}
