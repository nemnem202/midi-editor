import { getNearestSubdivisionRoundedTick } from "../lib/utils";
import type PianoRollEngine from "@/pianoRollEngine";
import { FederatedPointerEvent, Graphics, type Container } from "pixi.js";

interface TracklistDeps {
  container: Container;
  track: Graphics;
  engine: PianoRollEngine;
}

export default class TracklistRenderer {
  private tracklistPos: number = 0;
  constructor(private deps: TracklistDeps) {}

  draw() {
    const { track } = this.deps;
    const localHeight = 10000;

    track.clear().moveTo(0, 0).lineTo(0, localHeight).stroke({
      color: "#32882f",
      width: 2,
      pixelLine: true,
    });

    track.x = this.tracklistPos;
  }

  updatePosition(e: FederatedPointerEvent | number) {
    if (e instanceof FederatedPointerEvent) {
      this.tracklistPos = e.getLocalPosition(this.deps.container).x;
    } else {
      this.tracklistPos = e;
    }
    this.deps.track.x = getNearestSubdivisionRoundedTick(
      this.deps.engine.midiObject.header.ppq,
      [1, 1],
      this.tracklistPos,
    );
  }
  get tracklistPosition() {
    return this.tracklistPos;
  }
}
