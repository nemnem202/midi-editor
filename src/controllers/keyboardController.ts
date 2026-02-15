import { findFirstNoteTick } from "../lib/utils";
import {
  AddNotesCommand,
  DeleteSelectedNotesCommand,
  MoveNotesCommand,
  SelectAllNotesCommand,
  type Command,
} from "../commands";
import type { MidiObject, Note } from "types/project";
import type PianoRollEngine from "@/pianoRollEngine";

interface KeyboardControllerDeps {
  parent: PianoRollEngine;
  onCommand: (command: Command<MidiObject>) => void;
}

export default class KeyboardController {
  private copyedNotes: Note[] = [];

  constructor(private deps: KeyboardControllerDeps) {
    window.addEventListener("keydown", this.handleKeyobardEvents);
  }

  private handleKeyobardEvents = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    let eventHasBeenHandled = true;
    console.log(key);
    if (e.ctrlKey) {
      if (key === "a") {
        this.selectAll();
      } else if (key === "c") {
        this.copy();
      } else if (key === "v") {
        this.paste();
      } else if (key === "x") {
        this.cut();
      } else if (key === "arrowup") {
        this.moveNoteUp(12);
      } else if (key === "arrowdown") {
        this.moveNoteDown(12);
      }
    } else if (e.altKey) {
    } else {
      if (key === "arrowup") {
        this.moveNoteUp();
      } else if (key === "arrowdown") {
        this.moveNoteDown();
      }
    }

    eventHasBeenHandled ?? e.preventDefault();
  };

  private selectAll() {
    this.deps.onCommand(new SelectAllNotesCommand());
  }

  private copy() {
    this.copyedNotes = [];
    this.deps.parent.midiObject.tracks.forEach((track) =>
      track.notes.forEach((note) => {
        if (note.isSelected) this.copyedNotes.push({ ...note });
      }),
    );
    const offsetTicks = findFirstNoteTick(this.copyedNotes);
    console.log(offsetTicks);
    this.copyedNotes = this.copyedNotes.map((note) => {
      note.ticks -= offsetTicks;
      return note;
    });
  }

  private paste() {
    console.log(this.deps.parent.tracklistPos);
    const newNotes = this.copyedNotes.map((note) => ({
      ...note,
      isSelected: true,
      ticks: note.ticks + this.deps.parent.tracklistPos,
    }));
    console.log("pasted", newNotes);
    this.deps.onCommand(new AddNotesCommand(newNotes, 0));
  }

  private cut() {
    this.copy();
    this.deps.onCommand(new DeleteSelectedNotesCommand());
  }

  private moveNoteUp(of: number = 1) {
    of = Math.max(of, 0);
    if (
      this.deps.parent.midiObject.tracks.find((track) =>
        track.notes.find((note) => note.isSelected && note.midi + of > 127),
      )
    ) {
      return;
    } else {
      this.deps.onCommand(new MoveNotesCommand(0, of));
    }
  }

  private moveNoteDown(of: number = 1) {
    of = Math.max(of, 0);
    if (
      this.deps.parent.midiObject.tracks.find((track) =>
        track.notes.find((note) => note.isSelected && note.midi - of < 0),
      )
    ) {
      return;
    } else {
      this.deps.onCommand(new MoveNotesCommand(0, -of));
    }
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyobardEvents);
  }
}
