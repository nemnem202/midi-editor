import { getTransport, Part, PolySynth, start } from "tone";
import type { MidiObject, Project, Track } from "types/project";

interface TrackInstruments {
  piano: PolySynth;
  guitar: PolySynth;
  bass: PolySynth;
  drums: PolySynth;
}

export default class SoundEngine {
  private static engine: SoundEngine | null = null;
  private static initialized = false;

  private trackInstruments: TrackInstruments = SoundEngine.initTrackInstruments();
  private parts: Part[] = [];

  private constructor(
    private project: Project,
    private midiObject: MidiObject,
    private onTickUpdate: (tick: number) => void,
  ) {}

  private static initTrackInstruments(): TrackInstruments {
    return {
      piano: new PolySynth({ maxPolyphony: 32 }).toDestination(),
      guitar: new PolySynth({ maxPolyphony: 32 }).toDestination(),
      bass: new PolySynth({ maxPolyphony: 32 }).toDestination(),
      drums: new PolySynth({ maxPolyphony: 32 }).toDestination(),
    };
  }

  public static async init(
    project: Project,
    midiObject: MidiObject,
    onTickUpdate: (tick: number) => void,
  ) {
    await start();
    if (!SoundEngine.engine) {
      SoundEngine.engine = new SoundEngine(project, midiObject, onTickUpdate);
      SoundEngine.engine.setupTransport();
      SoundEngine.engine.updateMidiEvents();
    }
    SoundEngine.initialized = true;
    console.log("sound engine init !");
  }

  public static get(): SoundEngine {
    if (!SoundEngine.engine || !SoundEngine.initialized) {
      throw new Error("SoundEngine not initialized. Call SoundEngine.init(...) first.");
    }
    return SoundEngine.engine;
  }

  private get transport() {
    return getTransport();
  }

  private setupTransport() {
    this.transport.bpm.value = this.project.config.bpm;
    this.transport.PPQ = this.midiObject.header.ppq;
  }

  private updateMidiEvents() {
    this.transport.cancel();
    this.parts.forEach((p) => p.dispose());
    this.parts = [];

    this.midiObject.tracks.forEach((track, index) => {
      const synth = this.getInstrumentForTrack(index);
      if (synth) this.scheduleMidiEvents(track, synth);
    });
  }

  public get currentTicks(): number {
    return this.transport.ticks;
  }

  private getInstrumentForTrack(index: number): PolySynth | null {
    switch (index) {
      case 0:
        return this.trackInstruments.piano;
      case 1:
        return this.trackInstruments.guitar;
      case 2:
        return this.trackInstruments.bass;
      case 3:
        return this.trackInstruments.drums;
      default:
        return null;
    }
  }

  private scheduleMidiEvents(track: Track, synth: PolySynth) {
    const part = new Part(
      (time, note) => {
        synth.triggerAttackRelease(note.name, `${note.durationTicks}i`, time, note.velocity);
      },
      track.notes.map((n) => ({ ...n, time: `${n.ticks}i` })),
    );

    part.start(0);
    this.parts.push(part);
  }

  public updateMidiObject(newMidiObject: MidiObject) {
    if (this.midiObject.tracks !== newMidiObject.tracks) {
      this.midiObject = newMidiObject;
      this.updateMidiEvents();
    }
  }

  public updateProject(newProject: Project) {
    const lastProject = this.project;
    this.project = newProject;

    if (this.project.config.isPlaying !== lastProject.config.isPlaying) {
      this.project.config.isPlaying ? this.play() : this.pause();
    }

    if (this.project.config.bpm !== lastProject.config.bpm) {
      this.transport.bpm.value = this.project.config.bpm;
    }
  }

  public play() {
    this.releaseAllInstruments();
    this.transport.start();
  }

  public pause() {
    this.transport.pause();
    this.releaseAllInstruments();
  }

  public reset() {
    this.transport.stop();
    this.transport.position = "0:0:0";
    this.releaseAllInstruments();
  }

  public setTick(tick: number) {
    this.transport.position = `${tick}i`;
  }

  private releaseAllInstruments() {
    Object.values(this.trackInstruments).forEach((synth) => {
      if (synth instanceof PolySynth) {
        synth.releaseAll();
      }
    });
  }
}
