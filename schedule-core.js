(function (root) {
  'use strict';
  const DAYS = [
    { short: 'Mon', name: 'Monday' }, { short: 'Tue', name: 'Tuesday' },
    { short: 'Wed', name: 'Wednesday' }, { short: 'Thu', name: 'Thursday' },
    { short: 'Fri', name: 'Friday' }, { short: 'Sat', name: 'Saturday' },
    { short: 'Sun', name: 'Sunday' },
  ];
  const COLORS = [
    { bg: '#e8efdc', border: '#cddabd', accent: '#587344', ink: '#2f4a27' },
    { bg: '#f1e5d9', border: '#dfc7af', accent: '#a47850', ink: '#674422' },
    { bg: '#fcf1ce', border: '#e6d39b', accent: '#b68d2e', ink: '#745414' },
    { bg: '#e2ede5', border: '#c2d6c8', accent: '#477459', ink: '#2b5038' },
    { bg: '#eee4d7', border: '#d8c6ad', accent: '#866342', ink: '#5f4329' },
    { bg: '#f3ead1', border: '#ddcea0', accent: '#9c822e', ink: '#66541f' },
  ];
  function minutes(value) {
    if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return NaN;
    const [hour, minute] = value.split(':').map(Number);
    return hour < 24 && minute < 60 ? hour * 60 + minute : NaN;
  }
  function formatTime(value, withMinutes = true) {
    const total = typeof value === 'number' ? value : minutes(value);
    if (!Number.isFinite(total)) return '';
    const hour = Math.floor(total / 60) % 24;
    const minute = total % 60;
    return `${hour % 12 || 12}${withMinutes || minute ? ':' + String(minute).padStart(2, '0') : ''} ${hour < 12 ? 'AM' : 'PM'}`;
  }
  function title(section) { return section.classCode.trim() || section.description.trim(); }
  function subtitle(section) { return section.classCode.trim() && section.description.trim() ? section.description.trim() : ''; }
  function validate(section) {
    const start = minutes(section.startTime), end = minutes(section.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Enter a valid start and end time.';
    if (end <= start) return 'End time must be later than start time.';
    if (!Array.isArray(section.days) || !section.days.length) return 'Choose at least one day of the week.';
    if (section.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return 'Choose valid days of the week.';
    return '';
  }
  function normalize(value) {
    if (!value || typeof value !== 'object') return null;
    const section = {
      id: typeof value.id === 'string' ? value.id : '',
      classCode: typeof value.classCode === 'string' ? value.classCode.trim().slice(0, 100) : '',
      description: typeof value.description === 'string' ? value.description.trim().slice(0, 200) : '',
      startTime: value.startTime, endTime: value.endTime,
      days: Array.isArray(value.days) ? [...new Set(value.days)].sort((a, b) => a - b) : [],
      checked: value.checked !== false,
      color: Number.isInteger(value.color) && value.color >= 0 && value.color < COLORS.length ? value.color : 0,
    };
    return section.id && !validate(section) ? section : null;
  }
  function layoutDay(sections, day) {
    const events = sections.filter(s => s.checked && s.days.includes(day))
      .map(section => ({ section, start: minutes(section.startTime), end: minutes(section.endTime), column: 0, columns: 1, conflict: false }))
      .sort((a, b) => a.start - b.start || b.end - a.end || a.section.id.localeCompare(b.section.id));
    // Partition into connected overlap groups, then assign the first free column.
    let group = [], groupEnd = -1;
    function finishGroup() {
      const columnEnds = [];
      for (const event of group) {
        let column = columnEnds.findIndex(end => end <= event.start);
        if (column === -1) column = columnEnds.length;
        columnEnds[column] = event.end;
        event.column = column;
      }
      for (const event of group) {
        event.columns = columnEnds.length;
        event.conflict = group.some(other => other !== event && other.start < event.end && event.start < other.end);
      }
      group = [];
    }
    for (const event of events) {
      if (event.start >= groupEnd) { finishGroup(); groupEnd = -1; }
      group.push(event);
      groupEnd = Math.max(groupEnd, event.end);
    }
    finishGroup();
    return events;
  }
  function calendarBounds(sections) {
    const active = sections.filter(s => s.checked);
    return {
      start: Math.min(8 * 60, ...active.map(s => Math.floor(minutes(s.startTime) / 60) * 60)),
      end: Math.max(18 * 60, ...active.map(s => Math.ceil(minutes(s.endTime) / 60) * 60)),
    };
  }
  function weeklyMinutes(sections) {
    return sections.filter(s => s.checked).reduce((sum, s) => sum + (minutes(s.endTime) - minutes(s.startTime)) * s.days.length, 0);
  }
  const api = { DAYS, COLORS, minutes, formatTime, title, subtitle, validate, normalize, layoutDay, calendarBounds, weeklyMinutes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScheduleCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
