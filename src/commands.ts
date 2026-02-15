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

type PositionData = {
  note: Note;
  ticks: number;
  midi: number;
};

export class UpdateNotesPositionCommand implements Command<MidiObject> {
  constructor(private positions: PositionData[]) {}

  execute(state: MidiObject): MidiObject {
    const moveMap = new Map(this.positions.map((m) => [m.note, m]));
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

export class MoveNotesCommand implements Command<MidiObject> {
  constructor(
    private ticks: number,
    private midi: number,
  ) {}

  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((n) => {
          if (n.isSelected) {
            return {
              ...n,
              ticks: Math.max(0, n.ticks + this.ticks),
              midi: Math.max(0, Math.min(127, n.midi + this.midi)),
            };
          }
          return n;
        }),
      })),
    };
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
  constructor(private notesToSelect: Note[]) {}
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((n) => ({
          ...n,
          isSelected: this.notesToSelect.some((nt) => nt.ticks === n.ticks && nt.midi === n.midi),
        })),
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

        notes: track.notes.map((n) => ({ ...n, isSelected: true })),
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
          const isExcepted = this.excepted.some((e) => e.ticks === n.ticks && e.midi === n.midi);
          return { ...n, isSelected: isExcepted ? n.isSelected : false };
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
    state.tracks.map((t) => t.notes.map((n) => ({ ...n, isSelected: false })));
    return {
      ...state,
      tracks: state.tracks.map((track, idx) => {
        if (idx !== this.trackIndex) return track;
        return {
          ...track,

          notes: track.notes.concat(this.notes),
        };
      }),
      durationInTicks: Math.max(getMidiLengthFromNotes(this.notes), state.durationInTicks),
    };
  }
}
