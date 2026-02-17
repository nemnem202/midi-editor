import type { Project } from "types/project";
import MidiProvider from "./midiProvider";
import PianoRollLoader from "./pianoRoll";
import { Spinner } from "./components/ui/spinner";
import ControlsPannel from "./components/controls";
import TrackSelect from "./components/trackSelect";

export default function MidiEditor({ initProject }: { initProject: Project }) {
  return (
    <MidiProvider initProject={initProject}>
      <div
        className="w-screen h-screen p-30 border flex justify-center items-center mx-auto my-auto"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex flex-col w-full h-full gap-5 items-center justify-center">
          <div className="w-full flex justify-between items-center">
            <ControlsPannel />
            <TrackSelect />
          </div>
          <PianoRollLoader>
            <Spinner className="size-20" />
          </PianoRollLoader>
        </div>
      </div>
    </MidiProvider>
  );
}
