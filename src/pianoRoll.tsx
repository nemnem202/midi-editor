import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { MidiObject, Project } from "../types/project";
import { useMidiContext } from "./midiProvider";
import usePianoRoll from "./hooks/usePianoRoll";
import { Button } from "./components/ui/button";

export default function PianoRollLoader({ children }: { children: ReactNode }) {
  const ctx = useMidiContext();
  if (!ctx) return null;

  const [hasClicked, setHasClicked] = useState(false);

  const { midiObject, project, setMidiObject, setProject, isLoading } = ctx;

  if (isLoading || !midiObject) {
    return <>{children}</>;
  }

  return (
    <>
      {hasClicked ? (
        <PianoRoll
          midiObject={midiObject}
          project={project}
          setMidiObject={setMidiObject}
          setProject={setProject}
        />
      ) : (
        <div className="size-full flex justify-center items-center">
          <Button variant={"ghost"} onClick={() => setHasClicked(true)}>
            Start ?
          </Button>{" "}
        </div>
      )}
    </>
  );
}

export interface PianoRollProps {
  midiObject: MidiObject;
  setMidiObject: (newPresent: MidiObject | null) => void;
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
}

function PianoRoll(props: PianoRollProps) {
  const { containerRef } = usePianoRoll(props);
  return (
    <div className="flex flex-col w-full h-full gap-5">
      <div className="w-full h-full focus:outline-none" ref={containerRef} tabIndex={0} />
    </div>
  );
}
