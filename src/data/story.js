export const CHARACTERS = {
  arad: {
    id: 'arad',
    name: 'آراد',
    title: 'ماجراجوی شجاع و عاشق ابزارها',
    color: '#ef6c2f',
  },
  nika: {
    id: 'nika',
    name: 'نیکا',
    title: 'باهوش، دقیق و استاد معماها',
    color: '#7c3aed',
  },
};

export const INTRO_SLIDES = [
  {
    speaker: 'narrator',
    title: 'افسانه کوهستان دو جهان',
    text: 'در سرزمین اسرارآمیز کوهستان افسانه‌ها، گنجی باستانی درون یک صندوق طلایی عظیم پنهان شده است. این گنج متعلق به نگهبانان دو جهان بوده است: جهان خورشید و جهان ماه.',
  },
  {
    speaker: 'arad',
    title: 'مسیر سرزمین روشنایی',
    text: 'نگاه کن نیکا! سمت چپ کوهستان، مسیر روز است؛ پر از جنگل‌های سرسبز، لیزرهای امنیتی، آهنرباهای غول‌پیکر، زیپلاین دره آتش و دستگاه‌های مکانیکی شگفت‌انگیز!',
  },
  {
    speaker: 'nika',
    title: 'مسیر سرزمین تاریکی',
    text: 'و سمت راست، مسیر شب با نور ماه و تونل‌های زیرآبی قرار دارد! هر مسیر شش آزمون و یک کلید مخفی در مرحله دوم دارد که دروازه مرحله سوم را باز می‌کند.',
  },
  {
    speaker: 'both',
    title: 'آماده ماجراجویی هستید؟',
    text: 'مواظب صندوق‌های تقلبی هم باشید! تنها زمانی به گنج واقعی در قله کوهستان می‌رسیم که هر دو مسیر روز و شب را کامل کنیم. بزن بریم!',
  },
];

export const DECOY_CHESTS = {
  daytime: {
    id: 'decoy-day',
    route: 'daytime',
    title: 'صندوق درخشان کنار برجک آفتابی',
    noteText: 'این گنج، فقط یک آزمون بود! گنج واقعی هنوز منتظر شماست.',
    aradLine: 'ای وای! داخل این صندوق فقط یک کاغذ قدیمی است، نه سکه طلا!',
    nikaLine: 'آفرین که حواست جمع بود! این یک صندوق تقلبی است تا حواس ماجراجوها پرت شود. مسیر اصلی هنوز ادامه دارد!',
  },
  nighttime: {
    id: 'decoy-night',
    route: 'nighttime',
    title: 'صندوق شب‌تاب صخره شرقی',
    noteText: 'نورهای فریبنده را دنبال نکن! گنج واقعی در قله کوهستان است.',
    aradLine: 'چقدر نورانی بود! فکر کردم گنج اصلی را پیدا کردیم!',
    nikaLine: 'این یادداشت می‌گوید نورهای فریبنده را دنبال نکنیم. گنج واقعی بالا، در معبد قله کوهستان منتظر ماست!',
  },
};

export const FINAL_VICTORY_STORY = {
  title: 'معبد گنج دو جهان',
  openingText: 'آراد و نیکا سرانجام پس از عبور از سرزمین روشنایی و سرزمین تاریکی، به دروازه طلایی قله کوهستان رسیدند.',
  emblemText: 'نشان خورشید و نشان ماه در دو جایگاه باستانی قرار می‌گیرند... دروازه معبد با شکوه باز می‌شود!',
  congratulationsText: 'تبریک! شما راز دو جهان را کشف کردید و به گنج افسانه‌ای رسیدید. این ماجراجویی فقط با هوش، دقت و همکاری شما ممکن شد!',
};

export const GUIDE_SECTIONS = [
  {
    title: 'هدف بازی',
    body: 'باید همراه آراد و نیکا از هر دو مسیر «روز» و «شب» عبور کنید. هر مسیر ۶ مرحله جذاب دارد. بعد از کامل کردن هر ۱۲ مرحله، معبد گنج افسانه‌ای در قله کوهستان باز می‌شود.',
  },
  {
    title: 'کلیدهای مخفی',
    body: 'در مرحله دوم هر مسیر یک کلید ویژه پنهان شده است: کلید مغناطیسی در مسیر روز و کلید نقره‌ای در مسیر شب. برای باز کردن دروازه مرحله سوم به این کلیدها نیاز دارید!',
  },
  {
    title: 'صندوق‌های تقلبی',
    body: 'در هر دو مسیر یک صندوق فریبنده وجود دارد. کشف آن‌ها بامزه و سرگرم‌کننده است اما مسیر اصلی شما را متوقف نمی‌کند.',
  },
  {
    title: 'ستاره‌ها و راهنمایی',
    body: 'در هر مرحله می‌توانید تا ۳ ستاره بگیرید و اگر جایی گیر کردید، دکمه «راهنمایی» را بزنید تا نیکا در سه قدم شما را راهنمایی کند.',
  },
];

export function renderCharacterAvatarSvg(characterId, mood = 'happy') {
  if (characterId === 'arad') {
    const mouth = mood === 'excited'
      ? '<path d="M27 38 Q32 44 37 38 Z" fill="#7c2d12" stroke="#431407" stroke-width="1.2"/>'
      : '<path d="M27 38 Q32 42 37 38" fill="none" stroke="#431407" stroke-width="2" stroke-linecap="round"/>';
    return `
      <svg viewBox="0 0 64 64" class="w-full h-full" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#ffedd5" stroke="#ea580c" stroke-width="3"/>
        <path d="M16 54 C18 44 46 44 48 54" fill="#ea580c"/>
        <rect x="25" y="45" width="14" height="10" rx="3" fill="#2563eb"/>
        <circle cx="32" cy="30" r="14" fill="#fed7aa"/>
        <path d="M17 27 C17 15 47 14 47 27 C43 21 37 20 32 22 C26 20 20 22 17 27 Z" fill="#431407"/>
        <path d="M22 16 L28 11 L33 15 L40 12 L42 18" fill="#431407"/>
        <circle cx="26.5" cy="30" r="2.2" fill="#1e293b"/>
        <circle cx="37.5" cy="30" r="2.2" fill="#1e293b"/>
        <circle cx="27.2" cy="29.3" r="0.8" fill="#ffffff"/>
        <circle cx="38.2" cy="29.3" r="0.8" fill="#ffffff"/>
        ${mouth}
        <rect x="20" y="21" width="24" height="4" rx="2" fill="#0284c7"/>
        <circle cx="25" cy="23" r="2.5" fill="#bae6fd" stroke="#0369a1" stroke-width="1"/>
        <circle cx="39" cy="23" r="2.5" fill="#bae6fd" stroke="#0369a1" stroke-width="1"/>
      </svg>
    `;
  }

  const mouth = mood === 'excited'
    ? '<path d="M27 38 Q32 44 37 38 Z" fill="#881337" stroke="#4c0519" stroke-width="1.2"/>'
    : '<path d="M27 38 Q32 42 37 38" fill="none" stroke="#4c0519" stroke-width="2" stroke-linecap="round"/>';
  return `
    <svg viewBox="0 0 64 64" class="w-full h-full" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/>
      <circle cx="17" cy="22" r="6" fill="#312e81"/>
      <circle cx="47" cy="22" r="6" fill="#312e81"/>
      <path d="M16 54 C18 44 46 44 48 54" fill="#db2777"/>
      <circle cx="32" cy="30" r="14" fill="#fde6d8"/>
      <path d="M17 28 C17 14 47 14 47 28 C41 21 23 21 17 28 Z" fill="#312e81"/>
      <circle cx="19" cy="20" r="2.5" fill="#f472b6"/>
      <circle cx="45" cy="20" r="2.5" fill="#f472b6"/>
      <circle cx="26.5" cy="30" r="2.2" fill="#1e293b"/>
      <circle cx="37.5" cy="30" r="2.2" fill="#1e293b"/>
      <circle cx="27.2" cy="29.3" r="0.8" fill="#ffffff"/>
      <circle cx="38.2" cy="29.3" r="0.8" fill="#ffffff"/>
      <circle cx="23" cy="34" r="2.2" fill="#fda4af" opacity="0.6"/>
      <circle cx="41" cy="34" r="2.2" fill="#fda4af" opacity="0.6"/>
      ${mouth}
    </svg>
  `;
}
