import { Graphics, type Application, type Container } from "pixi.js";

interface KeyboardDeps {
  app: Application;
  piano_keys_container: Container;
  constants: {
    PIANO_KEYS_WIDTH: number;
  };
}

export default class PianoKeyboardRenderer {
  constructor(private deps: KeyboardDeps) {
    this.deps = deps;
  }

  draw = () => {
    const { app, piano_keys_container, constants } = this.deps;

    const rowHeight = app.screen.height / 75;
    piano_keys_container.removeChildren();
    const keysGraphics = new Graphics();
    piano_keys_container.addChild(keysGraphics);

    for (let i = 0; i < 75; i++) {
      keysGraphics
        .rect(0, i * rowHeight, constants.PIANO_KEYS_WIDTH, rowHeight)
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
            constants.PIANO_KEYS_WIDTH * (2 / 3),
            rowHeight * 0.8,
          )
          .fill({ color: "#000000" });
      }
    }
  };
}
