import { ChangeTrackIndexCommand } from "@/commands";
import { useMidiContext } from "../midiProvider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { TRACKS } from "../../types/project";

export default function TrackSelect() {
  const { project, midiObject, setProject } = useMidiContext();

  if (!midiObject) return null;

  const { tracks } = midiObject;

  const handleTrackChange = (v: string) => {
    const trackindex = TRACKS[Number(v)] ?? 0;
    if (project.config.displayedTrackIndex === trackindex) return;
    setProject(new ChangeTrackIndexCommand(trackindex).execute(project));
  };

  return (
    <Select
      defaultValue={String(TRACKS[project.config.displayedTrackIndex])}
      onValueChange={handleTrackChange}
    >
      <SelectTrigger className="w-full max-w-48 select-none">
        <SelectValue />
      </SelectTrigger>

      <SelectContent side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
        <SelectGroup className="select-none">
          <SelectLabel>Tracks</SelectLabel>
          {tracks.map((t, index) => (
            <SelectItem value={String(index)}>{t.instrument.family}</SelectItem>
          ))}
          {/* {tracks.length > 0 && <SelectItem value="piano">Piano</SelectItem>}
          {tracks.length > 1 && <SelectItem value="bass">Bass</SelectItem>}
          {tracks.length > 2 && <SelectItem value="guitar">Guitar</SelectItem>}
          {tracks.length > 3 && <SelectItem value="drums">Drums</SelectItem>} */}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
