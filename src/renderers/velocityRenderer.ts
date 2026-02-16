import { Container, FederatedPointerEvent, Rectangle, Texture } from "pixi.js";
import type { MidiObject } from "types/project";
import { colorFromValue } from "../lib/utils";
import PianoRollEngine, { NoteSprite } from "../pianoRollEngine";
import { UpdateNotesCommand, type Command, type NoteUpdateData } from "../commands";

interface VelocityRendererDeps {
  engine: PianoRollEngine;
  container: Container<NoteSprite>;
  velocityContainer: Container;
  midiObject: () => MidiObject;
  triggerMidiCommand: (command: Command<MidiObject>) => void;
}

export class VelocityRenderer {
  private deps: VelocityRendererDeps;

  constructor(deps: VelocityRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { container, velocityContainer, midiObject, engine } = this.deps;

    container.removeChildren().forEach((child) => child.destroy());

    midiObject().tracks[engine.project.config.displayedTrackIndex].notes.forEach((note) => {
      const sprite = new NoteSprite(Texture.WHITE);

      sprite.x = note.ticks;
      sprite.y = velocityContainer.height - velocityContainer.height * note.velocity;

      sprite.width = 1 / velocityContainer.scale._x;
      sprite.height = velocityContainer.height * note.velocity;

      sprite.tint = colorFromValue(note.velocity * 10);

      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      sprite.noteData = note;

      container.addChild(sprite);
    });

    this.attachControls();
  }

  updateWidth() {
    this.deps.container.children.forEach((sprite) => {
      sprite.width = 1 / this.deps.velocityContainer.scale._x;
    });
  }

  private attachControls() {
    const { container, triggerMidiCommand, velocityContainer } = this.deps;
    container.hitArea = new Rectangle(0, 0, velocityContainer.width, velocityContainer.height);

    let startDragPos: { x: number; y: number } | null = null;

    const handleMouseUp = () => {
      startDragPos = null;
      const notesData: NoteUpdateData[] = container.children.map((e) => ({
        note: e.noteData,
        velocity: 1 - e.y / velocityContainer.height,
      }));

      triggerMidiCommand(new UpdateNotesCommand(notesData));
    };
    const handleMouseDown = (e: FederatedPointerEvent) => {
      console.log("oeoe");
      const pos = container.toLocal(e.global);
      startDragPos = { x: pos.x, y: pos.y };
    };

    const handleMouseMove = (e: FederatedPointerEvent) => {
      if (!startDragPos) return;
      const currentPosition = container.toLocal(e.global);

      container.children.forEach((c) => {
        if (!startDragPos) return;
        if (
          (c.x > startDragPos.x && c.x < currentPosition.x) ||
          (c.x < startDragPos.x && c.x > currentPosition.x)
        ) {
          c.y = currentPosition.y;
        }
      });
    };

    container.on("pointerdown", handleMouseDown);
    container.on("globalpointermove", handleMouseMove);
    container.on("pointerup", handleMouseUp);
    container.on("pointerupoutside", handleMouseUp);
  }
}
