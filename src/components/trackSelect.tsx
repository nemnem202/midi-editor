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

export default function TrackSelect() {
  const { project, setProject } = useMidiContext();
  return (
    <Select>
      <SelectTrigger className="w-full max-w-48 select-none">
        <SelectValue placeholder="Select a track" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup defaultValue="piano" className="select-none">
          <SelectLabel>Tracks</SelectLabel>
          <SelectItem value="piano">Piano</SelectItem>
          <SelectItem value="bass">Bass</SelectItem>
          <SelectItem value="guitar">Guitar</SelectItem>
          <SelectItem value="drums">Drums</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
