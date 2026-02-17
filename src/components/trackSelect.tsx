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

const TRACKS = ["piano", "bass", "guitar", "drums"];

export default function TrackSelect() {
  const { project, midiObject, setProject, setMidiObject } = useMidiContext();

  if (!midiObject) return null;

  const { tracks } = midiObject;

  const handleTrackChange = (v: string) => {
    const trackindex = TRACKS.findIndex((e) => e === v) ?? 0;
    if (project.config.displayedTrackIndex === trackindex) return;
    setProject({ ...project, config: { ...project.config, displayedTrackIndex: trackindex } });
  };

  return (
    <Select
      defaultValue={TRACKS[project.config.displayedTrackIndex]}
      onValueChange={handleTrackChange}
    >
      <SelectTrigger className="w-full max-w-48 select-none">
        <SelectValue />
      </SelectTrigger>

      <SelectContent side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
        <SelectGroup className="select-none">
          <SelectLabel>Tracks</SelectLabel>
          {tracks.length > 0 && <SelectItem value="piano">Piano</SelectItem>}
          {tracks.length > 1 && <SelectItem value="bass">Bass</SelectItem>}
          {tracks.length > 2 && <SelectItem value="guitar">Guitar</SelectItem>}
          {tracks.length > 3 && <SelectItem value="drums">Drums</SelectItem>}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
