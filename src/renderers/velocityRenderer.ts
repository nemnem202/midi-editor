import { Container, Texture } from "pixi.js";
import type { MidiObject } from "types/project";
import { colorFromValue } from "../lib/utils";
import PianoRollEngine, { NoteGraphic, NoteSprite } from "../pianoRollEngine";

interface VelocityRendererDeps {
  engine: PianoRollEngine;
  container: Container<NoteSprite>;
  velocityContainer: Container;
  midiObject: () => MidiObject;
}

export class VelocityRenderer {
  private deps: VelocityRendererDeps;

  constructor(deps: VelocityRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { container, velocityContainer, midiObject, engine } = this.deps;

    container.removeChildren().forEach((child) => child.destroy());

    // .tracks.forEach((track) => {
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
    // });
  }

  updateWidth() {
    this.deps.container.children.forEach((sprite) => {
      sprite.width = 1 / this.deps.velocityContainer.scale._x;
    });
  }
}
