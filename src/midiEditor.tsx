import type { Project } from "types/project";
import MidiProvider, { useMidiContext } from "./midiProvider";
import PianoRollLoader from "./pianoRoll";
import { Spinner } from "./components/ui/spinner";
import ControlsPannel from "./components/controls";
import TrackSelect from "./components/trackSelect";
import { Button } from "./components/ui/button";

export default function MidiEditor({ initProject }: { initProject: Project }) {
  return (
    <MidiProvider initProject={initProject}>
      <div
        className="w-screen h-screen px-30 py-10 border flex flex-col justify-center items-center mx-auto my-auto gap-5 relative"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute top-5 right-5 select-none">
          <Button className="">Enregistrer</Button>
        </div>
        <Title />
        <div className="w-full flex justify-between items-center">
          <ControlsPannel />
          <TrackSelect />
        </div>
        <PianoRollLoader>
          <Spinner className="size-20" />
        </PianoRollLoader>
      </div>
    </MidiProvider>
  );
}

function Title() {
  const { project } = useMidiContext();

  return (
    <h1 className="text-center text-4xl font-extrabold tracking-tight text-balance h-20 select-none">
      {project.title}
    </h1>
  );
}
