import { Midi } from "@tonejs/midi";
import { useHistoryState, type HistoryState } from "@uidotdev/usehooks";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { MidiObject, Project } from "types/project";
import { getMidiLength } from "./lib/utils";
import Stats from "stats.js";
import useMidiProvider from "./hooks/useMidiProvider";

type MidiContextValues = {
  midiObject: MidiObject | null;
  setMidiObject: (newPresent: MidiObject | null) => void;
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  isLoading: boolean;
  historyState: HistoryState<MidiObject | null>;
};

export const MidiContext = createContext<MidiContextValues | null>(null);

export interface MidiProviderProps {
  initProject: Project;
  children: ReactNode;
}

export default function MidiProvider(props: MidiProviderProps) {
  const { children } = props;
  const {
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
  } = useMidiProvider(props);

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
