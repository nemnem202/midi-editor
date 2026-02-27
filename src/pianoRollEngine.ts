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
import { getNearestSubdivisionRoundedTick } from "./lib/utils";
import _soundEngine from "./sound/sound-engine";
import MenuRenderer from "./renderers/menuRenderer";
import { Midi } from "tone";

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

export default class PianoRollEngine {
  private _soundEngine!: _soundEngine;
  private is_ready = false;
  private engineMidiObject: MidiObject;
  private engineProject: Project;
  private triggerMidiCommand: (command: Command<MidiObject>) => void;
  private triggerProjectCommand: (command: Command<Project>) => void;

  private root_div: HTMLDivElement;
  private app: Application = new Application();

  private piano_keys_container: Container = new Container({ eventMode: "passive" });
  private piano_roll_container: Container = new Container({ eventMode: "passive" });
  private notes_container: Container<NoteSprite> = new Container<NoteSprite>({
    eventMode: "passive",
  });
  private velocity_notes_container: Container<NoteSprite> = new Container<NoteSprite>({
    eventMode: "dynamic",
    hitArea: new Rectangle(0, 0, 100000, VELOCITY_ZONE_HEIGHT),
  });
  private notes_grid_container: Container = new Container({
    x: PIANO_KEYS_WIDTH,
    cullableChildren: true,
    eventMode: "dynamic",
    hitArea: new Rectangle(0, 0, 100000, 100000),
  });
  private velocity_container: Container = new Container({
    x: PIANO_KEYS_WIDTH,
    height: VELOCITY_ZONE_HEIGHT - VELOCITY_ZONE_GAP,
    cullableChildren: true,
    eventMode: "static",
  });

  private velocity_mask: Graphics = new Graphics({ eventMode: "passive" });
  private piano_roll_bg: Graphics = new Graphics({ eventMode: "passive" });
  private select_square: Graphics = new Graphics({ eventMode: "passive" });
  private velocityGrid: Graphics = new Graphics({ eventMode: "passive" });
  private velocity_bg: Graphics = new Graphics({ eventMode: "passive" });
  private main_mask: Graphics = new Graphics({ eventMode: "passive" });
  private tracklist: Graphics = new Graphics({ eventMode: "passive" });
  private grid: Graphics = new Graphics({ eventMode: "passive" });

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
  ) {
    this.root_div = root_div;
    this.engineMidiObject = midiObject;
    this.engineProject = project;
    this.triggerMidiCommand = triggerMidiCommand;
    this.triggerProjectCommand = triggerProjectCommand;
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

  init = async () => {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: this.root_div,
      antialias: false,
    });

    this.createArborescence();
    this.addListeners();

    this.createGridRenderer();
    this.createVelocityGridRenderer();
    this.createNotesRenderer();
    this.createVelocityRenderer();
    this.createLayoutManager();
    this.createTracklistRenderer();
    this.createPianoKeyboardRenderer();
    this.createMenuRenderer();

    this.attachViewportController();
    this.attachSelectionController();
    this.attachPanController();
    this.attachKeyboardController();

    this.drawKeys();
    this.drawAllGrids();
    this.drawTracklist();
    this.drawAllNotes();

    this.is_ready = true;

    await this.get_soundEngine();

    this.app.ticker.add(() => {
      if (this.is_ready && this.project.config.isPlaying) {
        const currentTick = this._soundEngine.currentTicks;
        this.tracklistRenderer.updatePositionFromPlaying(currentTick);
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
    this.engineMidiObject = newMidi;
    if (this.is_ready) {
      this.viewportController.updateMidiSize();
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
        this.tracklistRenderer.updatePositionFromPlaying(newConfig.currentTracklistTick);
      }
      if (newConfig.gridSubdivisions !== prevConfig.gridSubdivisions) {
        this.drawAllGrids();
      }
      if (newConfig.displayedTrackIndex !== prevConfig.displayedTrackIndex) {
        this.drawAllNotes();
      }
      this._soundEngine.updateProject(this.engineProject);
    }
  }

  private async get_soundEngine() {
    await _soundEngine.init(this.project, this.midiObject, (tick) =>
      this.tracklistRenderer.updatePositionFromPlaying(tick),
    );
    this._soundEngine = _soundEngine.get();
  }

  private createArborescence() {
    this.root_div.appendChild(this.app.canvas);

    this.notes_grid_container.addChild(
      this.grid,
      this.notes_container,
      this.select_square,
      this.tracklist,
    );
    this.velocity_container.addChild(this.velocityGrid, this.velocity_notes_container);

    this.piano_roll_container.addChild(this.notes_grid_container);
    this.piano_roll_container.addChild(this.piano_keys_container);

    this.app.stage.addChild(this.main_mask);
    this.piano_roll_container.mask = this.main_mask;
    this.app.stage.addChild(this.velocity_mask);
    this.velocity_container.mask = this.velocity_mask;

    this.app.stage.addChild(this.piano_roll_container);
    this.app.stage.addChild(this.velocity_container);
    this.app.stage.addChild(this.piano_roll_bg);
    this.app.stage.addChild(this.velocity_bg);
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
          [1, 1],
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
        this.selectionController.unselectAll();
        this.tracklistRenderer.updatePositionFromUser(e);
      } else {
        this.selectionController.updateSelectionOrigin(e);
      }
    });

    this.notes_grid_container.on("wheel", (e: FederatedWheelEvent) => {
      this.menuRenderer.clearMenu();
      this.viewportController.handleZoom(e);
    });

    this.notes_grid_container.on("globalpointermove", (e) => {
      this.selectionController.tryDrawSelection(e);
      this.panController.tryPan(e);
    });

    this.notes_grid_container.on("pointerup", (e) => {
      if (!this.selectionController._startedToSelect && e.button === 2) {
        this.menuRenderer.drawMenu(e);
      }
      document.body.style.cursor = "default";
      this.selectionController.finalize(e);
      this.panController.releaseLastDragPos();
    });
    this.notes_grid_container.on("pointerupoutside", (e) => {
      this.menuRenderer.clearMenu();
      this.selectionController.finalize(e);
      this.panController.releaseLastDragPos();
    });
  };

  //////////////////////////
  //   Create renderers   //
  //////////////////////////

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
      pianoRollBg: this.piano_roll_bg,
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
      constants: {
        PIANO_KEYS_WIDTH,
      },
      piano_keys_container: this.piano_keys_container,
    });
  };

  private createMenuRenderer = () => {
    this.menuRenderer = new MenuRenderer({ engine: this, app: this.app });
  };

  //////////////////////////
  //   Attach controllers //
  //////////////////////////

  private attachViewportController = () => {
    this.viewportController = new ViewportController({
      appScreen: this.app.screen,
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
        this.velocityRenderer.updateWidth();
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

  /////////////////////////////
  //   Draw updated elements //
  /////////////////////////////

  private drawAllGrids = () => {
    this.gridRenderer.draw();
    this.velocityGridRenderer.draw();
  };
  private drawAllNotes = () => {
    this.notesRenderer.draw();
    this.velocityRenderer.draw();
  };
  private drawKeys = () => {
    this.pianoKeyboardRenderer.draw();
  };
  private drawTracklist = () => {
    this.tracklistRenderer.draw();
  };
}
