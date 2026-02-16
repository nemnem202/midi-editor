import { Container, FederatedPointerEvent, Rectangle, Texture } from "pixi.js";
import type { MidiObject, Note } from "types/project";
import { colorFromValue } from "../lib/utils";
import PianoRollEngine, { NoteGraphic, NoteSprite } from "../pianoRollEngine";
import { UpdateNotesCommand, type Command, type PositionData } from "../commands";

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

    this.attachEvents();
  }

  draw() {
    const { container, velocityContainer, midiObject, engine } = this.deps;

    container.removeChildren().forEach((child) => child.destroy());
    midiObject().tracks[engine.project.config.displayedTrackIndex].notes.forEach((note) => {
      const sprite = new NoteSprite(Texture.WHITE);

      sprite.x = note.ticks;
      sprite.y = velocityContainer.height - velocityContainer.height * note.velocity;

      sprite.width = 1 / velocityContainer.scale._x;
      sprite.height = 200;

      sprite.tint = colorFromValue(note.velocity * 10);

      sprite.eventMode = "static";
      sprite.noteData = note;

      container.addChild(sprite);
    });
  }

  updateWidth() {
    this.deps.container.children.forEach((sprite) => {
      sprite.width = 1 / this.deps.velocityContainer.scale._x;
    });
  }

  private attachEvents() {
    const { velocityContainer, container } = this.deps;
    let lastLocalMousePos: { x: number; y: number } | null = null;
    let atLeastOneVelocityEventHasBeenChanged = false;
    velocityContainer.on("pointerdown", (e) => {
      const local = container.toLocal(e.global);
      lastLocalMousePos = { x: local.x, y: local.y };
    });

    const handlePointerUp = () => {
      lastLocalMousePos = null;
      if (atLeastOneVelocityEventHasBeenChanged) {
        atLeastOneVelocityEventHasBeenChanged = false;
        const notes: PositionData[] = container.children.map((c) => ({
          note: c.noteData,
          velocity: 1 - c.y / velocityContainer.height,
        }));

        this.deps.triggerMidiCommand(new UpdateNotesCommand(notes));
      }
    };
    velocityContainer.on("pointerup", handlePointerUp);
    velocityContainer.on("pointerupoutside", handlePointerUp);
    velocityContainer.on("globalpointermove", (e) => {
      const currentLocal = container.toLocal(e.global);
      container.children.forEach((child) => {
        if (lastLocalMousePos && child.x > currentLocal.x - 100 && child.x < currentLocal.x + 100)
          child.y = Math.max(0, currentLocal.y);
        atLeastOneVelocityEventHasBeenChanged = true;
      });
    });
  }
}
