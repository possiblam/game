import { CHARACTERS, renderCharacterAvatarSvg } from '../data/story.js';
import { toPersianDigits } from '../data/translations.js';
import { showModal } from './modal.js';

export class HintSystem {
  constructor(stageMeta, onHintLevelChange, guideCharacterId = null) {
    this.stageMeta = stageMeta;
    this.onHintLevelChange = onHintLevelChange;
    this.guideCharacterId =
      guideCharacterId || (stageMeta?.worldId === 'two-lanterns' ? 'pico' : 'nika');
    this.level = 0; // 0 = unused, 1..3 = tier
  }

  getHintsUsed() {
    return this.level;
  }

  reset() {
    this.level = 0;
    this.onHintLevelChange?.(0);
  }

  openNextHint() {
    if (this.level < 3) {
      this.level += 1;
      this.onHintLevelChange?.(this.level);
    }

    const guide = CHARACTERS[this.guideCharacterId] || CHARACTERS.nika;
    const isPico = guide.id === 'pico';

    const tierNames = [
      '',
      'راهنمای اول — درک کلی معما',
      'راهنمای دوم — سرنخ کلیدی',
      'راهنمای سوم — کمک بصری فعال شد',
    ];

    const hintsHtml = this.stageMeta.hints
      .slice(0, this.level)
      .map(
        (text, idx) => `
          <div class="p-3 rounded-xl ${
            idx === this.level - 1
              ? 'bg-violet-950/80 border border-violet-400/50 text-violet-100'
              : 'bg-slate-800/70 border border-slate-700 text-slate-300'
          }">
            <div class="text-xs font-bold text-amber-300 mb-1">${tierNames[idx + 1]}</div>
            <p class="m-0 leading-relaxed">${text}</p>
          </div>
        `
      )
      .join('');

    const actions = [
      {
        label: 'متوجه شدم',
        variant: 'primary',
      },
    ];

    showModal({
      title: `${guide.name} راهنمایی می‌کند (${toPersianDigits(this.level)} از ${toPersianDigits(3)})`,
      bodyHtml: `
        <div class="flex items-start gap-3 mb-4">
          <div class="w-14 h-14 shrink-0">${renderCharacterAvatarSvg(guide.id, 'happy')}</div>
          <div class="text-sm text-slate-200 leading-relaxed">
            ${
              isPico
                ? 'بیپ-بوپ! نگران نباش، من پیکو کنارت هستم تا قدم‌به‌قدم راز این دستگاه را کشف کنی!'
                : 'نگران نباش! با هم قدم‌به‌قدم حلش می‌کنیم. هر بار که کمک بخواهی یک سرنخ دقیق‌تر می‌دهم.'
            }
          </div>
        </div>
        <div class="space-y-2.5">${hintsHtml}</div>
      `,
      actions,
    });
  }
}
