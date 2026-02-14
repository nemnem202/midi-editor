import {
  Application,
  Container,
  FederatedPointerEvent,
  FederatedWheelEvent,
  Graphics,
  Rectangle,
} from "pixi.js";
import type { MidiObject, Note } from "types/project";
import { colorFromValue } from "./lib/utils";
import {
  DeleteNoteCommand,
  MoveNotesCommand,
  SelectNotesCommand,
  UnSelectAllNotesCommand,
  type Command,
} from "./commands";

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

  constructor(
    root_div: HTMLDivElement,
    midi_object: MidiObject,
    onCommand: (command: Command<MidiObject>) => void,
  ) {
    this.root_div = root_div;
    this.midi_object = midi_object;
    this.onCommand = onCommand;
  }
  public destroy() {
    if (this.app) {
      this.app.renderer.off("resize");
      this.app.destroy(true, { children: true });
    }
  }
  public updateMidiData(newMidi: MidiObject) {
    this.midi_object = newMidi;
    if (this.is_ready) {
      this.updateMidiSize();
      this.drawAllNotes();
      this.drawAllGrids();
    }
  }
  init = async () => {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: this.root_div,
      antialias: true,
    });

    this.root_div.appendChild(this.app.canvas);
    this.resizeOnInit();

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

    this.updateMask();
    this.addResizeObserver();
    this.drawKeys();
    this.drawAllGrids();

    this.drawAllNotes();
    this.attachZoom();
    this.attachPointerEvents();

    this.is_ready = true;
  };
  private resizeOnInit = () => {
    const availableWidth = this.app.screen.width - PIANO_KEYS_WIDTH;
    const initialScaleX = availableWidth / this.midi_object.durationInTicks;
    this.notes_grid_container.scale.set(initialScaleX, 1);
    this.notes_grid_container.position.set(PIANO_KEYS_WIDTH, 0);
    this.velocity_container.scale.set(initialScaleX, 1);
    this.velocity_container.position.set(
      PIANO_KEYS_WIDTH,
      this.app.screen.height - VELOCITY_ZONE_HEIGHT + VELOCITY_ZONE_GAP,
    );
  };
  private updateMidiSize = () => {
    // 1. NE JAMAIS faire this.notes_grid_container.width = ...
    // Cela écrase le scale.x calculé par le zoom.

    // 2. Vérifier si le zoom actuel est toujours valide pour la nouvelle durée
    const minScaleX = (this.app.screen.width - PIANO_KEYS_WIDTH) / this.midi_object.durationInTicks;
    if (this.notes_grid_container.scale.x < minScaleX) {
      this.notes_grid_container.scale.x = minScaleX;
    }

    // 3. Recalculer les limites de position pour éviter de voir du vide à droite
    // si le nouveau morceau est plus court que le précédent.
    const contentWidth = this.midi_object.durationInTicks * this.notes_grid_container.scale.x;
    const minX = this.app.screen.width - contentWidth;

    // On recadre la position X si elle dépasse les nouvelles limites
    this.notes_grid_container.x = Math.max(
      Math.min(this.notes_grid_container.x, PIANO_KEYS_WIDTH),
      minX,
    );

    // Synchronisation de la zone de vélocité
    this.velocity_container.x = this.notes_grid_container.x;
    this.velocity_container.scale.x = this.notes_grid_container.scale.x;
  };
  private addResizeObserver = () => {
    this.app.renderer.on("resize", () => {
      this.updateMask();
      this.drawKeys();
      this.drawAllGrids();

      this.drawAllNotes();
      this.updateHitbox();
      this.piano_keys_container.y = this.notes_grid_container.y;
      this.piano_keys_container.scale.y = this.notes_grid_container.scale.y;
    });
  };
  private updateMask = () => {
    const w = this.app.screen.width;
    const h = this.app.screen.height - VELOCITY_ZONE_HEIGHT;
    const v_h = VELOCITY_ZONE_HEIGHT - VELOCITY_ZONE_GAP;

    this.piano_roll_bg
      .clear()
      .roundRect(0, 0, w, h, CORNER_RADIUS)
      .stroke({ color: "#161616", alignment: 1, width: 1 });

    this.main_mask.clear().roundRect(0, 0, w, h, CORNER_RADIUS).fill(0xffffff);

    this.velocity_bg
      .clear()
      .roundRect(PIANO_KEYS_WIDTH, h + VELOCITY_ZONE_GAP, w - PIANO_KEYS_WIDTH, v_h, CORNER_RADIUS)
      .stroke({ color: "#161616", alignment: 1, width: 1 });

    this.velocity_mask
      .clear()
      .roundRect(PIANO_KEYS_WIDTH, h + VELOCITY_ZONE_GAP, w - PIANO_KEYS_WIDTH, v_h, CORNER_RADIUS)
      .fill(0xffffff);
  };
  private getRowHeight = () => this.app.screen.height / TOTAL_NOTES;
  private isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
  private rectsIntersect = (a: any, b: any) => {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  };
  private drawGrid = () => {
    this.grid.clear();
    const rowHeight = this.getRowHeight();
    const currentScaleX = this.notes_grid_container.scale.x;
    const viewLeftTick = this.notes_grid_container.toLocal({ x: PIANO_KEYS_WIDTH, y: 0 }).x;
    const viewRightTick = this.notes_grid_container.toLocal({ x: this.app.screen.width, y: 0 }).x;
    const visibleWidthTicks = viewRightTick - viewLeftTick;

    this.grid.beginPath();
    for (let i = 0; i < TOTAL_NOTES; i++) {
      const midi = 127 - i;
      if (this.isBlackKey(midi)) {
        this.grid.rect(viewLeftTick, i * rowHeight, visibleWidthTicks, rowHeight);
      }
    }
    this.grid.fill({ color: "#2c2c2c" });

    this.grid.beginPath();
    for (let i = 0; i <= TOTAL_NOTES; i++) {
      this.grid.moveTo(viewLeftTick, i * rowHeight).lineTo(viewRightTick, i * rowHeight);
    }
    this.grid.stroke({ color: "#222222", width: 1, pixelLine: true });

    const drawSubdivisions = (tickStep: number, color: string, minGap: number) => {
      const gapInPixels = tickStep * currentScaleX;
      if (gapInPixels < minGap) return;

      this.grid.beginPath();
      const firstVisibleTick = Math.floor(viewLeftTick / tickStep) * tickStep;
      for (let i = firstVisibleTick; i <= viewRightTick; i += tickStep) {
        if (i < 0 || i > this.midi_object.durationInTicks) continue;
        this.grid.moveTo(i, 0).lineTo(i, this.app.screen.height);
      }
      this.grid.stroke({ color, pixelLine: true });
    };

    const ppq = this.midi_object.header.ppq;
    drawSubdivisions(ppq / 4, "#222222", 15);
    drawSubdivisions(ppq, "#333333", 10);
    drawSubdivisions(ppq * 4, "#444444", 5);
  };
  private drawNotes = () => {
    const rowHeight = this.getRowHeight();

    this.notes_container.removeChildren().forEach((child) => child.destroy());

    this.midi_object.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const noteGraphic = new NoteGraphic();
        noteGraphic.rect(0, 0, note.durationTicks, rowHeight);
        noteGraphic.fill(colorFromValue(track.channel));

        noteGraphic.x = note.ticks;
        noteGraphic.y = (127 - note.midi) * rowHeight;
        noteGraphic.eventMode = "static";
        noteGraphic.cursor = "pointer";

        noteGraphic.noteData = note;

        if (note.isSelected) {
          noteGraphic.tint = "#ff0000";
        }

        this.attachNoteEvents(noteGraphic);
        this.notes_container.addChild(noteGraphic);
      });
    });
  };
  private attachNoteEvents = (graphic: NoteGraphic) => {
    let dragInitialStates: Map<NoteGraphic, { x: number; y: number }> | null = null;
    let dragStartMousePos: { x: number; y: number } | null = null;

    // graphic.on("pointerover", () => {
    //   graphic.alpha = 0.7;
    // });

    // graphic.on("pointerout", () => {
    //   graphic.alpha = 1;
    // });

    graphic.on("rightclick", (e) => {
      e.stopPropagation();
      if (graphic.noteData) this.onCommand(new DeleteNoteCommand(graphic.noteData));
    });

    const finalizeDrag = () => {
      if (!dragInitialStates) return;

      const currentRowHeight = this.getRowHeight();

      let reached_zero = false;

      const movedNotesMap = new Map();
      dragInitialStates.forEach((_, noteGraphic) => {
        const g = noteGraphic as any;
        const newMidi = 127 - Math.round(g.y / currentRowHeight);

        movedNotesMap.set(g.noteData, { ticks: g.x, midi: newMidi });
        // g.alpha = 1;
      });
      if (!reached_zero)
        this.onCommand(
          new MoveNotesCommand(
            Array.from(movedNotesMap.entries()).map(([note, data]) => ({
              note,
              ticks: data.ticks,
              midi: data.midi,
            })),
          ),
        );

      dragInitialStates = null;
      dragStartMousePos = null;
    };

    graphic.on("pointerup", finalizeDrag);
    graphic.on("pointerupoutside", finalizeDrag);

    graphic.on("globalpointermove", (e) => {
      if (!dragInitialStates || !dragStartMousePos) return;

      const currentRowHeight = this.getRowHeight();
      const currentMousePos = this.notes_grid_container.toLocal(e.global);

      let dx = currentMousePos.x - dragStartMousePos.x;
      const dy = currentMousePos.y - dragStartMousePos.y;

      dragInitialStates.forEach((initialPos) => {
        if (initialPos.x + dx < 0) return (dx = -initialPos.x);
      });

      dragInitialStates.forEach((initialPos, noteGraphic) => {
        noteGraphic.x = initialPos.x + dx;

        const rawY = initialPos.y + dy;
        noteGraphic.y = Math.round(rawY / currentRowHeight) * currentRowHeight;
      });
    });

    graphic.on("pointerdown", (e) => {
      if (e.button === 2 || e.altKey) return;
      e.stopPropagation();

      if (!graphic.noteData.isSelected) {
        this.onCommand(new SelectNotesCommand([graphic.noteData]));
      }

      dragStartMousePos = this.notes_grid_container.toLocal(e.global);

      dragInitialStates = new Map();
      this.notes_container.children.forEach((child) => {
        const c = child;
        if (c.noteData.isSelected) {
          dragInitialStates?.set(c, { x: c.x, y: c.y });
          // c.alpha = 0.5;
        }
      });
    });
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
  private updateHitbox = () => {
    const topLeft = this.notes_grid_container.toLocal({ x: 0, y: 0 });
    const bottomRight = this.notes_grid_container.toLocal({
      x: this.app.screen.width,
      y: this.app.screen.height,
    });

    this.notes_grid_container.hitArea = new Rectangle(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );
  };
  private attachZoom = () => {
    const ZOOM_FACTOR = 1.2;

    this.notes_grid_container.on("wheel", (e: FederatedWheelEvent) => {
      const worldPointerPos = { x: e.globalX, y: e.globalY };

      const localPointerPos = this.notes_grid_container.toLocal(worldPointerPos);

      const isZoomIn = e.deltaY < 0;
      const factor = isZoomIn ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

      if (e.shiftKey) {
        this.notes_grid_container.scale.y = Math.max(
          this.notes_grid_container.scale.y * factor,
          (this.app.screen.height - VELOCITY_ZONE_HEIGHT) / this.app.screen.height,
        );
        this.notes_grid_container.scale.y = Math.min(this.notes_grid_container.scale.y, 20);
      } else {
        const minScaleX =
          (this.app.screen.width - PIANO_KEYS_WIDTH) / this.midi_object.durationInTicks;
        const targetScaleX = this.notes_grid_container.scale.x * factor;
        this.notes_grid_container.scale.x = Math.max(targetScaleX, minScaleX);
      }

      const newWorldPointerPosition = this.notes_grid_container.toGlobal(localPointerPos);

      this.notes_grid_container.x -= newWorldPointerPosition.x - worldPointerPos.x;
      this.notes_grid_container.y -= newWorldPointerPosition.y - worldPointerPos.y;

      this.notes_grid_container.x = Math.min(this.notes_grid_container.x, PIANO_KEYS_WIDTH);
      this.notes_grid_container.y = Math.min(this.notes_grid_container.y, 0);

      const contentWidth = this.midi_object.durationInTicks * this.notes_grid_container.scale.x;
      const minX = this.app.screen.width - contentWidth;
      this.notes_grid_container.x = Math.max(this.notes_grid_container.x, minX);

      const contentHeight = this.app.screen.height * this.notes_grid_container.scale.y;
      const minY = this.app.screen.height - contentHeight;
      this.notes_grid_container.y = Math.max(
        this.notes_grid_container.y,
        minY - VELOCITY_ZONE_HEIGHT,
      );

      this.piano_keys_container.y = this.notes_grid_container.y;
      this.piano_keys_container.scale.y = this.notes_grid_container.scale.y;
      this.velocity_container.x = this.notes_grid_container.x;
      this.velocity_container.scale.x = this.notes_grid_container.scale.x;
      this.updateHitbox();
      this.drawAllGrids();
    });

    this.updateHitbox();
  };
  private attachPointerEvents = () => {
    let lastDragPos: { x: number; y: number } | null = null;
    let selectionOrigin: { x: number; y: number } | null = null;

    this.app.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this.notes_grid_container.on("rightdown", (e) => {
      const pos = e.getLocalPosition(this.notes_grid_container);
      selectionOrigin = { x: pos.x, y: pos.y };
    });

    this.notes_grid_container.on("pointerdown", (e) => {
      if (e.altKey) {
        lastDragPos = { x: e.global.x, y: e.global.y };
      }
      this.onCommand(new UnSelectAllNotesCommand([]));
    });

    const trySelectZone = (e: FederatedPointerEvent) => {
      if (!selectionOrigin) return;

      const pos = e.getLocalPosition(this.notes_grid_container);

      const selectionRect = {
        x: Math.min(pos.x, selectionOrigin.x),
        y: Math.min(pos.y, selectionOrigin.y),
        width: Math.abs(pos.x - selectionOrigin.x),
        height: Math.abs(pos.y - selectionOrigin.y),
      };

      this.select_square
        .clear()
        .rect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height)
        .fill({ color: 0xffffff, alpha: 0.3 })
        .stroke({ color: 0xffffff, width: 1, alpha: 0.5 });

      const selectedNotes: Note[] = [];

      this.notes_container.children.forEach((noteGraphic) => {
        const noteRect = {
          x: noteGraphic.x,
          y: noteGraphic.y,
          width: (noteGraphic as any)._width || noteGraphic.width,
          height: (noteGraphic as any)._height || noteGraphic.height,
        };

        const isSelected = this.rectsIntersect(selectionRect, noteRect);

        if (isSelected) selectedNotes.push(noteGraphic.noteData);
      });

      this.onCommand(new SelectNotesCommand(selectedNotes));
    };

    const tryDraggingContainer = (e: FederatedPointerEvent) => {
      if (!lastDragPos) return;
      const dx = e.global.x - lastDragPos.x;
      const dy = e.global.y - lastDragPos.y;

      this.notes_grid_container.x += dx;
      this.notes_grid_container.y += dy;

      this.notes_grid_container.x = Math.min(this.notes_grid_container.x, PIANO_KEYS_WIDTH);
      this.notes_grid_container.y = Math.min(this.notes_grid_container.y, 0);

      const contentWidth = this.midi_object.durationInTicks * this.notes_grid_container.scale.x;
      const minX = this.app.screen.width - contentWidth;
      this.notes_grid_container.x = Math.max(this.notes_grid_container.x, minX);

      const contentHeight = this.app.screen.height * this.notes_grid_container.scale.y;
      const minY = this.app.screen.height - contentHeight;
      this.notes_grid_container.y = Math.max(
        this.notes_grid_container.y,
        minY - VELOCITY_ZONE_HEIGHT,
      );

      this.piano_keys_container.y = this.notes_grid_container.y;
      this.velocity_container.x = this.notes_grid_container.x;
      lastDragPos = { x: e.global.x, y: e.global.y };

      this.drawAllGrids();
      this.updateHitbox();
    };

    this.notes_grid_container.on("globalpointermove", (e) => {
      tryDraggingContainer(e);
      trySelectZone(e);
    });

    const stopDragOrSelect = () => {
      this.select_square.clear();
      lastDragPos = null;
      selectionOrigin = null;
    };

    this.notes_grid_container.on("pointerup", stopDragOrSelect);
    this.notes_grid_container.on("pointerupoutside", stopDragOrSelect);
  };
  private drawVelocityGrid = () => {
    this.velocityGrid.clear();

    const currentScaleX = this.notes_grid_container.scale.x;

    const viewLeftTick = this.notes_grid_container.toLocal({ x: PIANO_KEYS_WIDTH, y: 0 }).x;
    const viewRightTick = this.notes_grid_container.toLocal({ x: this.app.screen.width, y: 0 }).x;

    this.velocityGrid.beginPath();
    this.velocityGrid.rect(viewLeftTick, 0, viewRightTick - viewLeftTick, VELOCITY_ZONE_HEIGHT);
    this.velocityGrid.fill({ color: "#1a1a1a" });

    const drawSub = (tickStep: number, color: string, minGap: number) => {
      const gapInPixels = tickStep * currentScaleX;
      if (gapInPixels < minGap) return;

      this.velocityGrid.beginPath();
      const firstVisibleTick = Math.floor(viewLeftTick / tickStep) * tickStep;

      for (let i = firstVisibleTick; i <= viewRightTick; i += tickStep) {
        if (i < 0 || i > this.midi_object.durationInTicks) continue;

        this.velocityGrid.moveTo(i, 0).lineTo(i, VELOCITY_ZONE_HEIGHT);
      }
      this.velocityGrid.stroke({ color, pixelLine: true });
    };

    const ppq = this.midi_object.header.ppq;
    drawSub(ppq, "#333333", 10);
    drawSub(ppq * 4, "#444444", 5);
  };
  private drawVelocityNotes = () => {
    this.velocity_notes_container.removeChildren().forEach((child) => child.destroy());

    this.midi_object.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const noteGraphic = new NoteGraphic();
        noteGraphic
          .moveTo(
            note.ticks,
            this.velocity_container.height - this.velocity_container.height * note.velocity,
          )
          .lineTo(note.ticks, this.velocity_container.height);
        noteGraphic.stroke({
          color: colorFromValue(note.velocity * 10),
          pixelLine: true,
        });

        noteGraphic.eventMode = "static";
        noteGraphic.cursor = "pointer";

        noteGraphic.noteData = note;
        this.velocity_notes_container.addChild(noteGraphic);
      });
    });
  };
  private drawAllGrids = () => {
    this.drawGrid();
    this.drawVelocityGrid();
  };
  private drawAllNotes = () => {
    this.drawNotes();
    this.drawVelocityNotes();
  };
  private attachKeyboardEvents = () => {};
}
