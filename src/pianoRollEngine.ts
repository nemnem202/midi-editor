import { Application, Container, FederatedWheelEvent, Graphics, Rectangle } from "pixi.js";
import type { MidiObject, Note } from "types/project";
import { type Command } from "./commands";
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

const PIANO_KEYS_WIDTH = 50;
const VELOCITY_ZONE_HEIGHT = 150;
const VELOCITY_ZONE_GAP = 20;
const TOTAL_NOTES = 128;
const CORNER_RADIUS = 10;

class NoteGraphic extends Graphics {
  noteData: Note = {
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
  private is_ready = false;

  private midi_object: MidiObject;
  private onCommand: (command: Command<MidiObject>) => void;

  private root_div: HTMLDivElement;
  private app: Application = new Application();

  private piano_keys_container: Container = new Container({ eventMode: "passive" });
  private piano_roll_container: Container = new Container({ eventMode: "passive" });
  private notes_container: Container<NoteGraphic> = new Container<NoteGraphic>({
    eventMode: "passive",
  });
  private velocity_notes_container: Container<NoteGraphic> = new Container<NoteGraphic>({
    eventMode: "passive",
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
    eventMode: "dynamic",
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

  constructor(
    root_div: HTMLDivElement,
    midi_object: MidiObject,
    onCommand: (command: Command<MidiObject>) => void,
  ) {
    this.root_div = root_div;
    this.midi_object = midi_object;
    this.onCommand = onCommand;
  }

  get midiObject(): MidiObject {
    return this.midi_object;
  }
  get tracklistPos(): number {
    return this.tracklistRenderer.tracklistPosition;
  }

  init = async () => {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: this.root_div,
      antialias: true,
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

    this.attachViewportController();
    this.attachSelectionController();
    this.attachPanController();
    this.attachKeyboardController();

    this.drawKeys();
    this.drawAllGrids();
    this.drawTracklist();
    this.drawAllNotes();

    this.is_ready = true;
  };

  setTracklistPos(pos: number) {
    this.tracklistRenderer.updatePosition(pos);
  }

  public destroy() {
    if (this.app) {
      this.app.renderer.off("resize");
      this.app.destroy(true, { children: true });
      this.keyboardController.destroy();
    }
  }
  public updateMidiData(newMidi: MidiObject) {
    this.midi_object = newMidi;
    if (this.is_ready) {
      this.viewportController.updateMidiSize();
      this.drawAllNotes();
      this.drawAllGrids();
    }
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
    this.notes_grid_container.on("wheel", (e: FederatedWheelEvent) =>
      this.viewportController.handleZoom(e),
    );
    this.notes_grid_container.on("pointerdown", (e) => {
      if (e.button === 0 && e.altKey) {
        this.panController.updateLastDragPos(e);
      } else if (e.button === 0) {
        this.selectionController.unselectAll();
        this.tracklistRenderer.updatePosition(e);
      } else {
        this.selectionController.updateSelectionOrigin(e);
      }
    });

    this.notes_grid_container.on("globalpointermove", (e) => {
      this.selectionController.tryDrawSelection(e);
      this.panController.tryPan(e);
    });

    this.notes_grid_container.on("pointerup", (e) => {
      this.selectionController.finalize(e);
      this.panController.releaseLastDragPos();
    });
    this.notes_grid_container.on("pointerupoutside", (e) => {
      this.selectionController.finalize(e);
      this.panController.releaseLastDragPos();
    });
  };

  //////////////////////////
  //   Create renderers   //
  //////////////////////////

  private createGridRenderer = () => {
    this.gridRenderer = new GridRenderer({
      graphics: this.grid,
      notesGrid: this.notes_grid_container,
      appScreen: this.app.screen,
      midiObject: () => this.midi_object,
      constants: {
        TOTAL_NOTES,
        PIANO_KEYS_WIDTH,
      },
    });
  };
  private createVelocityGridRenderer = () => {
    this.velocityGridRenderer = new VelocityGridRenderer({
      graphics: this.velocityGrid,
      notesGrid: this.notes_grid_container,
      appScreen: this.app.screen,
      midiObject: () => this.midi_object,
      constants: {
        PIANO_KEYS_WIDTH,
        VELOCITY_ZONE_HEIGHT,
      },
    });
  };
  private createNotesRenderer = () => {
    this.notesRenderer = new NotesRenderer({
      container: this.notes_container,
      notesGrid: this.notes_grid_container,
      appScreen: this.app.screen,
      midiObject: () => this.midi_object,
      onCommand: this.onCommand,
      constants: { TOTAL_NOTES },
    });
  };
  private createVelocityRenderer = () => {
    this.velocityRenderer = new VelocityRenderer({
      container: this.velocity_notes_container,
      velocityContainer: this.velocity_container,
      midiObject: () => this.midi_object,
    });
  };
  private createTracklistRenderer = () => {
    this.tracklistRenderer = new TracklistRenderer({
      container: this.notes_grid_container,
      track: this.tracklist,
    });
  };
  private createLayoutManager = () => {
    this.layoutManager = new LayoutManager({
      app: this.app,
      rootDiv: this.root_div,
      notesGrid: this.notes_grid_container,
      pianoKeysContainer: this.piano_keys_container,
      velocityContainer: this.velocity_container,
      mainMask: this.main_mask,
      velocityMask: this.velocity_mask,
      pianoRollBg: this.piano_roll_bg,
      velocityBg: this.velocity_bg,
      midiObject: () => this.midi_object,
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

  //////////////////////////
  //   Attach controllers //
  //////////////////////////

  private attachViewportController = () => {
    this.viewportController = new ViewportController({
      appScreen: this.app.screen,
      notesGrid: this.notes_grid_container,
      velocityContainer: this.velocity_container,
      pianoKeysContainer: this.piano_keys_container,
      midiObject: () => this.midi_object,
      constants: {
        PIANO_KEYS_WIDTH,
        VELOCITY_ZONE_HEIGHT,
      },
      onAfterTransform: () => {
        this.drawAllGrids();
        this.layoutManager.updateHitbox();
      },
    });
  };
  private attachSelectionController = () => {
    this.selectionController = new SelectionController({
      notesGrid: this.notes_grid_container,
      notesContainer: this.notes_container,
      selectSquare: this.select_square,
      onCommand: this.onCommand,
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
      onCommand: this.onCommand,
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
