import { Midi } from "@tonejs/midi";
import { useHistoryState, type HistoryState } from "@uidotdev/usehooks";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Context,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { MidiObject, Project } from "types/project";
import { getMidiLength } from "./lib/utils";
import Stats from "stats.js";

type MidiContextValues = {
  midiObject: MidiObject | null;
  setMidiObject: (newPresent: MidiObject | null) => void;
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  isLoading: boolean;
  historyState: HistoryState<MidiObject | null>;
};

export const MidiContext = createContext<MidiContextValues | null>(null);

export default function MidiProvider({
  initProject,
  children,
}: {
  initProject: Project;
  children: ReactNode;
}) {
  const [project, setProject] = useState<Project>(initProject);
  const [isLoading, setIsLoading] = useState(true);
  const {
    state: midiObject,
    set: setMidiObject,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
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
    // trackPerfs();
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
    <MidiContext.Provider
      value={{
        isLoading,
        midiObject,
        setMidiObject,
        project,
        setProject,
        historyState: {
          state: midiObject,
          set: setMidiObject,
          undo,
          redo,
          canUndo,
          canRedo,
          clear,
        },
      }}
    >
      {children}
    </MidiContext.Provider>
  );
}

export function useMidiContext() {
  const ctx = useContext(MidiContext);
  if (!ctx) {
    throw new Error("useMidiContext must be used inside MidiProvider");
  }
  return ctx;
}
