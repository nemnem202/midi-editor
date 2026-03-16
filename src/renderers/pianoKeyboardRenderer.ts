import type MidiEditorEngine from "@/midiEditorEngine";
import type { EditorStrategy } from "@/strategies/types";
import { Graphics, Text, TextStyle, textureFrom, type Application, type Container } from "pixi.js";

interface KeyboardDeps {
  app: Application;
  engine: MidiEditorEngine;
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
    const { app, piano_keys_container, constants, engine } = this.deps;
    const strategy = engine.strategy;

    const baseWidth = 2000;
    const baseHeight = 2000;

    const rowHeight = baseHeight / 75;
    const keyWidth = baseWidth / 75;
    const pianoSize = constants.PIANO_KEYS_WIDTH;

    piano_keys_container.removeChildren();
    const keysGraphics = new Graphics();
    piano_keys_container.addChild(keysGraphics);

    let currentMidi = 0;

    for (let i = 0; i < 75; i++) {
      this.drawWhiteNote(
        strategy,
        i,
        rowHeight,
        keyWidth,
        pianoSize,
        keysGraphics,
        currentMidi,
        piano_keys_container,
      );
      if (![4, 11].includes(currentMidi % 12)) {
        currentMidi += 2;
      } else {
        currentMidi += 1;
      }
    }

    currentMidi = 0;

    for (let i = 0; i < 75; i++) {
      currentMidi += 1;
      if (![5, 0].includes(currentMidi % 12)) {
        this.drawBlackNote(
          strategy,
          i,
          rowHeight,
          keyWidth,
          pianoSize,
          keysGraphics,
          currentMidi,
          piano_keys_container,
        );
        currentMidi += 1;
      }
    }
  };
  drawWhiteNote(
    strategy: EditorStrategy,
    i: number,
    rowHeight: number,
    keyWidth: number,
    pianoSize: number,
    keysGraphics: Graphics,
    currentMidi: number,
    piano_keys_container: Container,
  ) {
    const whiteBounds = strategy.getWhiteKeyBounds(i, rowHeight, keyWidth, pianoSize);

    keysGraphics
      .rect(whiteBounds.x, whiteBounds.y, whiteBounds.width, whiteBounds.height)
      .fill({ color: "#ffffff" })
      .stroke({ color: "#000000", pixelLine: true, width: 0.5 });

    const whiteTxt = new Text({
      text: (currentMidi % 12).toString(),
      style: new TextStyle({
        fontFamily: "Arial",
        fontWeight: "bold",
        fontSize: 10,
        fill: "#000000",
      }),
    });

    whiteTxt.anchor.set(0);
    whiteTxt.x = whiteBounds.x + 1;
    whiteTxt.y = whiteBounds.y + whiteBounds.height - 10;
    piano_keys_container.addChild(whiteTxt);
  }
  drawBlackNote(
    strategy: EditorStrategy,
    i: number,
    rowHeight: number,
    keyWidth: number,
    pianoSize: number,
    keysGraphics: Graphics,
    currentMidi: number,
    piano_keys_container: Container,
  ) {
    const blackBounds = strategy.getBlackKeyBounds(i, rowHeight, keyWidth, pianoSize);

    keysGraphics
      .rect(blackBounds.x, blackBounds.y, blackBounds.width, blackBounds.height)
      .fill({ color: "#000000" });

    const blackTxt = new Text({
      text: (currentMidi % 12).toString(),
      style: new TextStyle({
        fontFamily: "Arial",
        fontWeight: "bold",
        fontSize: 10,
        fill: "#ffffff",
      }),
    });

    blackTxt.anchor.set(0);
    blackTxt.x = blackBounds.x;
    blackTxt.y = blackBounds.y + blackBounds.height - 10;

    piano_keys_container.addChild(blackTxt);
  }
}
