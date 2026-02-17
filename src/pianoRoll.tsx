import { useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { MidiObject, Project } from "../types/project";
import PianoRollEngine from "./pianoRollEngine";
import { type Command } from "./commands";
import { useMidiContext } from "./midiProvider";

export default function PianoRollLoader({ children }: { children: ReactNode }) {
  const ctx = useMidiContext();
  if (!ctx) return null;

  const { midiObject, project, setMidiObject, setProject, isLoading } = ctx;

  if (isLoading || !midiObject) {
    return <>{children}</>;
  }

  return (
    <PianoRoll
      midiObject={midiObject}
      project={project}
      setMidiObject={setMidiObject}
      setProject={setProject}
    />
  );
}

function PianoRoll({
  midiObject,
  setMidiObject,
  project,
  setProject,
}: {
  midiObject: MidiObject;
  setMidiObject: (newPresent: MidiObject | null) => void;
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PianoRollEngine | null>(null);
  const midiRef = useRef(midiObject);
  const projectRef = useRef(project);

  useEffect(() => {
    midiRef.current = midiObject;
  }, [midiObject]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const handleMidiCommand = (command: Command<MidiObject>) => {
    if (midiRef.current) {
      const newState = command.execute(midiRef.current);
      setMidiObject(newState);
    }
  };

  const handleProjectCommand = (command: Command<Project>) => {
    if (projectRef.current) {
      const newState = command.execute(projectRef.current);
      setProject(newState);
    }
  };

  const midiCommandRef = useRef(handleMidiCommand);
  const projectCommandRef = useRef(handleProjectCommand);

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;
    const engine = new PianoRollEngine(
      containerRef.current,
      midiObject,
      (midiCommand) => midiCommandRef.current(midiCommand),
      project,
      (projectCommand) => projectCommandRef.current(projectCommand),
    );
    engineRef.current = engine;
    engine.init();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current && midiObject) {
      engineRef.current.updateMidiData(midiObject);
    }
  }, [midiObject]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateProjectData(project);
    }
  }, [project]);

  return (
    <div className="flex flex-col w-full h-full gap-5">
      <div className="w-full h-full focus:outline-none" ref={containerRef} tabIndex={0} />
    </div>
  );
}
