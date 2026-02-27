import type { ControlChangesJSON } from "@tonejs/midi/dist/ControlChanges";
import type { HeaderJSON } from "@tonejs/midi/dist/Header";
import type { InstrumentJSON } from "@tonejs/midi/dist/Instrument";
import type { NoteJSON } from "@tonejs/midi/dist/Note";
import type { PitchBendJSON } from "@tonejs/midi/dist/PitchBend";

export type People = {
  firstName: string;
  lastName: string;
  email?: string;
  contact?: string;
};

export type Signature = [number, number];

export type Project = {
  public: boolean;
  title: string;
  description?: string;
  author: People;
  composer: People;
  creation: Date;
  lasModified: Date;
  midiFileUrl: string;
  config: Config;
};

export type Config = {
  gridSubdivisions: [number, number];
  currentTracklistTick: number;
  displayedTrackIndex: number;
  signature: Signature;
  magnetism: boolean;
  isPlaying: boolean;
  bpm: number;
  menuOpen: boolean;
};

export interface Note extends NoteJSON {
  isSelected: boolean;
  track: number;
}

export interface Track {
  name: string;
  notes: Note[];
  channel: number;
  instrument: InstrumentJSON;
  controlChanges: ControlChangesJSON;
  pitchBends: PitchBendJSON[];
  endOfTrackTicks?: number;
}

export type MidiObject = {
  header: HeaderJSON;
  durationInTicks: number;
  tracks: Track[];
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
