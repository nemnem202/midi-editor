import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { MidiObject, Project } from "../types/project";
import { Spinner } from "./components/ui/spinner";
import { Midi } from "@tonejs/midi";
import { useHistoryState } from "@uidotdev/usehooks";
import PianoRollEngine from "./pianoRollEngine";
import { type Command } from "./commands";
import Stats from "stats.js";
import { getMidiLength } from "./lib/utils";

export default function MidiEditor({ initProject }: { initProject: Project }) {
  const [project, setProject] = useState<Project>(initProject);
  const [isLoading, setIsLoading] = useState(true);
  const {
    state: midiObject,
    set: setMidiObject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<MidiObject | null>(null);

  const midiRef = useRef(midiObject);

  useEffect(() => {
    midiRef.current = midiObject;
  }, [midiObject]);

  useEffect(() => {
    const listenKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const currentMidi = midiRef.current;
      if (!currentMidi) return;
      if (e.ctrlKey) {
        if (key === "z" && canUndo) {
          e.preventDefault();
          undo();
        } else if (key === "y" && canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener("keydown", listenKeyDown);
    return () => window.removeEventListener("keydown", listenKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  useEffect(() => {
    const loadMidi = async () => {
      const midi = await Midi.fromUrl(project.midiFileUrl);
      const json = midi.toJSON();
      const initialMidiObject = {
        durationInTicks: midi.durationTicks,
        header: json.header,
        tracks: json.tracks,
      };
      const midiObject = {
        ...initialMidiObject,
        tracks: initialMidiObject.tracks.map((track, index) => ({
          ...track,
          notes: track.notes.map((n) => ({
            ...n,
            isSelected: false,
            isInCurrentTrack: index === 0,
          })),
        })),
      };
      setMidiObject({ ...midiObject, durationInTicks: getMidiLength(midiObject) + 200 });
      setIsLoading(false);
    };
    loadMidi();
    trackPerfs();
  }, []);

  const trackPerfs = () => {
    const stats = new Stats();

    stats.showPanel(0);

    document.body.appendChild(stats.dom);

    function animate() {
      stats.begin();

      stats.end();

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  };

  return (
    <>
      <div
        className="w-screen h-screen p-30 border flex justify-center items-center mx-auto my-auto"
        onContextMenu={(e) => e.preventDefault()}
      >
        {midiObject && !isLoading ? (
          <PianoRoll
            midiObject={midiObject}
            setMidiObject={setMidiObject}
            project={project}
            setProject={setProject}
          />
        ) : (
          <Spinner className="size-5" />
        )}
      </div>
    </>
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
      <div className="w-full h-full" ref={containerRef} />
    </div>
  );
}
