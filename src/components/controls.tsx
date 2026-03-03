import { useMidiContext } from "../midiProvider";
import { ListMusic, Magnet, Pause, Play, Plus, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldLabel } from "./ui/field";
import { Separator } from "./ui/separator";
import type { ChangeEvent, ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  ChangeBpmCommand,
  ChangeGridSubdivisionCommand,
  ChangeSignatureCommand,
  StopCommand,
  ToggleMagnetismCommand,
  TogglePlayCommand,
} from "@/commands";
import {
  BINARY_SUBDIVISIONS,
  MAX_BPM,
  MAX_SIGNATURE,
  MIN_BPM,
  MIN_SIGNATURE,
} from "../config/constants";
import type { Signature } from "types/project";

export default function ControlsPannel() {
  const { project, setProject } = useMidiContext();

  const handleBpmChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.currentTarget.value);

    if (newValue < 0) return (e.currentTarget.value = String(project.config.bpm));
    if (newValue < MIN_BPM) e.currentTarget.value = String(MIN_BPM);
    if (newValue > MAX_BPM) e.currentTarget.value = String(MAX_BPM);

    setProject(new ChangeBpmCommand(newValue).execute(project));
  };

  const handleSignatureChange = (e: ChangeEvent<HTMLInputElement>, number: "top" | "bottom") => {
    const newValue = parseInt(e.currentTarget.value);

    if (newValue < 0) return (e.currentTarget.value = String(project.config.bpm));
    if (newValue < MIN_SIGNATURE) e.currentTarget.value = String(MIN_BPM);
    if (newValue > MAX_SIGNATURE) e.currentTarget.value = String(MAX_BPM);

    const signature: Signature = [...project.config.signature];

    if (number === "top") {
      signature[0] = newValue;
    } else {
      signature[1] = newValue;
    }

    setProject(new ChangeSignatureCommand(signature).execute(project));
  };

  return (
    <div className="flex gap-5 min-h-15 flex-wrap">
      <ControlsSection>
        <>
          <button
            className="all-unset cursor-pointer rounded-md p-2 hover:bg-accent"
            onClick={() => setProject(new TogglePlayCommand().execute(project))}
          >
            {project.config.isPlaying ? (
              <Pause className="stroke-chart-4 fill-chart-4 " />
            ) : (
              <Play className="stroke-primary fill-primary " />
            )}
          </button>
          <button
            className="all-unset cursor-pointer rounded-md p-2 hover:bg-accent"
            onClick={() => setProject(new StopCommand().execute(project))}
          >
            <Square
              className={` ${project.config.currentTracklistTick === 0 ? "fill-chart-4 stroke-chart-4" : "fill-primary stroke-primary"}`}
            />
          </button>
          <Separator orientation="vertical" className="!h-6" />
          <Field className="flex flex-row items-center justify-center  !w-min">
            <FieldLabel htmlFor="bpm" className="!w-min text-muted-foreground text-xs">
              Bpm:
            </FieldLabel>
            <Input
              id="bpm"
              type="number"
              defaultValue={project.config.bpm}
              onKeyDownCapture={(e) => {
                if (e.key.toLowerCase() === "enter") {
                  e.currentTarget.blur();
                }
              }}
              onBlur={handleBpmChange}
              className="!w-15 min-w-0 p-0 text-center"
            />
          </Field>
          <Separator orientation="vertical" className="!h-6" />
          <Field className="flex flex-row items-center justify-center !w-min">
            <Input
              type="number"
              defaultValue={project.config.signature[0]}
              className="!w-10 min-w-0 p-0 text-center"
              onBlur={(e) => handleSignatureChange(e, "top")}
            />
            <span className="!w-min">/</span>
            <Input
              type="number"
              defaultValue={project.config.signature[1]}
              className="!w-10 min-w-0 p-0 text-center"
              onBlur={(e) => handleSignatureChange(e, "bottom")}
            />
            <button className="all-unset cursor-pointer rounded-md p-2 hover:bg-accent !w-fit">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-metronome-icon lucide-metronome"
              >
                <path d="M12 11.4V9.1" />
                <path d="m12 17 6.59-6.59" />
                <path d="m15.05 5.7-.218-.691a3 3 0 0 0-5.663 0L4.418 19.695A1 1 0 0 0 5.37 21h13.253a1 1 0 0 0 .951-1.31L18.45 16.2" />
                <circle cx="20" cy="9" r="2" />
              </svg>
            </button>
          </Field>
        </>
      </ControlsSection>
      <ControlsSection>
        <Button variant="ghost" size="sm">
          <Plus /> chord
        </Button>
        <Separator orientation="vertical" className="!h-6" />
        <Button variant="ghost" size="sm">
          <Plus /> <ListMusic />
        </Button>
      </ControlsSection>
      <ControlsSection>
        <button className="all-unset cursor-pointer rounded-md p-2 hover:bg-accent">
          <Magnet
            className={` ${project.config.magnetism ? "stroke-chart-4" : "stroke-primary"}`}
            onClick={() => setProject(new ToggleMagnetismCommand().execute(project))}
          />
        </button>
        <SubdivisionSelect />
      </ControlsSection>
      <ControlsSection>
        <Field className="flex flex-row items-center justify-center  !w-min">
          <FieldLabel htmlFor="style" className="!w-min text-muted-foreground text-xs">
            style:
          </FieldLabel>

          <Select defaultValue="Blues">
            <SelectTrigger className="w-full max-w-48 select-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup className="select-none">
                <SelectLabel>Subdivisions</SelectLabel>
                {["Blues", "Bossa Nova", "Rock", "Swing", "Reggae", "Classic", "Pop"].map((v) => (
                  <SelectItem value={String(v)} key={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </ControlsSection>
    </div>
  );
}

export function ControlsSection({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 w-fit h-15 px-5 bg-card rounded-xl items-center select-none">
      {children}
    </div>
  );
}

function SubdivisionSelect() {
  const { project, setProject } = useMidiContext();

  return (
    <Select
      defaultValue={String(project.config.gridSubdivisions[1])}
      onValueChange={(v) =>
        setProject(new ChangeGridSubdivisionCommand(Number(v)).execute(project))
      }
    >
      <SelectTrigger className="w-full max-w-48 select-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup className="select-none">
          <SelectLabel>Subdivisions</SelectLabel>
          {BINARY_SUBDIVISIONS.map((sub, index) => (
            <SelectItem value={String(index)} key={index}>
              {sub[0]} / {sub[1]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
