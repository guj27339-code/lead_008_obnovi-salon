/* V15 behaviour layer. No frameworks, third-party trackers, generated JS or hidden submissions. */
(() => {
  'use strict';
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const live = (form, text, state) => {
    const output = $('[data-brief-status]', form);
    if (output) { output.textContent = text; output.dataset.state = state; }
  };
  const fallbackCopy = (preview) => {
    preview.focus(); preview.select();
    try { return document.execCommand('copy'); } catch (_) { return false; }
  };
  const copy = async (preview) => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(preview.value); return true; } catch (_) { /* select fallback */ }
    }
    return fallbackCopy(preview);
  };
  $$('[data-menu-toggle]').forEach(button => {
    const nav = document.getElementById(button.getAttribute('aria-controls'));
    if (!nav) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    const set = (open) => { button.setAttribute('aria-expanded', String(open)); nav.hidden = mobile.matches && !open; };
    set(false);
    mobile.addEventListener('change', () => set(false));
    button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') { set(false); button.focus(); }
    });
  });
  $$('[data-tabs]').forEach(group => {
    const tabs = $$('[data-tab]', group);
    const select = (tab) => {
      tabs.forEach(t => {
        const active = t === tab;
        t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
    };
    select(tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0]);
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', e => {
        let index;
        if (e.key === 'ArrowRight') index = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') index = (i + tabs.length - 1) % tabs.length;
        if (e.key === 'Home') index = 0;
        if (e.key === 'End') index = tabs.length - 1;
        if (index !== undefined) { e.preventDefault(); select(tabs[index]); tabs[index].focus(); }
      });
    });
  });
  $$('[data-brief]').forEach(form => {
    let config;
    try { config = JSON.parse(form.dataset.config); } catch (_) { live(form, 'Не удалось открыть форму. Свяжитесь с компанией по контактам.', 'error'); return; }
    const preview = $('[data-brief-preview]', form);
    let submitting = false;
    const summary = () => {
      const data = new FormData(form);
      const lines = [config.company];
      [['goal', 'Задача'], ['detail', 'Объект или задача'], ['name', 'Имя'], ['contact', 'Контакт'], ['message', 'Пожелания']].forEach(([key, label]) => {
        const value = String(data.get(key) || '').trim(); if (value) lines.push(`${label}: ${value}`);
      });
      preview.value = lines.join('\n');
      const wa = $('[data-send-wa]', form);
      if (wa && config.whatsapp) { const u = new URL(config.whatsapp); u.searchParams.set('text', preview.value); wa.href = u.href; }
      const mail = $('[data-send-email]', form);
      if (mail && config.email) mail.href = `${config.email}?subject=${encodeURIComponent(config.company)}&body=${encodeURIComponent(preview.value)}`;
      return data;
    };
    form.addEventListener('input', summary); form.addEventListener('change', summary); summary();
    $('[data-copy-brief]', form).addEventListener('click', async () => {
      summary();
      live(form, (await copy(preview)) ? 'Запрос скопирован. Сообщение ещё не отправлено.' : 'Выделите и скопируйте текст запроса вручную.', 'copy');
    });
    $$('[data-preset]').forEach(button => button.addEventListener('click', () => {
      const field = $('[name="goal"]', form);
      if (!field || ![...field.options].some(x => x.value === button.dataset.preset)) return;
      field.value = button.dataset.preset; field.dispatchEvent(new Event('change', {bubbles: true}));
      form.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      field.focus({preventScroll: true});
    }));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (submitting || !config.endpoint || !form.reportValidity()) return;
      const data = summary(); if (String(data.get('website') || '')) return;
      const submit = $('[data-submit]', form);
      submitting = true; submit.disabled = true; live(form, 'Отправляем заявку…', 'pending');
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const headers = {'Content-Type': 'application/json', 'Accept': 'application/json'};
        if (config.key) headers['X-Lead-Relay-Key'] = config.key;
        const response = await fetch(config.endpoint, {
          method: 'POST', headers, signal: controller.signal, credentials: 'omit',
          body: JSON.stringify({company: config.company, name: String(data.get('name') || ''), contact: String(data.get('contact') || ''), service: String(data.get('goal') || ''), message: preview.value, website: '', page: location.href})
        });
        const text = await response.text();
        let result = null; try { result = text ? JSON.parse(text) : null; } catch (_) { /* not an acknowledged API response */ }
        const acknowledged = response.status === 204 || (result && (result.ok === true || result.success === true));
        if (!response.ok || !acknowledged) throw new Error('not_acknowledged');
        live(form, 'Сервис приёма подтвердил получение заявки.', 'success');
      } catch (_) {
        live(form, 'Доставка не подтверждена. Текст сохранён — скопируйте его или свяжитесь с компанией по контактам.', 'error');
      } finally { clearTimeout(timer); submitting = false; submit.disabled = false; }
    });
  });
  $$('[data-lightbox]').forEach(link => {
    link.addEventListener('click', e => {
      if (!window.HTMLDialogElement) return; // Normal image link is the fallback.
      e.preventDefault();
      const dialog = document.createElement('dialog'); dialog.className = 'site-lightbox'; dialog.setAttribute('aria-label', 'Фотография');
      const image = document.createElement('img'); image.src = link.href; image.alt = $('img', link)?.alt || '';
      const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Закрыть'; close.dataset.lightboxClose = '';
      close.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => { dialog.remove(); link.focus(); });
      dialog.append(close, image); document.body.append(dialog); dialog.showModal(); close.focus();
    });
  });
  window.__factoryRuntimeReady = true;
})();
