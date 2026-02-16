import type { Project } from "../../types/project";

const DEFAULT_PROJECT: Project = {
  public: true,
  author: {
    firstName: "Naïm",
    lastName: "El Habbas",
    email: "naimelhabbas@gmail.com",
    contact: "0761161586",
  },
  composer: {
    firstName: "Ludving",
    lastName: "Van Bethoven",
  },
  title: "Fly me to the moon",
  description: "A popular jazz standart",
  creation: new Date(Date.now()),
  lasModified: new Date(Date.now()),
  midiFileUrl: "assets/midi/Falling20in20love.mid",
  config: {
    bpm: 120,
    currentTracklistTick: 0,
    displayedTrackIndex: 0,
    gridSubdivisions: [1, 4],
    isPlaying: false,
    magnetism: true,
    signature: [4, 4],
  },
};
export default DEFAULT_PROJECT;
