import { createRoot } from "react-dom/client";
import MidiEditorContainer from "./midiEditorContainer";
import DEFAULT_PROJECT from "./config/default/project";
import "../index.css";
createRoot(document.getElementById("root")!).render(
  <MidiEditorContainer initProject={DEFAULT_PROJECT} />,
);
