import { getMidiLength } from "@/lib/utils";
import type { MidiProviderProps } from "@/midiProvider";
import { Midi } from "@tonejs/midi";
import { useHistoryState } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";
import type { MidiObject, Project } from "types/project";

export default function useMidiProvider(props: MidiProviderProps) {
  const { initProject, children } = props;

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

  return {
    isLoading,
    midiObject,
    setMidiObject,
    project,
    setProject,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  };
}
