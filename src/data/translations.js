export const UI_TEXT = {
  gameTitle: 'راز گنج دو جهان',
  gameTagline: 'دو مسیر، دوازده ماجرا، یک گنج افسانه‌ای!',
  startAdventure: 'شروع ماجراجویی',
  continueGame: 'ادامه بازی',
  gameGuide: 'راهنمای بازی',
  newGame: 'شروع بازی جدید',
  newGameConfirmTitle: 'آغاز ماجراجویی تازه؟',
  newGameConfirmMessage: 'اگر بازی جدید را شروع کنید، تمام مراحل حل‌شده، کلیدها و ستاره‌های فعلی پاک می‌شوند. مطمئن هستید؟',
  confirmReset: 'بله، از نو شروع کن',
  cancel: 'انصراف',
  settings: 'تنظیمات',
  soundOn: 'صدا روشن است',
  soundOff: 'صدا قطع است',
  backToMap: 'بازگشت به نقشه',
  backToHome: 'صفحه اصلی',
  hint: 'راهنمایی',
  retry: 'تلاش مجدد',
  startChallenge: 'شروع چالش',
  nextStage: 'مرحله بعدی',
  replayStage: 'بازی دوباره',
  close: 'بستن',
  continueStory: 'ادامه داستان',
  skipStory: 'رفتن به نقشه',
  daytimeRoute: 'مسیر روز',
  nighttimeRoute: 'مسیر شب',
  startPoint: 'نقطه شروع',
  finalDestination: 'معبد گنج افسانه‌ای',
  toolkitLabel: 'کیف ابزار',
  magneticKey: 'کلید مغناطیسی',
  silverKey: 'کلید نقره‌ای',
  lockedKeyHint: 'نیاز به کلید مرحله دوم',
  stageCompleted: 'تکمیل شده',
  stageActive: 'آماده بازی',
  stageLocked: 'قفل است',
  starsEarned: 'ستاره‌ها',
  attemptsLabel: 'تلاش‌ها',
  timeLabel: 'زمان',
  hintsUsedLabel: 'راهنما',
  secondsUnit: 'ثانیه',
  aradName: 'آراد',
  nikaName: 'نیکا',
  aradRole: 'ماجراجوی شجاع و مهندس',
  nikaRole: 'باهوش و استاد معماها',
  decoyTitle: 'صندوق گنج تقلبی!',
  finalLockedTitle: 'دروازه معبد قفل است',
  finalLockedBody: 'برای رسیدن به گنج افسانه‌ای در قله کوهستان، باید هر شش مرحله مسیر روز و هر شش مرحله مسیر شب را با موفقیت پشت سر بگذارید.',
  enterFinalTemple: 'ورود به معبد گنج',
  victoryReplay: 'بازگشت به نقشه',
  victoryNewQuest: 'ماجراجویی دوباره',
  stagePrefix: 'مرحله',
  ofSix: 'از ۶',
  ofTwelve: 'از ۱۲',
};

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function formatTimePersian(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) {
    return `${toPersianDigits(secs)} ثانیه`;
  }
  return `${toPersianDigits(mins)} دقیقه و ${toPersianDigits(secs)} ثانیه`;
}
