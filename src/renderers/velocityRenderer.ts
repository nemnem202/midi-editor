import { Container } from "pixi.js";
import type { MidiObject } from "types/project";
import { NoteGraphic } from "./notesRenderer";
import { colorFromValue } from "../lib/utils";

interface VelocityRendererDeps {
  container: Container<NoteGraphic>;
  velocityContainer: Container;
  midiObject: () => MidiObject;
}

export class VelocityRenderer {
  private deps: VelocityRendererDeps;

  constructor(deps: VelocityRendererDeps) {
    this.deps = deps;
  }

  draw() {
    const { container, velocityContainer, midiObject } = this.deps;

    container.removeChildren().forEach((child) => child.destroy());

    midiObject().tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const graphic = new NoteGraphic();

        graphic
          .moveTo(note.ticks, velocityContainer.height - velocityContainer.height * note.velocity)
          .lineTo(note.ticks, velocityContainer.height);

        graphic.stroke({
          color: colorFromValue(note.velocity * 10),
          pixelLine: true,
        });

        graphic.eventMode = "static";
        graphic.cursor = "pointer";
        graphic.noteData = note;

        container.addChild(graphic);
      });
    });
  }
}
