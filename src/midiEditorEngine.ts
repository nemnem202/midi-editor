import {
  Application,
  Container,
  FederatedPointerEvent,
  FederatedWheelEvent,
  Graphics,
  Rectangle,
  Sprite,
} from "pixi.js";
import type { MidiObject, Note, Project } from "types/project";
import { AddNotesCommand, type Command } from "./commands";
import ViewportController from "./controllers/viewportController";
import { GridRenderer } from "./renderers/gridRenderer";
import { VelocityGridRenderer } from "./renderers/velocityGridRenderer";
import { NotesRenderer } from "./renderers/notesRenderer";
import { VelocityRenderer } from "./renderers/velocityRenderer";
import { SelectionController } from "./controllers/selectionController";
import { PanController } from "./controllers/panController";
import { LayoutManager } from "./renderers/layoutManager";
import TracklistRenderer from "./renderers/tracklistRenderer";
import KeyboardController from "./controllers/keyboardController";
import PianoKeyboardRenderer from "./renderers/pianoKeyboardRenderer";
import { arraysEqual, getNearestSubdivisionRoundedTick } from "./lib/utils";
import MenuRenderer from "./renderers/menuRenderer";
import { Midi } from "tone";
import SoundEngine from "./sound/sound-engine";
import type { EditorStrategy } from "./strategies/types";
import { ClassicStrategy, PianoRollStrategy } from "./strategies/editorStrategies";

const PIANO_KEYS_WIDTH = 100;
const VELOCITY_ZONE_HEIGHT = 150;
const VELOCITY_ZONE_GAP = 20;
const TOTAL_NOTES = 128;
const CORNER_RADIUS = 10;

export class NoteSprite extends Sprite {
  noteData: Note = {
    track: 0,
    duration: 0,
    durationTicks: 0,
    isSelected: false,
    midi: 0,
    name: "",
    ticks: 0,
    time: 0,
    velocity: 0,
  };
}

export default class MidiEditorEngine {
  strategy: EditorStrategy;
  private _soundEngine!: SoundEngine;
  private is_ready = false;
  private engineMidiObject: MidiObject;
  private engineProject: Project;
  public triggerMidiCommand: (command: Command<MidiObject>) => void;
  public triggerProjectCommand: (command: Command<Project>) => void;

  private root_div: HTMLDivElement;
  private app: Application = new Application();

  private piano_keys_container: Container = new Container({ eventMode: "passive" });
  private midi_editor_container: Container = new Container({ eventMode: "passive" });
  private notes_container: Container<NoteSprite> = new Container<NoteSprite>({
    eventMode: "passive",
    label: "notes_container",
  });
  private velocity_notes_container: Container<NoteSprite> = new Container<NoteSprite>({
    eventMode: "dynamic",
    hitArea: new Rectangle(0, 0, 100000, VELOCITY_ZONE_HEIGHT),
    label: "velocity_notes_container",
  });
  private notes_grid_container: Container = new Container({
    x: PIANO_KEYS_WIDTH,
    cullableChildren: true,
    eventMode: "dynamic",
    hitArea: new Rectangle(0, 0, 100000, 100000),
    label: "notes_grid_container",
  });
  private velocity_container: Container = new Container({
    x: PIANO_KEYS_WIDTH,
    height: VELOCITY_ZONE_HEIGHT - VELOCITY_ZONE_GAP,
    cullableChildren: true,
    eventMode: "static",
    label: "velocity_container",
  });

  private velocity_mask: Graphics = new Graphics({ eventMode: "passive", label: "velocity_mask" });
  private midi_editor_bg: Graphics = new Graphics({
    eventMode: "passive",
    label: "midi_editor_bg",
  });
  private select_square: Graphics = new Graphics({ eventMode: "passive", label: "select_square" });
  private velocityGrid: Graphics = new Graphics({ eventMode: "passive", label: "velocityGrid" });
  private velocity_bg: Graphics = new Graphics({ eventMode: "passive", label: "velocity_bg" });
  private main_mask: Graphics = new Graphics({ eventMode: "passive", label: "main_mask" });
  private tracklist: Graphics = new Graphics({ eventMode: "passive", label: "tracklist" });
  private grid: Graphics = new Graphics({ eventMode: "passive", label: "grid" });

  private selectionController!: SelectionController;
  private viewportController!: ViewportController;
  private keyboardController!: KeyboardController;
  private panController!: PanController;

  private velocityGridRenderer!: VelocityGridRenderer;
  private tracklistRenderer!: TracklistRenderer;
  private velocityRenderer!: VelocityRenderer;
  private pianoKeyboardRenderer!: PianoKeyboardRenderer;
  private notesRenderer!: NotesRenderer;
  private layoutManager!: LayoutManager;
  private gridRenderer!: GridRenderer;
  private menuRenderer!: MenuRenderer;

  lastTouchedNote: Note = {
    track: 0,
    duration: 2,
    durationTicks: 200,
    isSelected: true,
    midi: 0,
    name: "",
    ticks: 0,
    time: 2000,
    velocity: 0.5,
  };

  constructor(
    root_div: HTMLDivElement,
    midiObject: MidiObject,
    triggerMidiCommand: (command: Command<MidiObject>) => void,
    project: Project,
    triggerProjectCommand: (command: Command<Project>) => void,
    mode: "classic" | "pianoroll" = "classic",
  ) {
    this.root_div = root_div;
    this.engineMidiObject = midiObject;
    this.engineProject = project;
    this.triggerMidiCommand = triggerMidiCommand;
    this.triggerProjectCommand = triggerProjectCommand;
    this.strategy = mode === "classic" ? new ClassicStrategy() : new PianoRollStrategy();
  }

  get midiObject(): MidiObject {
    return this.engineMidiObject;
  }

  get project(): Project {
    return this.engineProject;
  }

  get tracklistPos(): number {
    return this.tracklistRenderer.tracklistPosition;
  }

  get root() {
    return this.root_div;
  }

  get soundEngine() {
    return this._soundEngine;
  }

  get currentTrack() {
    return this.project.config.displayedTrackIndex;
  }

  get subdivision() {
    return this.project.config.gridSubdivisions;
  }

  init = async () => {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: this.root_div,
      antialias: false,
    });

    // @ts-ignore
    globalThis.__PIXI_APP__ = this.app;

    this.createArborescence();
    this.addListeners();

    this.createGridRenderer();
    this.createLayoutManager();
    this.createPianoKeyboardRenderer();
    this.createNotesRenderer();
    this.createMenuRenderer();

    if (this.strategy.name === "classic") {
      this.createVelocityGridRenderer();
      this.createVelocityRenderer();
      this.createTracklistRenderer();
    }

    this.attachViewportController();
    this.attachPanController();
    this.attachKeyboardController();
    if (this.strategy.name === "classic") this.attachSelectionController();

    this.layoutManager.updateMask();

    this.drawKeys();
    this.drawAllGrids();
    this.drawAllNotes();

    if (this.strategy.name === "classic") this.drawTracklist();

    this.is_ready = true;

    await this.get_soundEngine();

    this.app.ticker.add(() => {
      if (this.is_ready && this.project.config.isPlaying) {
        const currentTick = this._soundEngine.currentTicks;
        if (this.strategy.name === "classic") {
          this.tracklistRenderer.updatePositionFromPlaying(currentTick);
        } else {
          this.viewportController.updateScrollFromPlaying(currentTick);
        }
      }
    });
  };

  setTacklistPosFromUser(pos: number) {
    this.tracklistRenderer.updatePositionFromUser(pos);
  }

  destroy() {
    if (this.app) {
      this.app.renderer.off("resize");
      this.app.destroy(true, { children: true });
      this.keyboardController.destroy();
    }
  }

  updateMidiData(newMidi: MidiObject) {
    const prevMidi = { ...this.engineMidiObject };
    this.engineMidiObject = newMidi;
    if (this.is_ready) {
      if (prevMidi.durationInTicks !== newMidi.durationInTicks) {
        this.viewportController.updateMidiSize();
        console.log("size changed");
      }

      this.drawAllNotes();
      this.drawAllGrids();
      this._soundEngine.updateMidiObject(this.engineMidiObject);
    }
  }

  updateProjectData(newProject: Project) {
    const newConfig = newProject.config;
    const prevConfig = { ...this.project.config };
    this.engineProject = newProject;
    if (this.is_ready) {
      if (newConfig.currentTracklistTick !== prevConfig.currentTracklistTick) {
        if (this.strategy.name === "classic") {
          this.tracklistRenderer.updatePositionFromPlaying(newConfig.currentTracklistTick);
        } else {
          console.log("oeoe");
          this.viewportController.updateScrollFromPlaying(newConfig.currentTracklistTick);
        }
      }
      if (
        arraysEqual(newConfig.gridSubdivisions, prevConfig.gridSubdivisions) ||
        arraysEqual(newConfig.signature, prevConfig.signature)
      ) {
        this.drawAllGrids();
      }
      if (newConfig.displayedTrackIndex !== prevConfig.displayedTrackIndex) {
        this.drawAllNotes();
      }
      this._soundEngine.updateProject(this.engineProject);
    }
  }

  private async get_soundEngine() {
    await SoundEngine.init(this.project, this.midiObject, (tick) => {
      if (this.strategy.name === "classic") {
        this.tracklistRenderer.updatePositionFromPlaying(tick);
      } else {
        this.viewportController.updateScrollFromPlaying(tick);
      }
    });
    this._soundEngine = SoundEngine.get();
  }

  private createArborescence() {
    this.root_div.appendChild(this.app.canvas);

    this.app.stage.addChild(this.midi_editor_bg);
    this.app.stage.addChild(this.velocity_bg);

    this.notes_grid_container.addChild(
      this.grid,
      this.notes_container,
      this.select_square,
      this.tracklist,
    );
    this.velocity_container.addChild(this.velocityGrid, this.velocity_notes_container);

    if (this.strategy.name === "classic") {
      this.app.stage.addChild(this.main_mask);
      this.app.stage.addChild(this.velocity_mask);

      // On masque la grille ET le piano
      this.notes_grid_container.mask = this.main_mask;
      this.piano_keys_container.mask = this.main_mask; // <--- FIX ICI

      this.velocity_container.mask = this.velocity_mask;
    } else {
      this.notes_grid_container.mask = null;
      this.piano_keys_container.mask = null; // <--- Pas de masque en Piano Roll
      this.velocity_container.mask = null;
    }

    this.app.stage.addChild(this.notes_grid_container);
    this.app.stage.addChild(this.velocity_container);
    this.app.stage.addChild(this.piano_keys_container);
  }
  private addListeners = () => {
    let alreadyClicked = false;
    let timeout: number | null = null;

    const addNote = (e: FederatedPointerEvent) => {
      timeout && clearTimeout(timeout);
      const rowHeight = this.app.screen.height / TOTAL_NOTES;
      const pos = this.notes_grid_container.toLocal(e.global);
      const midi = 127 - Math.round(pos.y / rowHeight);
      console.log("note added in track: ", this.currentTrack);
      const newNote: Note = {
        track: this.currentTrack,
        duration: this.lastTouchedNote.duration,
        durationTicks: this.lastTouchedNote.durationTicks,
        isSelected: true,
        midi: midi,
        name: Midi(midi).toNote(),
        ticks: getNearestSubdivisionRoundedTick(
          this.midiObject.header.ppq,
          this.subdivision,
          pos.x,
          this.project.config.magnetism,
        ),
        time: this.lastTouchedNote.time,
        velocity: this.lastTouchedNote.velocity,
      };
      alreadyClicked = false;
      return this.triggerMidiCommand(new AddNotesCommand([newNote], this.currentTrack));
    };

    this.notes_grid_container.on("pointerdown", (e) => {
      this.menuRenderer.clearMenu();
      if (alreadyClicked) {
        return addNote(e);
      } else {
        alreadyClicked = true;
        timeout = setTimeout(() => (alreadyClicked = false), 300);
      }
      if (e.button === 0 && e.altKey) {
        document.body.style.cursor = "grabbing";
        this.panController.updateLastDragPos(e);
      } else if (e.button === 0) {
        if (this.strategy.name === "classic") this.selectionController.unselectAll();
        if (this.strategy.name === "classic") this.tracklistRenderer.updatePositionFromUser(e);
      } else {
        if (this.strategy.name === "classic") this.selectionController.updateSelectionOrigin(e);
      }
    });

    this.notes_grid_container.on("wheel", (e: FederatedWheelEvent) => {
      this.menuRenderer.clearMenu();
      this.viewportController.handleZoom(e);
    });

    this.notes_grid_container.on("globalpointermove", (e) => {
      if (this.strategy.name === "classic") this.selectionController.tryDrawSelection(e);
      this.panController.tryPan(e);
    });

    this.notes_grid_container.on("pointerup", (e) => {
      if (
        (this.strategy.name === "pianoroll" || !this.selectionController._startedToSelect) &&
        e.button === 2
      ) {
        this.menuRenderer.drawMenu(e);
      }
      document.body.style.cursor = "default";
      if (this.strategy.name === "classic") this.selectionController.finalize(e);
      this.panController.releaseLastDragPos();
    });
    this.notes_grid_container.on("pointerupoutside", (e) => {
      this.menuRenderer.clearMenu();
      this.selectionController.finalize(e);
      this.panController.releaseLastDragPos();
    });
  };

  private createGridRenderer = () => {
    this.gridRenderer = new GridRenderer({
      engine: this,
      graphics: this.grid,
      notesGrid: this.notes_grid_container,
      appScreen: this.app.screen,
      midiObject: () => this.midiObject,
      constants: {
        TOTAL_NOTES,
        PIANO_KEYS_WIDTH,
        VELOCITY_ZONE_HEIGHT,
      },
    });
  };
  private createVelocityGridRenderer = () => {
    this.velocityGridRenderer = new VelocityGridRenderer({
      engine: this,
      graphics: this.velocityGrid,
      notesGrid: this.notes_grid_container,
      appScreen: this.app.screen,
      midiObject: () => this.midiObject,
      constants: {
        PIANO_KEYS_WIDTH,
        VELOCITY_ZONE_HEIGHT,
      },
    });
  };
  private createNotesRenderer = () => {
    this.notesRenderer = new NotesRenderer({
      engine: this,
      container: this.notes_container,
      notesGrid: this.notes_grid_container,
      appScreen: this.app.screen,
      midiObject: () => this.midiObject,
      triggerMidiCommand: this.triggerMidiCommand,
      constants: { TOTAL_NOTES },
    });
  };
  private createVelocityRenderer = () => {
    this.velocityRenderer = new VelocityRenderer({
      triggerMidiCommand: this.triggerMidiCommand,
      engine: this,
      container: this.velocity_notes_container,
      velocityContainer: this.velocity_container,
      midiObject: () => this.midiObject,
    });
  };
  private createTracklistRenderer = () => {
    this.tracklistRenderer = new TracklistRenderer({
      container: this.notes_grid_container,
      track: this.tracklist,
      engine: this,
    });
  };
  private createLayoutManager = () => {
    this.layoutManager = new LayoutManager({
      engine: this,
      app: this.app,
      rootDiv: this.root_div,
      notesGrid: this.notes_grid_container,
      pianoKeysContainer: this.piano_keys_container,
      velocityContainer: this.velocity_container,
      mainMask: this.main_mask,
      velocityMask: this.velocity_mask,
      midiEditorBg: this.midi_editor_bg,
      velocityBg: this.velocity_bg,
      midiObject: () => this.midiObject,
      constants: {
        PIANO_KEYS_WIDTH,
        VELOCITY_ZONE_HEIGHT,
        VELOCITY_ZONE_GAP,
        CORNER_RADIUS,
      },
      onResize: () => {
        this.drawAllGrids();
        this.drawAllNotes();
      },
    });

    this.layoutManager.init();
  };
  private createPianoKeyboardRenderer = () => {
    this.pianoKeyboardRenderer = new PianoKeyboardRenderer({
      app: this.app,
      engine: this,
      constants: {
        PIANO_KEYS_WIDTH,
      },
      piano_keys_container: this.piano_keys_container,
    });
  };
  private createMenuRenderer = () => {
    this.menuRenderer = new MenuRenderer({ engine: this, app: this.app });
  };

  private attachViewportController = () => {
    this.viewportController = new ViewportController({
      appScreen: this.app.screen,
      engine: this,
      notesGrid: this.notes_grid_container,
      velocityContainer: this.velocity_container,
      pianoKeysContainer: this.piano_keys_container,
      midiObject: () => this.midiObject,
      constants: {
        PIANO_KEYS_WIDTH,
        VELOCITY_ZONE_HEIGHT,
      },
      onAfterTransform: () => {
        this.drawAllGrids();
        this.layoutManager.updateHitbox();
        if (this.strategy.name === "classic") this.velocityRenderer.updateWidth();
      },
    });
  };
  private attachSelectionController = () => {
    this.selectionController = new SelectionController({
      engine: this,
      notesGrid: this.notes_grid_container,
      notesContainer: this.notes_container,
      selectSquare: this.select_square,
      triggerMidiCommand: this.triggerMidiCommand,
    });
  };
  private attachPanController = () => {
    this.panController = new PanController({
      engine: this,
      notesGrid: this.notes_grid_container,
      pianoKeysContainer: this.piano_keys_container,
      velocityContainer: this.velocity_container,
      constrain: () => this.viewportController.constrain(),
      onAfterPan: () => {
        this.drawAllGrids();
        this.layoutManager.updateHitbox();
      },
    });
  };
  private attachKeyboardController = () => {
    this.keyboardController = new KeyboardController({
      parent: this,
      triggerMidiCommand: this.triggerMidiCommand,
      triggerProjectCommand: this.triggerProjectCommand,
    });
  };

  private drawAllGrids = () => {
    this.gridRenderer.draw();
    if (this.strategy.name === "classic") this.velocityGridRenderer.draw();
  };
  private drawAllNotes = () => {
    this.notesRenderer.draw();
    if (this.strategy.name === "classic") this.velocityRenderer.draw();
  };
  drawKeys = () => {
    this.pianoKeyboardRenderer.draw();
  };
  private drawTracklist = () => {
    this.tracklistRenderer.draw();
  };
}
