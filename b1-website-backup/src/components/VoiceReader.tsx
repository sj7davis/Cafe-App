import { useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const menuText = `
B1 by Backhaus menu. Coffee. Espresso, single origin daily rotation, 4 dollars 50. 
Long Black, double ristretto with hot water, 5 dollars. 
Flat White, silky microfoam with house blend, 5 dollars 50. 
Cappuccino, rich foam chocolate dusted, 5 dollars 50. 
Latte, smooth creamy full-bodied, 5 dollars 50. 
Piccolo, espresso and warm milk, small, 4 dollars 50. 
Mocha, house chocolate espresso and steamed milk, 6 dollars. 
Cold Brew, 18-hour steep single origin, 6 dollars. 
Batch Brew, filter coffee rotating origins, 5 dollars. 
Pastries. Almond Croissant with house-made frangipane, 6 dollars 50. 
Plain Croissant, butter-layered baked fresh, 5 dollars 50. 
Pain au Chocolat, dark chocolate flaky pastry, 6 dollars. 
Cinnamon Scroll, slow-proved with cream cheese glaze, 6 dollars 50. 
Portuguese Tart, caramelised custard puff pastry, 5 dollars. 
Seasonal Fruit Danish, daily changing local fruit, 6 dollars 50. 
Bread. Sourdough Loaf, 48-hour ferment house starter, 9 dollars. 
Baguette, traditional French crisp crust, 6 dollars. 
Ciabatta, rustic Italian open crumb, 7 dollars. 
Brioche Loaf, enriched butter dough soft, 8 dollars 50. 
Olive and Rosemary, Mediterranean flavours dense crumb, 8 dollars. 
Multigrain, seven seeds wholemeal base, 8 dollars.
`;

export default function VoiceReader() {
  const [speaking, setSpeaking] = useState(false);

  const toggleSpeech = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(menuText);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  }, [speaking]);

  return (
    <button
      onClick={toggleSpeech}
      className="fixed bottom-8 left-8 z-40 w-12 h-12 flex items-center justify-center border transition-all duration-200 hover:bg-[var(--color-ink)] hover:text-[var(--color-base)] group"
      style={{
        background: speaking ? 'var(--color-ink)' : 'var(--color-base)',
        color: speaking ? 'var(--color-base)' : 'var(--color-ink)',
        borderColor: 'rgba(24, 24, 24, 0.15)',
      }}
      title={speaking ? 'Stop reading menu' : 'Read menu aloud'}
      aria-label={speaking ? 'Stop reading menu' : 'Read menu aloud'}
    >
      {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}

      {/* Tooltip */}
      <span className="absolute left-full ml-3 px-3 py-1.5 font-data opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
        style={{ background: 'var(--color-ink)', color: 'var(--color-base)' }}
      >
        {speaking ? 'STOP' : 'READ MENU'}
      </span>
    </button>
  );
}
