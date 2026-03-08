import { useState, useEffect } from 'react';
import { FlickerIn } from '@/components/EmberAnimations';

const DEFAULT_QUOTES = [
  "The iron never lies. Two hundred pounds will always be two hundred pounds.",
  "Forge yourself in fire. What remains cannot be broken.",
  "Every rep is a hammer strike on the anvil of your will.",
  "The body achieves what the mind believes — and the forge endures.",
  "You were not born to be ordinary. You were born to be forged.",
  "Discipline is the bridge between goals and accomplishment.",
  "In the furnace of effort, weakness becomes strength.",
  "The only bad workout is the one that didn't happen.",
];

interface MotivationalQuotesProps {
  customQuotes?: string[];
  enabled?: boolean;
}

export function MotivationalQuotes({ customQuotes, enabled = true }: MotivationalQuotesProps) {
  const [quote, setQuote] = useState('');
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const quotes = customQuotes && customQuotes.length > 0 ? customQuotes : DEFAULT_QUOTES;
    const idx = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[idx]);
    setKey(prev => prev + 1);
  }, [customQuotes, enabled]);

  if (!enabled || !quote) return null;

  return (
    <FlickerIn key={key}>
      <div className="text-center py-4 px-6 rounded border-rough bg-card/50 relative overflow-hidden scanlines">
        <p className="font-medieval text-sm md:text-base italic text-muted-foreground glow-green-text relative z-10">
          "{quote}"
        </p>
      </div>
    </FlickerIn>
  );
}
