import { FederatedPointerEvent, Graphics, type Container } from "pixi.js";

interface TracklistDeps {
  container: Container;
  track: Graphics;
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

  updatePosition(e: FederatedPointerEvent) {
    this.tracklistPos = e.getLocalPosition(this.deps.container).x;
    this.deps.track.x = this.tracklistPos;
  }
  get tracklistPosition() {
    return this.tracklistPos;
  }
}
