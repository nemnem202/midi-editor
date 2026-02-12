import type { TrackJSON } from "@tonejs/midi";
import type { HeaderJSON } from "@tonejs/midi/dist/Header";

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
  bpm: number;
  signature: Signature;
  midiFileUrl: string;
};

export type MidiObject = {
  header: HeaderJSON;
  durationInTicks: number;
  tracks: TrackJSON[];
};
