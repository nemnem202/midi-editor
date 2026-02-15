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
        // On crée de NOUVEAUX objets notes avec le spread {...n}
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
    return {
      ...state,
      tracks: state.tracks.map((track, idx) => {
        if (idx !== this.trackIndex) return track;
        return {
          ...track,
          // concat renvoie un nouveau tableau, c'est parfait
          notes: track.notes.concat(this.notes.map((n) => ({ ...n, isSelected: false }))),
        };
      }),
      durationInTicks: Math.max(getMidiLengthFromNotes(this.notes), state.durationInTicks),
    };
  }
}
