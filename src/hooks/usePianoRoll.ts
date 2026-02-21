import type { Command } from "@/commands";
import type { PianoRollProps } from "@/pianoRoll";
import PianoRollEngine from "@/pianoRollEngine";
import { useEffect, useRef } from "react";
import type { MidiObject, Project } from "types/project";

export default function usePianoRoll(props: PianoRollProps) {
  const { midiObject, setMidiObject, project, setProject } = props;
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

  return { containerRef };
}
