import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Generates a crackling fire sound using Web Audio API
function createFireSound(ctx: AudioContext): { start: () => void; stop: () => void } {
  const gain = ctx.createGain();
  gain.gain.value = 0.04;
  gain.connect(ctx.destination);

  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Brown noise with random crackle pops
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (last + 0.02 * white) / 1.02;
    last = data[i];
    // Random crackle
    if (Math.random() < 0.001) {
      data[i] += (Math.random() - 0.5) * 0.3;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Low pass filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;

  source.connect(filter);
  filter.connect(gain);

  return {
    start: () => source.start(),
    stop: () => { try { source.stop(); } catch {} },
  };
}

interface AmbientSoundProps {
  enabled: boolean;
}

export function AmbientSound({ enabled }: AmbientSoundProps) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const soundRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const toggle = () => {
    if (playing) {
      soundRef.current?.stop();
      ctxRef.current?.close();
      ctxRef.current = null;
      soundRef.current = null;
      setPlaying(false);
    } else {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const sound = createFireSound(ctx);
      soundRef.current = sound;
      sound.start();
      setPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      soundRef.current?.stop();
      ctxRef.current?.close();
    };
  }, []);

  if (!enabled) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="h-8 w-8 p-0 relative"
      title={playing ? 'Mute ambience' : 'Play fire ambience'}
    >
      {playing ? (
        <Volume2 className="h-4 w-4 text-secondary drop-shadow-[0_0_6px_hsl(42,100%,50%,0.5)]" />
      ) : (
        <VolumeX className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
