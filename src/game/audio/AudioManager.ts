import { Howl, Howler } from "howler";

type SoundKey =
  | "hero-fire"
  | "tower-fire"
  | "enemy-hit"
  | "enemy-death"
  | "elite-warning"
  | "boss-intro"
  | "upgrade-pick"
  | "wave-start";

function toWavDataUri(frequency: number, durationMs: number, volume = 0.5): string {
  const sampleRate = 22050;
  const samples = Math.floor((durationMs / 1000) * sampleRate);
  const data = new Int16Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const envelope = Math.exp((-4 * i) / samples);
    const wave = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * envelope;
    data[i] = Math.max(-1, Math.min(1, wave * volume)) * 32767;
  }

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * bytesPerSample;

  function writeString(offset: number, text: string): void {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(44 + dataSize);
  wavBytes.set(new Uint8Array(header), 0);
  wavBytes.set(new Uint8Array(data.buffer), 44);

  let binary = "";
  for (let i = 0; i < wavBytes.length; i += 1) {
    binary += String.fromCharCode(wavBytes[i] as number);
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

export class AudioManager {
  private sounds: Record<SoundKey, Howl>;

  constructor(volume = 0.75) {
    Howler.volume(volume);
    this.sounds = {
      "hero-fire": new Howl({ src: [toWavDataUri(860, 75, 0.45)] }),
      "tower-fire": new Howl({ src: [toWavDataUri(640, 90, 0.38)] }),
      "enemy-hit": new Howl({ src: [toWavDataUri(420, 80, 0.28)] }),
      "enemy-death": new Howl({ src: [toWavDataUri(220, 140, 0.35)] }),
      "elite-warning": new Howl({ src: [toWavDataUri(180, 260, 0.4)] }),
      "boss-intro": new Howl({ src: [toWavDataUri(130, 420, 0.52)] }),
      "upgrade-pick": new Howl({ src: [toWavDataUri(930, 220, 0.3)] }),
      "wave-start": new Howl({ src: [toWavDataUri(520, 180, 0.35)] }),
    };
  }

  setVolume(volume: number): void {
    Howler.volume(Math.max(0, Math.min(1, volume)));
  }

  play(key: SoundKey, rate = 1): void {
    const sound = this.sounds[key];
    if (!sound) {
      return;
    }
    sound.rate(rate);
    sound.play();
  }
}
