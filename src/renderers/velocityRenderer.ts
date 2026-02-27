import { Container, FederatedPointerEvent, Texture } from "pixi.js";
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
  private pool: NoteSprite[] = [];
  private readonly HANDLE_WIDTH_PX = 5;

  constructor(deps: VelocityRendererDeps) {
    this.deps = deps;
    this.attachContainerControls();
  }

  draw() {
    const { container, velocityContainer, midiObject, engine } = this.deps;
    const notes = midiObject().tracks[engine.currentTrack].notes;

    const sortedNotes = [...notes].sort((a, b) => (a.isSelected ? 1 : -1));

    container.children.forEach((c) => (c.visible = false));

    sortedNotes.forEach((note, index) => {
      let sprite: NoteSprite;

      if (index < container.children.length) {
        sprite = container.children[index];
      } else {
        sprite = this.pool.pop() || new NoteSprite(Texture.WHITE);
        container.addChild(sprite);
      }

      const vHeight = note.velocity * velocityContainer.height;

      sprite.visible = true;
      sprite.x = note.ticks;
      sprite.y = velocityContainer.height - vHeight;
      sprite.width = this.HANDLE_WIDTH_PX / velocityContainer.scale.x;
      sprite.height = vHeight;
      sprite.tint = colorFromValue(note.midi);
      sprite.alpha = note.isSelected ? 1 : 0.2;
      sprite.eventMode = "static";
      sprite.noteData = note;
    });

    while (container.children.length > sortedNotes.length) {
      const unused = container.removeChildAt(container.children.length - 1);
      unused.visible = false;
      this.pool.push(unused);
    }
  }
  updateWidth() {
    const scaleX = this.deps.velocityContainer.scale.x;
    this.deps.container.children.forEach((sprite) => {
      sprite.width = this.HANDLE_WIDTH_PX / scaleX;
    });
  }

  private attachContainerControls() {
    const { container, triggerMidiCommand, velocityContainer } = this.deps;
    let isDragging = false;

    const handleMouseDown = (e: FederatedPointerEvent) => {
      if (e.button === 0) isDragging = true;
      document.body.style.cursor = "crosshair";
    };

    const handleMouseMove = (e: FederatedPointerEvent) => {
      if (!isDragging) return;

      const currentPosition = container.toLocal(e.global);
      const scaleX = velocityContainer.scale.x;
      const zoneHeight = velocityContainer.height;

      container.children.forEach((sprite) => {
        if (!sprite.noteData.isSelected) return;

        const distance = Math.abs(sprite.x - currentPosition.x);

        if (distance < this.HANDLE_WIDTH_PX / scaleX) {
          const clampedY = Math.max(0, Math.min(currentPosition.y, zoneHeight));

          sprite.y = clampedY;
          sprite.height = zoneHeight - clampedY;

          const tempVelocity = 1 - clampedY / zoneHeight;
          sprite.tint = colorFromValue(sprite.noteData.midi, (1 - tempVelocity) * 100);
        }
      });
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;

      const zoneHeight = velocityContainer.height;

      const updates: NoteUpdateData[] = container.children
        .filter((s) => s.noteData.isSelected)
        .map((s) => ({
          note: s.noteData,
          velocity: 1 - s.y / zoneHeight,
        }));

      if (updates.length > 0) {
        triggerMidiCommand(new UpdateNotesCommand(updates, this.deps.engine.currentTrack));
      }
      document.body.style.cursor = "default";
    };

    container.on("pointerdown", handleMouseDown);
    container.on("globalpointermove", handleMouseMove);
    container.on("pointerup", handleMouseUp);
    container.on("pointerupoutside", handleMouseUp);
  }
}
