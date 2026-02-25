import { useMidiContext } from "../midiProvider";
import { ListMusic, Magnet, Pause, Play, Plus, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldLabel } from "./ui/field";
import { Separator } from "./ui/separator";
import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ToggleMagnetismCommand } from "@/commands";

export default function ControlsPannel() {
  const { project, setProject } = useMidiContext();

  return (
    <div className="flex gap-5 min-h-15 flex-wrap">
      <ControlsSection>
        <>
          <button
            className="all-unset cursor-pointer rounded-md p-2 hover:bg-accent"
            onClick={() =>
              setProject((prev) => ({
                ...prev,
                config: { ...prev.config, isPlaying: !prev.config.isPlaying },
              }))
            }
          >
            {project.config.isPlaying ? (
              <Pause className="stroke-primary fill-primary " />
            ) : (
              <Play className="stroke-primary fill-primary " />
            )}
          </button>
          <button className="all-unset cursor-pointer rounded-md p-2 hover:bg-accent">
            <Square className="stroke-primary fill-primary" />
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
              className="!w-15 min-w-0 p-0 text-center"
            />
          </Field>
          <Separator orientation="vertical" className="!h-6" />
          <Field className="flex flex-row items-center justify-center !w-min">
            <Input
              type="number"
              defaultValue={project.config.signature[0]}
              className="!w-10 min-w-0 p-0 text-center"
            />
            <span className="!w-min">/</span>
            <Input
              type="number"
              defaultValue={project.config.signature[1]}
              className="!w-10 min-w-0 p-0 text-center"
            />
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
            onClick={() => setProject(new ToggleMagnetismCommand().execute)}
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

function ControlsSection({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 w-fit h-15 px-5 bg-card rounded-xl items-center select-none">
      {children}
    </div>
  );
}

function SubdivisionSelect() {
  const { project, setProject } = useMidiContext();
  return (
    <Select defaultValue="4">
      <SelectTrigger className="w-full max-w-48 select-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup className="select-none">
          <SelectLabel>Subdivisions</SelectLabel>
          {[1, 2, 4, 8, 16, 32, 64, 128].map((v) => (
            <SelectItem value={String(v)} key={v}>
              1/{v}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
