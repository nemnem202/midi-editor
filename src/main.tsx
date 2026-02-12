import { createRoot } from "react-dom/client";
import MidiEditor from "./midiEditor";
import DEFAULT_PROJECT from "../config/default/project";
import "../index.css";
createRoot(document.getElementById("root")!).render(<MidiEditor initProject={DEFAULT_PROJECT} />);
