import { Application, Container, Graphics } from "pixi.js";
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
  });

  private velocity_container: Container = new Container({
    x: PIANO_KEYS_WIDTH,
    height: VELOCITY_ZONE_HEIGHT - VELOCITY_ZONE_GAP,
    cullableChildren: true,
    eventMode: "dynamic",
  });

  private grid: Graphics = new Graphics({ eventMode: "passive" });
  private velocityGrid: Graphics = new Graphics({ eventMode: "passive" });
  private select_square: Graphics = new Graphics({ eventMode: "passive" });
  private main_mask: Graphics = new Graphics({ eventMode: "passive" });
  private velocity_mask: Graphics = new Graphics();
  private midi_object: MidiObject;
  private piano_roll_bg: Graphics = new Graphics();
  private velocity_bg: Graphics = new Graphics();
  private onCommand: (command: Command<MidiObject>) => void;

  private viewportController!: ViewportController;
  private selectionController!: SelectionController;
  private panController!: PanController;

  private gridRenderer!: GridRenderer;
  private velocityGridRenderer!: VelocityGridRenderer;
  private notesRenderer!: NotesRenderer;
  private velocityRenderer!: VelocityRenderer;
  private layoutManager!: LayoutManager;

  constructor(
    root_div: HTMLDivElement,
    midi_object: MidiObject,
    onCommand: (command: Command<MidiObject>) => void,
  ) {
    this.root_div = root_div;
    this.midi_object = midi_object;
    this.onCommand = onCommand;
  }
  init = async () => {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: this.root_div,
      antialias: true,
    });

    this.root_div.appendChild(this.app.canvas);

    this.notes_grid_container.addChild(this.grid, this.notes_container, this.select_square);
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

    this.createGridRenderer();
    this.createVelocityGridRenderer();
    this.createNotesRenderer();
    this.createVelocityRenderer();
    this.createLayoutManager();

    this.drawKeys();
    this.drawAllGrids();

    this.drawAllNotes();
    this.attachViewportController();

    this.attachSelectionController();
    this.attachPanController();

    this.is_ready = true;
  };
  public destroy() {
    if (this.app) {
      this.app.renderer.off("resize");
      this.app.destroy(true, { children: true });
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
    this.viewportController.attachZoom();
  };
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
  private attachSelectionController = () => {
    this.selectionController = new SelectionController({
      notesGrid: this.notes_grid_container,
      notesContainer: this.notes_container,
      selectSquare: this.select_square,
      onCommand: this.onCommand,
    });

    this.selectionController.attach();
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

    this.panController.attach();
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
  private drawAllGrids = () => {
    this.gridRenderer.draw();
    this.velocityGridRenderer.draw();
  };
  private drawAllNotes = () => {
    this.notesRenderer.draw();
    this.velocityRenderer.draw();
  };
  private drawKeys = () => {
    const rowHeight = this.app.screen.height / 75;
    this.piano_keys_container.removeChildren();
    const keysGraphics = new Graphics();
    this.piano_keys_container.addChild(keysGraphics);

    for (let i = 0; i < 75; i++) {
      keysGraphics
        .rect(0, i * rowHeight, PIANO_KEYS_WIDTH, rowHeight)
        .fill({ color: "#ffffff" })
        .stroke({ color: "#000000", pixelLine: true, width: 0.5 });
    }

    for (let i = 0; i < 75; i++) {
      const midi = 75 - i;
      if (![2, 6].includes((midi - 1) % 7)) {
        keysGraphics
          .rect(
            0,
            i * rowHeight - rowHeight / 2 + rowHeight * 0.1,
            PIANO_KEYS_WIDTH * (2 / 3),
            rowHeight * 0.8,
          )
          .fill({ color: "#000000" });
      }
    }
  };
}
