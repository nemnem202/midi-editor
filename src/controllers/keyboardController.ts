import { findFirstNoteTick } from "../lib/utils";
import {
  AddNotesCommand,
  DeleteSelectedNotesCommand,
  MoveNotesCommand,
  SelectAllNotesCommand,
  ToggleMagnetismCommand,
  type Command,
} from "../commands";
import type { MidiObject, Note, Project } from "types/project";
import type PianoRollEngine from "@/pianoRollEngine";

interface KeyboardControllerDeps {
  parent: PianoRollEngine;
  triggerMidiCommand: (command: Command<MidiObject>) => void;
  triggerProjectCommand: (Command: Command<Project>) => void;
}

type ShortcutMap = Map<string, () => void>;

export default class KeyboardController {
  private copyedNotes: Note[] = [];

  private shortcutMap: ShortcutMap = new Map([
    ["ctrl+a", () => this.selectAll()],
    ["ctrl+c", () => this.copy()],
    ["ctrl+v", () => this.paste()],
    ["ctrl+x", () => this.cut()],
    ["arrowup", () => this.moveNoteUp()],
    ["arrowdown", () => this.moveNoteDown()],
    ["ctrl+arrowup", () => this.moveNoteUp(12)],
    ["ctrl+arrowdown", () => this.moveNoteDown(12)],
    ["w", () => this.setTracklistToStart()],
    ["backspace", () => this.deleteSelected()],
    ["delete", () => this.deleteSelected()],
    ["ctrl+m", () => this.toggleMagnetism()],
  ]);

  constructor(private deps: KeyboardControllerDeps) {
    window.addEventListener("keydown", this.handleKeyboardEvents);
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyboardEvents);
  }

  private handleKeyboardEvents = (e: KeyboardEvent) => {
    const key = this.normalizeShortcut(e);
    const action = this.shortcutMap.get(key);
    console.log(key);
    if (action) {
      e.preventDefault();
      action();
    }
  };

  private normalizeShortcut(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey) parts.push("ctrl");
    if (e.altKey) parts.push("alt");
    if (e.shiftKey) parts.push("shift");
    if (e.metaKey) parts.push("meta");

    parts.push(e.key.toLowerCase());

    return parts.join("+");
  }

  private selectAll() {
    this.deps.triggerMidiCommand(new SelectAllNotesCommand());
  }

  private deleteSelected() {
    this.deps.triggerMidiCommand(new DeleteSelectedNotesCommand());
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
    this.deps.triggerMidiCommand(new AddNotesCommand(newNotes, 0));
  }

  private cut() {
    this.copy();
    this.deps.triggerMidiCommand(new DeleteSelectedNotesCommand());
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
      this.deps.triggerMidiCommand(new MoveNotesCommand(0, of));
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
      this.deps.triggerMidiCommand(new MoveNotesCommand(0, -of));
    }
  }

  private setTracklistToStart() {
    this.deps.parent.setTracklistPos(0);
  }

  private toggleMagnetism() {
    this.deps.triggerProjectCommand(new ToggleMagnetismCommand());
  }
}
