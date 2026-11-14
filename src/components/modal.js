import { UI_TEXT } from '../data/translations.js';

let activeModalCleanup = null;

export function closeActiveModal() {
  if (typeof activeModalCleanup === 'function') {
    activeModalCleanup();
    activeModalCleanup = null;
  }
}

export function showModal({
  title,
  bodyHtml,
  actions = [],
  maxWidth = 'max-w-lg',
  closeOnBackdrop = true,
  onClose = null,
}) {
  closeActiveModal();

  const prevFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  const card = document.createElement('div');
  card.className = `storybook-panel animate-modal-in w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 text-slate-100`;

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between gap-4 pb-3 border-b border-amber-400/25';

  const heading = document.createElement('h2');
  heading.className = 'text-xl sm:text-2xl font-extrabold text-amber-300';
  heading.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className =
    'w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/60 shrink-0';
  closeBtn.setAttribute('aria-label', UI_TEXT.close);
  closeBtn.innerHTML = '<span aria-hidden="true" class="text-lg font-bold">✕</span>';

  header.appendChild(heading);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'mt-4 text-sm sm:text-base leading-relaxed text-slate-200';
  body.innerHTML = bodyHtml;

  card.appendChild(header);
  card.appendChild(body);

  if (actions.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'mt-6 flex flex-wrap items-center justify-end gap-3';
    actions.forEach((act) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `px-5 py-2.5 rounded-xl text-sm sm:text-base whitespace-nowrap shrink-0 ${
        act.variant === 'primary'
          ? 'btn-primary-gold'
          : act.variant === 'danger'
          ? 'bg-red-600 hover:bg-red-500 text-white font-bold border border-red-300/60'
          : 'btn-secondary-slate'
      }`;
      btn.textContent = act.label;
      if (act.testId) btn.dataset.testid = act.testId;
      btn.addEventListener('click', () => {
        if (act.closeBefore !== false) close();
        act.onClick?.();
      });
      footer.appendChild(btn);
    });
    card.appendChild(footer);
  }

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  function close() {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (prevFocus && typeof prevFocus.focus === 'function') {
      prevFocus.focus();
    }
    if (activeModalCleanup === close) {
      activeModalCleanup = null;
    }
    onClose?.();
  }

  activeModalCleanup = close;
  closeBtn.addEventListener('click', close);
  if (closeOnBackdrop) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }
  document.addEventListener('keydown', handleKeyDown);
  closeBtn.focus();

  return { close, element: overlay, bodyElement: body };
}
