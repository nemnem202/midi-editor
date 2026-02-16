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
  private handleWidth: number = 10;
  constructor(deps: VelocityRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { container, velocityContainer, midiObject, engine } = this.deps;

    container.removeChildren().forEach((child) => child.destroy());

    midiObject().tracks[engine.project.config.displayedTrackIndex].notes.forEach((note) => {
      const sprite = new NoteSprite(Texture.WHITE);
      sprite.eventMode = "static";
      sprite.x = note.ticks;
      sprite.y = velocityContainer.height - velocityContainer.height * note.velocity;

      sprite.width = 10 / velocityContainer.scale._x;
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
    console.log(this.handleWidth, this.deps.velocityContainer.scale._x);
    this.handleWidth = 10 / this.deps.velocityContainer.scale._x;
    console.log(this.handleWidth);
    this.deps.container.children.forEach((sprite) => {
      sprite.width = 10 / this.deps.velocityContainer.scale._x;
    });
  }

  private attachControls() {
    const { container, triggerMidiCommand, velocityContainer } = this.deps;

    let startDragPos: { x: number; y: number } | null = null;

    const handleMouseUp = () => {
      startDragPos = null;

      const notesData: NoteUpdateData[] = container.children.map((e) => ({
        note: e.noteData,
        velocity: Math.max(0, Math.min(1 - e.y / velocityContainer.height, 1)),
      }));

      triggerMidiCommand(new UpdateNotesCommand(notesData));
    };
    const handleMouseDown = (e: FederatedPointerEvent) => {
      const pos = container.toLocal(e.global);
      startDragPos = { x: pos.x, y: pos.y };
    };

    const handleMouseMove = (e: FederatedPointerEvent) => {
      if (!startDragPos) return;
      const currentPosition = container.toLocal(e.global);

      container.children.forEach((c) => {
        if (!startDragPos) return;
        if (
          c.x + this.handleWidth > currentPosition.x &&
          c.x - this.handleWidth < currentPosition.x
        ) {
          c.y = currentPosition.y;
          c.height = container.height - currentPosition.y;
        }
      });
    };

    container.on("pointerdown", handleMouseDown);
    container.on("globalpointermove", handleMouseMove);
    container.on("pointerup", handleMouseUp);
    container.on("pointerupoutside", handleMouseUp);
  }
}
