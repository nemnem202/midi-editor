import { Midi } from "@tonejs/midi";
import { TrackOrder } from "../../types/project";

export default async function midiConverter(midifile: File): Promise<Midi> {
  const readableMidi = await Midi.fromUrl(midifile.webkitRelativePath);
  return readableMidi;
}

const familyPriority: Record<string, TrackOrder> = {
  piano: TrackOrder.Piano,
  guitar: TrackOrder.Guitar,
  bass: TrackOrder.Bass,
  drums: TrackOrder.Drums,
  brass: TrackOrder.Brass,
  reed: TrackOrder.Reed,
};

export function rearrangeMidiFile(midi: Midi) {
  const grouped = new Map<string, Midi["tracks"][number][]>();

  for (const track of midi.tracks) {
    const family = track.instrument.family;

    if (!grouped.has(family)) {
      grouped.set(family, []);
    }

    grouped.get(family)!.push(track);
  }

  const mergedTracks = Array.from(grouped.entries()).map(([family, tracks]) => {
    if (tracks.length === 1) return tracks[0];

    const base = tracks[0];

    base.notes = tracks.flatMap((t) => t.notes);

    base.notes.sort((a, b) => a.time - b.time);

    return base;
  });

  mergedTracks.sort((a, b) => {
    const aPriority = familyPriority[a.instrument.family] ?? Number.MAX_SAFE_INTEGER;

    const bPriority = familyPriority[b.instrument.family] ?? Number.MAX_SAFE_INTEGER;

    return aPriority - bPriority;
  });

  midi.tracks = mergedTracks;

  console.log(
    midi.tracks.map((t) => ({
      name: t.instrument.family,
      notes: t.notes.length,
    })),
  );

  return midi;
}
