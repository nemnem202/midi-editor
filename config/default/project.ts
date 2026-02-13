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
  bpm: 120,
  signature: [4, 4],
  description: "A popular jazz standart",
  creation: new Date(Date.now()),
  lasModified: new Date(Date.now()),
  midiFileUrl: "assets/midi/Falling20in20love.mid",
};
export default DEFAULT_PROJECT;
