import type { MidiObject, Note, Project, Signature } from "types/project";
import { getMidiLengthFromNotes } from "./lib/utils";
import {
  BINARY_SUBDIVISIONS,
  MAX_BPM,
  MAX_SIGNATURE,
  MIN_BPM,
  MIN_SIGNATURE,
} from "./config/constants";

export interface Command<TState> {
  execute(state: TState): TState;
}
export class DeleteNoteCommand implements Command<MidiObject> {
  constructor(private note: Note) {}

  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      notes: state.notes.filter((n) => n !== this.note),
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
  constructor(
    private positions: NoteUpdateData[],
    private track: number,
  ) {}

  execute(state: MidiObject): MidiObject {
    const newState = {
      ...state,
      notes: state.notes.map((note) => {
        const update = this.positions.find(
          (p) =>
            p.note.ticks === note.ticks && p.note.midi === note.midi && note.track === this.track,
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
    };

    const newDuration = Math.max(
      getMidiLengthFromNotes(newState.notes) + 2 * state.header.ppq,
      state.durationInTicks,
    );

    console.log(newDuration);

    return { ...newState, durationInTicks: newDuration };
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
      notes: state.notes.map((n) => {
        if (n.isSelected) {
          return {
            ...n,
            ticks: Math.max(0, n.ticks + this.ticks),
            midi: Math.max(0, Math.min(127, n.midi + this.midi)),
          };
        }
        return n;
      }),
    };
    return {
      ...nextState,
      durationInTicks: Math.max(getMidiLengthFromNotes(state.notes), state.durationInTicks),
    };
  }
}
export class DeleteSelectedNotesCommand implements Command<MidiObject> {
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      notes: state.notes.filter((n) => !n.isSelected),
    };
  }
}
export class SelectNotesCommand implements Command<MidiObject> {
  constructor(
    private notesToSelect: Note[],
    private currentTackIndex: number,
  ) {}
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      notes: state.notes.map((n) => ({
        ...n,
        isSelected: this.notesToSelect.some(
          (nt) => nt.ticks === n.ticks && nt.midi === n.midi && n.track === this.currentTackIndex,
        ),
      })),
    };
  }
}
export class SelectAllNotesCommand implements Command<MidiObject> {
  constructor(private currentTrackindex: number) {}
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      notes: state.notes.map((n) => ({
        ...n,
        isSelected: n.track === this.currentTrackindex,
      })),
    };
  }
}
export class UnSelectAllNotesCommand implements Command<MidiObject> {
  constructor(private excepted: Note[]) {}
  execute(state: MidiObject): MidiObject {
    return {
      ...state,
      notes: state.notes.map((n) => {
        const isExcepted = this.excepted.some((e) => e.ticks === n.ticks && e.midi === n.midi);
        return { ...n, isSelected: isExcepted };
      }),
    };
  }
}
export class AddNotesCommand implements Command<MidiObject> {
  constructor(
    private notes: Note[],
    private currentTrackindex: number,
  ) {}

  execute(state: MidiObject): MidiObject {
    state.notes.map((n) => ({ ...n, isSelected: false }));
    return {
      ...state,
      notes: state.notes.concat(this.notes.map((n) => ({ ...n, track: this.currentTrackindex }))),
      durationInTicks: Math.max(getMidiLengthFromNotes(this.notes) + 200, state.durationInTicks),
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
export class TogglePlayCommand implements Command<Project> {
  execute(state: Project): Project {
    return {
      ...state,
      config: {
        ...state.config,
        isPlaying: !state.config.isPlaying,
      },
    };
  }
}
export class SetPlayOrPauseCommand implements Command<Project> {
  constructor(private play: boolean) {}

  execute(state: Project): Project {
    return {
      ...state,
      config: {
        ...state.config,
        isPlaying: this.play,
      },
    };
  }
}
export class UpdateCurrentTickCommand implements Command<Project> {
  constructor(private currentTracklistTick: number) {}

  execute(state: Project): Project {
    return {
      ...state,
      config: {
        ...state.config,
        currentTracklistTick: this.currentTracklistTick,
      },
    };
  }
}
export class ChangeBpmCommand implements Command<Project> {
  constructor(private bpm: number) {}

  execute(state: Project): Project {
    if (this.bpm > MIN_BPM && this.bpm < MAX_BPM)
      return { ...state, config: { ...state.config, bpm: this.bpm } };
    return state;
  }
}
export class StopCommand implements Command<Project> {
  execute(state: Project): Project {
    return {
      ...state,
      config: {
        ...state.config,
        isPlaying: false,
        currentTracklistTick: 0,
      },
    };
  }
}
export class ChangeGridSubdivisionCommand implements Command<Project> {
  constructor(private subIndex: number) {}
  execute(state: Project): Project {
    return {
      ...state,
      config: {
        ...state.config,
        gridSubdivisions: BINARY_SUBDIVISIONS[this.subIndex] as [number, number],
      },
    };
  }
}
export class ChangeTrackIndexCommand implements Command<Project> {
  constructor(private trackindex: number) {}
  execute(state: Project): Project {
    return { ...state, config: { ...state.config, displayedTrackIndex: this.trackindex } };
  }
}
export class ChangeSignatureCommand implements Command<Project> {
  constructor(private sig: Signature) {}
  execute(state: Project): Project {
    return {
      ...state,
      config: {
        ...state.config,
        signature: [
          Math.min(Math.max(MIN_SIGNATURE, this.sig[0]), MAX_SIGNATURE),
          Math.min(Math.max(MIN_SIGNATURE, this.sig[1]), MAX_SIGNATURE),
        ],
      },
    };
  }
}
