import type { Project } from "types/project";
import MidiProvider, { useMidiContext } from "./midiProvider";
import PianoRollLoader from "./pianoRoll";
import { Spinner } from "./components/ui/spinner";
import ControlsPannel from "./components/controls";
import TrackSelect from "./components/trackSelect";
import { Button } from "./components/ui/button";
import { useState } from "react";
import { Maximize, Minimize } from "lucide-react";

export default function MidiEditor({ initProject }: { initProject: Project }) {
  const [fullScreen, setFullScreen] = useState(false);
  const [hasClicked, setClicked] = useState(false);

  return (
    <MidiProvider initProject={initProject}>
      {fullScreen ? (
        <div
          className="absolute inset-0 top-0 left-0 bg-background p-4"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="relative size-full flex flex-col gap-2">
            <div className=" w-full flex justify-between items-center">
              <ControlsPannel />
              <TrackSelect />
            </div>
            <div className="relative size-full">
              <div className="absolute top-0 right-0 m-3">
                <Button
                  variant={"outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullScreen(false);
                  }}
                >
                  <Minimize />
                </Button>
              </div>
              <PianoRollLoader hasClicked={hasClicked} setClicked={setClicked}>
                <Spinner className="size-20" />
              </PianoRollLoader>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="w-screen h-screen px-30 py-10 border flex flex-col justify-center items-center mx-auto my-auto gap-5 relative"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="absolute top-5 right-5 select-none">
            <Button className="">Save</Button>
          </div>
          <Title />
          <div className="w-full flex justify-between items-center">
            <ControlsPannel />
            <TrackSelect />
          </div>
          <div className="relative size-full flex items-center justify-center">
            <div className="absolute top-0 right-0 m-3">
              <Button
                variant={"outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  setFullScreen(true);
                }}
              >
                <Maximize />
              </Button>
            </div>
            <PianoRollLoader hasClicked={hasClicked} setClicked={setClicked}>
              <Spinner className="size-20" />
            </PianoRollLoader>
          </div>
        </div>
      )}
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
