import { findFirstNoteTick } from "../lib/utils";
import { AddNotesCommand, SelectAllNotesCommand, type Command } from "../commands";
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

    if (e.ctrlKey) {
      if (key === "a") {
        e.preventDefault();
        this.deps.onCommand(new SelectAllNotesCommand());
      } else if (key === "c") {
        e.preventDefault();
        this.copyedNotes = [];
        this.deps.parent.midiObject.tracks.forEach((track) =>
          track.notes.forEach((note) => {
            if (note.isSelected) this.copyedNotes.push(note);
          }),
        );
        const offsetTicks = findFirstNoteTick(this.copyedNotes);
        console.log(offsetTicks);
        this.copyedNotes = this.copyedNotes.map((note) => {
          note.ticks -= offsetTicks;
          return note;
        });
      } else if (key === "v") {
        console.log(this.deps.parent.tracklistPos);
        const newNotes = this.copyedNotes.map((note) => ({
          ...note,
          isSelected: true,
          ticks: note.ticks + this.deps.parent.tracklistPos,
        }));
        console.log("pasted", newNotes);
        this.deps.onCommand(new AddNotesCommand(newNotes, 0));
      }
    }
  };

  destroy() {
    window.removeEventListener("keydown", this.handleKeyobardEvents);
  }
}
