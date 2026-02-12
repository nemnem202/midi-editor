import { Midi } from "@tonejs/midi";

export default async function midiConverter(midifile: File): Promise<Midi> {
  const readableMidi = await Midi.fromUrl(midifile.webkitRelativePath);
  return readableMidi;
}
