import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { MidiObject, Project } from "../types/project";
import { Spinner } from "./components/ui/spinner";
import {
  Application,
  Bounds,
  Container,
  FederatedPointerEvent,
  FederatedWheelEvent,
  Graphics,
  Rectangle,
  type Renderer,
} from "pixi.js";
import type { Note, NoteJSON } from "@tonejs/midi/dist/Note";
import { Midi } from "@tonejs/midi";
import { colorFromValue } from "./lib/utils";
import { useHistoryState } from "@uidotdev/usehooks";

class NoteGraphic extends Graphics {
  noteData?: NoteJSON;
  isSelected: boolean = false;
}

class NoteVelocityGraphic extends Graphics {
  noteData?: NoteJSON;
  isSelected: boolean = false;
}

const PIANO_KEYS_WIDTH = 50;
const VELOCITY_ZONE_HEIGHT = 200;
const TOTAL_NOTES = 128;
const getRowHeight = (app: Application) => app.screen.height / TOTAL_NOTES;

export default function MidiEditor({ initProject }: { initProject: Project }) {
  const [project, setProject] = useState<Project>(initProject);
  const {
    state: midiObject,
    set: setMidiObject,
    undo,
    redo,
  } = useHistoryState<MidiObject | null>(null);

  useEffect(() => {
    const loadMidi = async () => {
      const midi = await Midi.fromUrl(project.midiFileUrl);
      const json = midi.toJSON();
      setMidiObject({
        durationInTicks: midi.durationTicks,
        header: json.header,
        tracks: json.tracks,
      });
    };
    loadMidi();
  }, []);

  useEffect(() => {
    const listenKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;

      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", listenKeyDown);
    return () => window.removeEventListener("keydown", listenKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    console.log("midi object changed");
  }, [midiObject]);

  useEffect(() => {
    console.log(project);
  }, [project]);

  return (
    <div
      className="w-screen h-screen p-30 border flex justify-center items-center mx-auto my-auto"
      onContextMenu={(e) => e.preventDefault()}
    >
      {midiObject ? (
        <PianoRoll midiObject={midiObject} setMidiObject={setMidiObject} />
      ) : (
        <Spinner className="size-5" />
      )}
    </div>
  );
}

function PianoRoll({
  midiObject,
  setMidiObject,
}: {
  midiObject: MidiObject;
  setMidiObject: (newPresent: MidiObject | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const contentRef = useRef<Container | null>(null);
  const pianoRollContainerRef = useRef<Container | null>(null);
  const velocityRef = useRef<Container | null>(null);
  const gridGraphics = useRef<Graphics | null>(null);
  const pianoKeysRef = useRef<Container | null>(null);
  const notesContainer = useRef<Container<NoteGraphic> | null>(null);
  const [pixiReady, setPixiReady] = useState(false);

  const midiRef = useRef(midiObject);

  useEffect(() => {
    midiRef.current = midiObject;
  }, [midiObject]);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      const app = new Application();
      await app.init({
        background: "#111111",
        resizeTo: containerRef.current!,
      });

      if (!isMounted) {
        app.destroy(true, { children: true });
        return;
      }

      appRef.current = app;
      containerRef.current!.innerHTML = "";
      containerRef.current!.appendChild(app.canvas);

      app.renderer.on("resize", () => {
        if (!isMounted) return;

        drawKeys(app, pianoKeys);
        drawGrid(app, content, grid);
        drawNotes(app, content, notes);
        updateHitbox(app, content);

        pianoKeys.scale.y = content.scale.y;
      });

      containerRef.current!.appendChild(app.canvas);

      const pianoRollContainer = new Container({
        eventMode: "passive",
      });

      const pianoRollMask = new Graphics();

      const content = new Container({
        x: PIANO_KEYS_WIDTH,
        cullableChildren: true,
        eventMode: "dynamic",
      });

      app.stage.addChild(pianoRollMask);
      pianoRollContainer.mask = pianoRollMask;

      const grid = new Graphics({ eventMode: "passive" });
      const notes = new Container<NoteGraphic>();
      const selectSquare = new Graphics({ eventMode: "passive" });
      const pianoKeys = createPianoKeys(app);

      content.addChild(grid);
      content.addChild(notes);
      content.addChild(selectSquare);
      pianoRollContainer.addChild(content);
      pianoRollContainer.addChild(pianoKeys);
      app.stage.addChild(pianoRollContainer);

      const updateMasks = () => {
        const w = app.screen.width;
        const h = app.screen.height - VELOCITY_ZONE_HEIGHT;
        pianoRollMask.clear().rect(0, 0, w, h).fill(0xffffff);
      };

      updateMasks();

      contentRef.current = content;
      pianoRollContainerRef.current = pianoRollContainer;
      gridGraphics.current = grid;
      notesContainer.current = notes;

      drawKeys(app, pianoKeys);
      attachZoom(app, content, pianoKeys, grid);
      attachPointerEvents(app, content, notes, pianoKeys, grid, selectSquare);
      drawGrid(app, content, grid);

      setPixiReady(true);
    };

    const onKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!notesContainer.current) return;

        const selectedNotesData = notesContainer.current.children
          .filter((child) => (child as NoteGraphic).isSelected)
          .map((child) => (child as NoteGraphic).noteData);

        if (selectedNotesData.length === 0) return;

        setMidiObject({
          ...midiRef.current,
          tracks: midiRef.current.tracks.map((track) => ({
            ...track,
            notes: track.notes.filter((note) => !selectedNotesData.includes(note)),
          })),
        });
      }
    };
    setup();
    window.addEventListener("keydown", onKeyDownGlobal);

    return () => {
      isMounted = false;
      window.removeEventListener("keydown", onKeyDownGlobal);

      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
      }
    };
  }, []);

  useEffect(() => {
    if (!pixiReady || !appRef.current || !contentRef.current || !notesContainer.current) return;

    console.log("Mise à jour des notes suite à changement midiObject");
    drawNotes(appRef.current, contentRef.current, notesContainer.current);
  }, [midiObject, pixiReady]);

  const createPianoKeys = (app: Application) => {
    const canvasHeight = app.screen.height;

    return new Container({
      width: PIANO_KEYS_WIDTH,
      height: canvasHeight,
      cullableChildren: true,
      eventMode: "none",
    });
  };

  const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

  const drawKeys = (app: Application, pianoKeys: Container) => {
    const rowHeight = app.screen.height / 75;
    pianoKeys.removeChildren();
    const keysGraphics = new Graphics();
    pianoKeys.addChild(keysGraphics);

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

  const updateHitbox = (app: Application, container: Container) => {
    const topLeft = container.toLocal({ x: 0, y: 0 });
    const bottomRight = container.toLocal({
      x: app.screen.width,
      y: app.screen.height,
    });

    container.hitArea = new Rectangle(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );
  };

  const attachZoom = (
    app: Application,
    container: Container,
    pianoKeys: Container,
    gridGraphics: Graphics,
  ) => {
    const ZOOM_FACTOR = 1.2;

    container.on("wheel", (e: FederatedWheelEvent) => {
      const worldPointerPos = { x: e.globalX, y: e.globalY };

      const localPointerPos = container.toLocal(worldPointerPos);

      const isZoomIn = e.deltaY < 0;
      const factor = isZoomIn ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

      if (e.shiftKey) {
        container.scale.y = Math.max(
          container.scale.y * factor,
          (app.screen.height - VELOCITY_ZONE_HEIGHT) / app.screen.height,
        );
        container.scale.y = Math.min(container.scale.y, 20);
      } else {
        const minScaleX = (app.screen.width - PIANO_KEYS_WIDTH) / midiRef.current.durationInTicks;
        const targetScaleX = container.scale.x * factor;
        container.scale.x = Math.max(targetScaleX, minScaleX);
      }

      const newWorldPointerPosition = container.toGlobal(localPointerPos);

      container.x -= newWorldPointerPosition.x - worldPointerPos.x;
      container.y -= newWorldPointerPosition.y - worldPointerPos.y;

      container.x = Math.min(container.x, PIANO_KEYS_WIDTH);
      container.y = Math.min(container.y, 0);

      const contentWidth = midiRef.current.durationInTicks * container.scale.x;
      const minX = app.screen.width - contentWidth;
      container.x = Math.max(container.x, minX);

      const contentHeight = app.screen.height * container.scale.y;
      const minY = app.screen.height - contentHeight;
      container.y = Math.max(container.y, minY - VELOCITY_ZONE_HEIGHT);

      pianoKeys.y = container.y;
      pianoKeys.scale.y = container.scale.y;
      updateHitbox(app, container);
      drawGrid(app, container, gridGraphics);
    });

    updateHitbox(app, container);
  };

  const rectsIntersect = (a: any, b: any) => {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  };

  const attachPointerEvents = (
    app: Application,
    container: Container,
    notesContainer: Container,
    pianoKeys: Container,
    gridGraphics: Graphics,
    selectGraphics: Graphics,
  ) => {
    let lastDragPos: { x: number; y: number } | null = null;
    let selectionOrigin: { x: number; y: number } | null = null;

    app.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    container.on("rightdown", (e) => {
      const pos = e.getLocalPosition(container);
      selectionOrigin = { x: pos.x, y: pos.y };
    });

    container.on("pointerdown", (e) => {
      if (e.altKey) {
        lastDragPos = { x: e.global.x, y: e.global.y };
      }
    });

    const trySelectZone = (e: FederatedPointerEvent) => {
      if (!selectionOrigin) return;

      const pos = e.getLocalPosition(container);

      const selectionRect = {
        x: Math.min(pos.x, selectionOrigin.x),
        y: Math.min(pos.y, selectionOrigin.y),
        width: Math.abs(pos.x - selectionOrigin.x),
        height: Math.abs(pos.y - selectionOrigin.y),
      };

      selectGraphics
        .clear()
        .rect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height)
        .fill({ color: 0xffffff, alpha: 0.3 })
        .stroke({ color: 0xffffff, width: 1, alpha: 0.5 });

      notesContainer.children.forEach((child) => {
        if (child instanceof Graphics) {
          const noteRect = {
            x: child.x,
            y: child.y,
            width: (child as any)._width || child.width,
            height: (child as any)._height || child.height,
          };

          const isSelected = rectsIntersect(selectionRect, noteRect);

          child.tint = isSelected ? "red" : 0xffaaaa;

          if (isSelected) {
            (child as any).isSelected = true;
          } else {
            (child as any).isSelected = false;
          }
        }
      });
    };

    const tryDraggingContainer = (e: FederatedPointerEvent) => {
      if (!lastDragPos) return;
      const dx = e.global.x - lastDragPos.x;
      const dy = e.global.y - lastDragPos.y;

      container.x += dx;
      container.y += dy;

      container.x = Math.min(container.x, PIANO_KEYS_WIDTH);
      container.y = Math.min(container.y, 0);

      const contentWidth = midiRef.current.durationInTicks * container.scale.x;
      const minX = app.screen.width - contentWidth;
      container.x = Math.max(container.x, minX);

      const contentHeight = app.screen.height * container.scale.y;
      const minY = app.screen.height - contentHeight;
      container.y = Math.max(container.y, minY - VELOCITY_ZONE_HEIGHT);

      pianoKeys.y = container.y;

      lastDragPos = { x: e.global.x, y: e.global.y };

      drawGrid(app, container, gridGraphics);
      updateHitbox(app, container);
    };

    container.on("globalpointermove", (e) => {
      tryDraggingContainer(e);
      trySelectZone(e);
    });

    const stopDragOrSelect = () => {
      selectGraphics.clear();
      lastDragPos = null;
      selectionOrigin = null;
    };

    container.on("pointerup", stopDragOrSelect);
    container.on("pointerupoutside", stopDragOrSelect);
  };

  const drawNotes = (
    app: Application,
    container: Container,
    notesLayer: Container<NoteGraphic>,
  ) => {
    const rowHeight = getRowHeight(app);

    notesLayer.removeChildren().forEach((child) => child.destroy());

    midiRef.current.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const noteGraphic = new NoteGraphic();
        noteGraphic.rect(0, 0, note.durationTicks, rowHeight);
        noteGraphic.fill(colorFromValue(track.channel));

        noteGraphic.x = note.ticks;
        noteGraphic.y = (127 - note.midi) * rowHeight;
        noteGraphic.eventMode = "static";
        noteGraphic.cursor = "pointer";

        noteGraphic.noteData = note;
        noteGraphic.isSelected = false;

        attachNoteEvents(app, container, noteGraphic, note);
        notesLayer.addChild(noteGraphic);
      });
    });
  };

  const drawGrid = (app: Application, container: Container, gridGraphics: Graphics) => {
    if (!gridGraphics.parent) container.addChildAt(gridGraphics, 0);
    gridGraphics.clear();

    const rowHeight = getRowHeight(app);
    const currentScaleX = container.scale.x;
    const viewLeftTick = container.toLocal({ x: PIANO_KEYS_WIDTH, y: 0 }).x;
    const viewRightTick = container.toLocal({ x: app.screen.width, y: 0 }).x;
    const visibleWidthTicks = viewRightTick - viewLeftTick;

    gridGraphics.beginPath();
    for (let i = 0; i < TOTAL_NOTES; i++) {
      const midi = 127 - i;
      if (isBlackKey(midi)) {
        gridGraphics.rect(viewLeftTick, i * rowHeight, visibleWidthTicks, rowHeight);
      }
    }
    gridGraphics.fill({ color: "#2c2c2c" });

    gridGraphics.beginPath();
    for (let i = 0; i <= TOTAL_NOTES; i++) {
      gridGraphics.moveTo(viewLeftTick, i * rowHeight).lineTo(viewRightTick, i * rowHeight);
    }
    gridGraphics.stroke({ color: "#222222", width: 1, pixelLine: true });

    const drawSubdivisions = (tickStep: number, color: string, minGap: number) => {
      const gapInPixels = tickStep * currentScaleX;
      if (gapInPixels < minGap) return;

      gridGraphics.beginPath();
      const firstVisibleTick = Math.floor(viewLeftTick / tickStep) * tickStep;
      for (let i = firstVisibleTick; i <= viewRightTick; i += tickStep) {
        if (i < 0 || i > midiRef.current.durationInTicks) continue;
        gridGraphics.moveTo(i, 0).lineTo(i, app.screen.height);
      }
      gridGraphics.stroke({ color, pixelLine: true });
    };

    const ppq = midiRef.current.header.ppq;
    drawSubdivisions(ppq / 4, "#222222", 15);
    drawSubdivisions(ppq, "#333333", 10);
    drawSubdivisions(ppq * 4, "#444444", 5);
  };

  const attachNoteEvents = (
    app: Application,
    container: Container,
    graphic: Graphics,
    noteData: NoteJSON,
  ) => {
    let dragInitialStates: Map<Graphics, { x: number; y: number }> | null = null;
    let dragStartMousePos: { x: number; y: number } | null = null;

    graphic.on("pointerover", () => {
      graphic.alpha = 0.7;
    });

    graphic.on("pointerout", () => {
      graphic.alpha = 1;
    });

    graphic.on("rightclick", (e) => {
      e.stopPropagation();
      setMidiObject({
        ...midiRef.current,
        tracks: midiRef.current.tracks.map((t) => ({
          ...t,
          notes: t.notes.filter((n) => n !== noteData),
        })),
      });
    });

    const finalizeDrag = () => {
      if (!dragInitialStates) return;

      const currentRowHeight = getRowHeight(app);

      const movedNotesMap = new Map();
      dragInitialStates.forEach((_, noteGraphic) => {
        const g = noteGraphic as any;
        const newMidi = 127 - Math.round(g.y / currentRowHeight);
        movedNotesMap.set(g.noteData, { ticks: g.x, midi: newMidi });
        g.alpha = 1;
      });

      setMidiObject({
        ...midiRef.current,
        tracks: midiRef.current.tracks.map((track) => ({
          ...track,
          notes: track.notes.map((note) => {
            const update = movedNotesMap.get(note);
            return update ? { ...note, ticks: update.ticks, midi: update.midi } : note;
          }),
        })),
      });

      dragInitialStates = null;
      dragStartMousePos = null;
    };

    graphic.on("pointerup", finalizeDrag);
    graphic.on("pointerupoutside", finalizeDrag);

    graphic.on("globalpointermove", (e) => {
      if (!dragInitialStates || !dragStartMousePos) return;

      const currentRowHeight = getRowHeight(app);
      const currentMousePos = container.toLocal(e.global);

      const dx = currentMousePos.x - dragStartMousePos.x;
      const dy = currentMousePos.y - dragStartMousePos.y;

      dragInitialStates.forEach((initialPos, noteGraphic) => {
        noteGraphic.x = initialPos.x + dx;

        const rawY = initialPos.y + dy;
        noteGraphic.y = Math.round(rawY / currentRowHeight) * currentRowHeight;
      });
    });

    graphic.on("pointerdown", (e) => {
      if (e.button === 2 || e.altKey) return;
      e.stopPropagation();

      const noteGraphic = graphic as any;
      if (!noteGraphic.isSelected) {
        noteGraphic.isSelected = true;
        noteGraphic.tint = "red";
      }

      dragStartMousePos = container.toLocal(e.global);

      dragInitialStates = new Map();
      notesContainer.current?.children.forEach((child) => {
        const c = child as any;
        if (c.isSelected && c instanceof Graphics) {
          dragInitialStates?.set(c, { x: c.x, y: c.y });
          c.alpha = 0.5;
        }
      });
    });
  };

  const handleKeydown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    console.log(e.key, e.code);
  };

  const cleanup = () => {
    if (appRef.current) {
      appRef.current.destroy(true, { children: true });
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  };

  return (
    <div className="flex flex-col w-full h-full gap-5">
      <div className="w-full h-full" ref={containerRef} onKeyDown={handleKeydown} />
    </div>
  );
}
