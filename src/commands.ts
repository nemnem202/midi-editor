import type { MidiObject, Note } from "types/project";
import { getMidiLength, getMidiLengthFromNotes } from "./lib/utils";

export interface Command<TState> {
  execute(state: TState): TState;
}

export class DeleteNoteCommand implements Command<MidiObject> {
  constructor(private note: Note) {}

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
  note: Note;
  ticks: number;
  midi: number;
};

export class MoveNotesCommand implements Command<MidiObject> {
  constructor(private moves: MoveData[]) {}

  execute(state: MidiObject): MidiObject {
    const moveMap = new Map(this.moves.map((m) => [m.note, m]));
    const updatedMidiObject: MidiObject = {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((note) => {
          const update = moveMap.get(note);
          return update ? { ...note, ticks: update.ticks, midi: update.midi } : note;
        }),
      })),
    };
    const potentialMidiLength = getMidiLength(updatedMidiObject);
    updatedMidiObject.durationInTicks = Math.max(
      potentialMidiLength,
      updatedMidiObject.durationInTicks,
    );

    return updatedMidiObject;
  }
}

export class DeleteSelectedNotesCommand implements Command<MidiObject> {
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.filter((n) => !n.isSelected),
      })),
    };
  }
}

export class SelectNotesCommand implements Command<MidiObject> {
  constructor(private notes: Note[]) {}
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((n) => {
          if (this.notes.includes(n)) {
            n.isSelected = true;
          } else {
            n.isSelected = false;
          }
          return n;
        }),
      })),
    };
  }
}

export class SelectAllNotesCommand implements Command<MidiObject> {
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((n) => {
          n.isSelected = true;
          return n;
        }),
      })),
    };
  }
}

export class UnSelectAllNotesCommand implements Command<MidiObject> {
  constructor(private excepted: Note[]) {}
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((n) => {
          if (!this.excepted.includes(n)) n.isSelected = false;
          return n;
        }),
      })),
    };
  }
}

export class AddNotesCommand implements Command<MidiObject> {
  constructor(
    private notes: Note[],
    private trackIndex: number,
  ) {}

  execute(state: MidiObject): MidiObject {
    const tracks = state.tracks;
    tracks[this.trackIndex].notes.concat(this.notes);
    const notesMidiLength = getMidiLengthFromNotes(this.notes);

    return {
      ...state,
      durationInTicks: Math.max(notesMidiLength, state.durationInTicks),
      tracks: tracks,
    };
  }
}
