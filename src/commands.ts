import type { MidiObject, Note, Project } from "types/project";
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

export type NoteUpdateData = {
  note: Note;
  ticks?: number;
  midi?: number;
  durationTicks?: number;
  velocity?: number;
};

export class UpdateNotesCommand implements Command<MidiObject> {
  constructor(private positions: NoteUpdateData[]) {}

  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      durationInTicks: Math.max(
        getMidiLengthFromNotes(this.positions.map((p) => p.note)),
        state.durationInTicks,
      ),
      tracks: state.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((note) => {
          // On cherche la mise à jour par correspondance de valeurs (Ticks/Midi originaux)
          // car les références d'objets changent à cause du spread operator
          const update = this.positions.find(
            (p) => p.note.ticks === note.ticks && p.note.midi === note.midi,
          );

          if (update) {
            return {
              ...note,
              ticks: update.ticks ?? note.ticks,
              midi: update.midi ?? note.midi,
              durationTicks: update.durationTicks ?? note.durationTicks,
              velocity: update.velocity ?? note.velocity,
            };
          }
          return note;
        }),
      })),
    };
  }
}

export class MoveNotesCommand implements Command<MidiObject> {
  constructor(
    private ticks: number,
    private midi: number,
  ) {}

  execute(state: MidiObject): MidiObject {
    const nextState = {
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
    return {
      ...nextState,
      durationInTicks: Math.max(
        getMidiLengthFromNotes(state.tracks.flatMap((track) => track.notes)),
        state.durationInTicks,
      ),
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
          isSelected: this.notesToSelect.some(
            (nt) => nt.ticks === n.ticks && nt.midi === n.midi && nt.isInCurrentTrack,
          ),
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

        notes: track.notes.map((n) => ({ ...n, isSelected: n.isInCurrentTrack })),
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
          return { ...n, isSelected: isExcepted };
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

export class ToggleMagnetismCommand implements Command<Project> {
  execute(state: Project): Project {
    return {
      ...state,
      config: { ...state.config, magnetism: !state.config.magnetism },
    };
  }
}
