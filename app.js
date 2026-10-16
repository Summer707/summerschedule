(() => {
  'use strict';
  const C = window.ScheduleCore;
  // Retain the original storage key so the rename preserves existing schedules.
  const STORAGE_KEY = 'weekwise.sections.v1';
  const $ = id => document.getElementById(id);
  const form = $('class-form');
  let sections = [], editingId = null, lastDeleted = null, toastTimer;
  let storageAvailable = true;
  let conflictIds = new Set();

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name); svg.append(use);
    return svg;
  }
  function paint(element, color) {
    const palette = C.COLORS[color];
    for (const [key, value] of Object.entries(palette)) element.style.setProperty('--event-' + key, value);
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sections)); storageAvailable = true; }
    catch { storageAvailable = false; }
    updateSaveStatus();
  }
  function updateSaveStatus() {
    const status = $('save-status');
    status.replaceChildren(icon(storageAvailable ? 'check' : 'alert'), document.createTextNode(storageAvailable ? 'Saved' : 'Not saved'));
    status.classList.toggle('storage-error', !storageAvailable);
    status.title = storageAvailable ? 'Sections are saved automatically on this device and browser.' : 'Keep this tab open. Your browser could not save these sections for the next visit.';
  }
  function announce(message, canUndo = false) {
    clearTimeout(toastTimer);
    $('toast-message').textContent = message;
    $('undo-delete').hidden = !canUndo;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; lastDeleted = null; }, canUndo ? 10000 : 4000);
  }
  function hideError() {
    $('form-error').hidden = true;
    $('start-time').removeAttribute('aria-invalid');
    $('end-time').removeAttribute('aria-invalid');
  }
  function resetEditor() {
    editingId = null;
    $('form-heading').textContent = 'Add a class';
    $('submit-button').replaceChildren(icon('plus'), node('span', '', 'Add section'));
    $('cancel-edit').hidden = true;
    hideError();
  }
  function fillEditor(section, duplicate = false) {
    editingId = duplicate ? null : section.id;
    $('class-code').value = section.classCode;
    $('description').value = section.description;
    $('start-time').value = section.startTime;
    $('end-time').value = section.endTime;
    form.querySelectorAll('input[name="day"]').forEach(input => { input.checked = section.days.includes(Number(input.value)); });
    $('form-heading').textContent = duplicate ? 'Add another section' : 'Edit section';
    $('submit-button').replaceChildren(icon(duplicate ? 'plus' : 'check'), node('span', '', duplicate ? 'Add section' : 'Save changes'));
    $('cancel-edit').hidden = false;
    hideError(); renderList();
    $('class-editor').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    (duplicate ? $('start-time') : $('class-code')).focus({ preventScroll: true });
  }
  function renderCalendar() {
    const bounds = C.calendarBounds(sections);
    const hourHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-height')) || 48;
    const height = (bounds.end - bounds.start) / 60 * hourHeight;
    $('calendar-body').style.height = height + 'px';
    $('time-labels').replaceChildren();
    for (let time = bounds.start; time < bounds.end; time += 60) {
      const label = node('span', 'time-label', C.formatTime(time, false));
      label.style.top = (time - bounds.start) / 60 * hourHeight + 'px';
      $('time-labels').append(label);
    }
    $('day-columns').replaceChildren(); conflictIds = new Set();
    for (let day = 0; day < 7; day++) {
      const column = node('div', 'day-column' + (day > 4 ? ' weekend' : ''));
      column.setAttribute('aria-label', C.DAYS[day].name);
      const events = C.layoutDay(sections, day);
      for (const event of events) {
        const section = event.section;
        const duration = event.end - event.start;
        const button = node('button', 'calendar-event' + (duration <= 45 ? ' compact' : '') + (duration <= 20 ? ' tiny' : '') + (event.conflict ? ' conflict' : ''));
        button.type = 'button'; button.dataset.sectionId = section.id;
        paint(button, section.color);
        const eventName = C.title(section) || 'Blank section';
        const accessibleText = `${eventName}${C.subtitle(section) ? ', ' + C.subtitle(section) : ''}, ${C.DAYS[day].name}, ${C.formatTime(section.startTime)} to ${C.formatTime(section.endTime)}${event.conflict ? ', overlaps another section' : ''}. Click to edit.`;
        button.setAttribute('aria-label', accessibleText); button.title = accessibleText;
        button.style.top = (event.start - bounds.start) / 60 * hourHeight + 'px';
        button.style.height = Math.max(3, duration / 60 * hourHeight - 2) + 'px';
        button.style.left = `calc(${event.column / event.columns * 100}% + 3px)`;
        button.style.width = `calc(${100 / event.columns}% - 6px)`;
        if (C.title(section)) button.append(node('strong', '', C.title(section)));
        if (C.subtitle(section)) button.append(node('span', 'event-description', C.subtitle(section)));
        button.append(node('span', 'event-time', `${C.formatTime(section.startTime, false)}–${C.formatTime(section.endTime, false)}`));
        if (event.conflict) conflictIds.add(section.id);
        button.addEventListener('click', () => fillEditor(section));
        column.append(button);
      }
      $('day-columns').append(column);
    }
    const checked = sections.filter(s => s.checked);
    $('calendar-empty').hidden = checked.length > 0;
    $('selected-count').textContent = `${checked.length} section${checked.length === 1 ? '' : 's'} selected`;
    const hours = Math.round(C.weeklyMinutes(sections) / 60 * 100) / 100;
    $('weekly-hours').textContent = `${hours} hr${hours === 1 ? '' : 's'} / week`;
    $('conflict-notice').hidden = conflictIds.size === 0;
    $('conflict-notice').querySelector('span').textContent = `${conflictIds.size} sections overlap.`;
  }
  function renderList() {
    const list = $('section-list'); list.replaceChildren();
    $('sections-empty').hidden = sections.length > 0;
    $('section-count').textContent = sections.length;
    const nameCounts = new Map(), nameIndexes = new Map();
    for (const section of sections) {
      const key = C.title(section).toLocaleLowerCase();
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    }
    for (const section of sections) {
      const key = C.title(section).toLocaleLowerCase();
      const index = (nameIndexes.get(key) || 0) + 1; nameIndexes.set(key, index);
      const row = node('li', 'section-row' + (!section.checked ? ' is-off' : '') + (editingId === section.id ? ' is-editing' : ''));
      row.dataset.sectionId = section.id; paint(row, section.color);
      const checkbox = node('input', 'section-check'); checkbox.type = 'checkbox'; checkbox.id = 'section-' + section.id; checkbox.checked = section.checked;
      checkbox.setAttribute('aria-label', `Show ${C.title(section) || 'blank section'}, ${section.days.map(d => C.DAYS[d].short).join(', ')}, ${C.formatTime(section.startTime)} to ${C.formatTime(section.endTime)} on calendar`);
      checkbox.addEventListener('change', () => { section.checked = checkbox.checked; save(); render(); $('section-' + section.id)?.focus({ preventScroll: true }); });
      const info = node('label', 'section-info'); info.htmlFor = checkbox.id;
      const titleLine = node('div', 'section-title-line'); titleLine.append(node('span', 'section-title', C.title(section) || '\u00a0'));
      if (nameCounts.get(key) > 1) titleLine.append(node('span', 'section-option', 'Option ' + index));
      if (conflictIds.has(section.id)) titleLine.append(node('span', 'section-conflict', 'Overlap'));
      info.append(titleLine);
      if (C.subtitle(section)) info.append(node('div', 'section-description', C.subtitle(section)));
      const meta = node('div', 'section-meta');
      meta.append(node('span', '', section.days.map(d => C.DAYS[d].short).join(' · ')));
      const time = node('span', 'section-time'); time.append(icon('clock'), document.createTextNode(`${C.formatTime(section.startTime)}–${C.formatTime(section.endTime)}`)); meta.append(time); info.append(meta);
      const actions = node('div', 'section-actions');
      const actionSpecs = [
        ['edit', 'Edit section', () => fillEditor(section)],
        ['copy', 'Use as a new section', () => fillEditor(section, true)],
        ['trash', 'Delete section', () => deleteSection(section)],
      ];
      for (const [name, label, callback] of actionSpecs) {
        const button = node('button', 'icon-button' + (name === 'trash' ? ' delete-button' : '')); button.type = 'button'; button.title = label;
        button.setAttribute('aria-label', `${label}: ${C.title(section) || 'blank section'}`); button.append(icon(name)); button.addEventListener('click', callback); actions.append(button);
      }
      row.append(checkbox, info, actions); list.append(row);
    }
  }
  function render() { renderCalendar(); renderList(); }
  function deleteSection(section) {
    lastDeleted = { section, index: sections.findIndex(s => s.id === section.id) };
    sections = sections.filter(s => s.id !== section.id);
    if (editingId === section.id) resetEditor();
    save(); render(); announce('Section removed.', true);
  }

  for (const [index, day] of C.DAYS.entries()) {
    const header = node('span', 'day-name' + (index > 4 ? ' weekend' : ''), day.name); $('day-names').append(header);
    const label = node('label', 'day-option'); const input = node('input'); input.type = 'checkbox'; input.name = 'day'; input.value = index; input.setAttribute('aria-label', day.name);
    const text = node('span'); text.append(icon('check'), document.createTextNode(day.short)); label.append(input, text); $('day-options').append(label);
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (!Array.isArray(data)) throw new Error('Invalid schedule');
      const seen = new Set();
      sections = data.map(C.normalize).filter(section => {
        if (!section || seen.has(section.id)) return false;
        seen.add(section.id); return true;
      });
      if (sections.length !== data.length) announce('Some saved sections could not be read. Your valid sections are still here.');
    }
    // Check storage before promising that an empty schedule will be saved.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch {
    storageAvailable = false;
    announce('Saved schedule could not be read. Keep this tab open until browser storage is available.');
  }
  updateSaveStatus(); render();

  form.addEventListener('input', hideError);
  form.addEventListener('change', hideError);
  form.addEventListener('submit', event => {
    event.preventDefault(); hideError();
    const original = sections.find(s => s.id === editingId);
    const name = $('class-code').value.trim() || $('description').value.trim();
    const matching = sections.find(s => C.title(s).toLocaleLowerCase() === name.toLocaleLowerCase());
    const section = {
      id: editingId || (globalThis.crypto?.randomUUID ? crypto.randomUUID() : 's-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
      classCode: $('class-code').value.trim(), description: $('description').value.trim(),
      startTime: $('start-time').value, endTime: $('end-time').value,
      days: [...form.querySelectorAll('input[name="day"]:checked')].map(input => Number(input.value)),
      checked: original ? original.checked : true,
      color: original ? original.color : matching ? matching.color : sections.length % C.COLORS.length,
    };
    const error = C.validate(section);
    if (error) {
      $('form-error').textContent = error; $('form-error').hidden = false;
      if (C.minutes(section.endTime) <= C.minutes(section.startTime)) {
        $('end-time').setAttribute('aria-invalid', 'true'); $('end-time').focus();
      } else form.querySelector('input[name="day"]').focus();
      return;
    }
    if (original) sections = sections.map(s => s.id === original.id ? section : s);
    else sections.push(section);
    resetEditor(); save(); render();
    announce(original ? 'Section updated.' : 'Section added.');
  });
  $('cancel-edit').addEventListener('click', () => { form.reset(); resetEditor(); renderList(); });
  $('undo-delete').addEventListener('click', () => {
    if (!lastDeleted) return;
    sections.splice(lastDeleted.index, 0, lastDeleted.section); lastDeleted = null;
    save(); render(); announce('Section restored.');
  });
  $('close-toast').addEventListener('click', () => { $('toast').hidden = true; clearTimeout(toastTimer); lastDeleted = null; });
  const wideScreen = matchMedia('(min-width: 1450px)');
  wideScreen.addEventListener('change', renderCalendar);
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      const data = event.newValue ? JSON.parse(event.newValue) : [];
      if (!Array.isArray(data)) return;
      sections = data.map(C.normalize).filter(Boolean);
      if (editingId && !sections.some(s => s.id === editingId)) resetEditor();
      render();
    } catch { /* Keep the current schedule if another tab writes invalid data. */ }
  });
})();
