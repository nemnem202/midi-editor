import type { NoteJSON } from "@tonejs/midi/dist/Note";
import type { MidiObject } from "types/project";

export interface Command<TState> {
  execute(state: TState): TState;
}

export class DeleteNoteCommand implements Command<MidiObject> {
  private note: NoteJSON;
  constructor(note: NoteJSON) {
    this.note = note;
  }

  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.filter((n) => n !== this.note),
      })),
    };
  }
}

type MoveData = {
  note: NoteJSON;
  ticks: number;
  midi: number;
};

export class MoveNotesCommand implements Command<MidiObject> {
  private moves: MoveData[];
  constructor(moves: MoveData[]) {
    this.moves = moves;
  }

  execute(state: MidiObject): MidiObject {
    const moveMap = new Map(this.moves.map((m) => [m.note, m]));

    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((note) => {
          const update = moveMap.get(note);
          return update ? { ...note, ticks: update.ticks, midi: update.midi } : note;
        }),
      })),
    };
  }
}
