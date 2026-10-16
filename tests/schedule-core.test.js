const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../schedule-core.js');
const section = (overrides = {}) => ({ id: 'a', classCode: 'BUSI 100', description: 'Intro to business', startTime: '09:00', endTime: '10:00', days: [0, 2, 4], checked: true, color: 0, ...overrides });

test('names support class only, description only, both, and a blank class', () => {
  assert.equal(C.title(section()), 'BUSI 100');
  assert.equal(C.subtitle(section()), 'Intro to business');
  assert.equal(C.title(section({ classCode: ' ', description: 'Intro to business' })), 'Intro to business');
  assert.equal(C.subtitle(section({ classCode: '' })), '');
  assert.equal(C.title(section({ description: '' })), 'BUSI 100');
  assert.equal(C.title(section({ classCode: ' ', description: ' ' })), '');
  assert.equal(C.validate(section({ classCode: '', description: '' })), '');
});
test('time and day validation catches unusable meetings while accepting weekends', () => {
  for (const time of ['24:00', '12:60', '9:00', '', 'garbage']) assert.ok(Number.isNaN(C.minutes(time)));
  assert.equal(C.minutes('00:00'), 0);
  assert.equal(C.minutes('23:59'), 1439);
  assert.ok(C.validate(section({ endTime: '09:00' })));
  assert.ok(C.validate(section({ endTime: '08:00' })));
  assert.ok(C.validate(section({ days: [] })));
  assert.ok(C.validate(section({ days: [7] })));
  assert.equal(C.validate(section({ days: [5, 6] })), '');
});
test('saved records are normalized and malformed records are rejected', () => {
  assert.equal(C.normalize(null), null);
  assert.equal(C.normalize({}), null);
  assert.equal(C.normalize(section({ endTime: 'nonsense' })), null);
  assert.deepEqual(C.normalize(section({ days: [4, 0, 4], classCode: ' BUSI 100 ', color: 50 })).days, [0, 4]);
  assert.equal(C.normalize(section({ checked: false })).checked, false);
  assert.equal(C.normalize(section({ color: 50 })).color, 0);
});
test('unchecked sections disappear and day selection controls placement', () => {
  const list = [section(), section({ id: 'b', checked: false }), section({ id: 'c', days: [1] })];
  assert.deepEqual(C.layoutDay(list, 0).map(e => e.section.id), ['a']);
  assert.deepEqual(C.layoutDay(list, 1).map(e => e.section.id), ['c']);
  assert.equal(C.layoutDay(list, 6).length, 0);
  assert.equal(C.layoutDay(list, 0)[0].start, 540);
});
test('overlapping alternatives share columns; back-to-back classes use full width', () => {
  const list = [section(), section({ id: 'b', startTime: '09:30', endTime: '10:30' }), section({ id: 'c', startTime: '10:30', endTime: '11:00' })];
  const events = C.layoutDay(list, 0);
  assert.equal(events[0].columns, 2); assert.equal(events[1].columns, 2);
  assert.notEqual(events[0].column, events[1].column);
  assert.ok(events[0].conflict && events[1].conflict);
  assert.equal(events[2].columns, 1); assert.equal(events[2].conflict, false);
});
test('connected overlap groups never assign simultaneous classes the same column', () => {
  const events = C.layoutDay([
    section({ id: 'a', startTime: '08:00', endTime: '12:00' }),
    section({ id: 'b', startTime: '09:00', endTime: '10:00' }),
    section({ id: 'c', startTime: '09:30', endTime: '11:00' }),
    section({ id: 'd', startTime: '10:00', endTime: '11:30' }),
  ], 0);
  assert.equal(events[0].columns, 3);
  for (const a of events) for (const b of events) {
    if (a !== b && a.start < b.end && b.start < a.end) assert.notEqual(a.column, b.column);
  }
});
test('calendar range expands to early and late classes, ignoring hidden alternatives', () => {
  assert.deepEqual(C.calendarBounds([]), { start: 480, end: 1080 });
  assert.deepEqual(C.calendarBounds([section({ startTime: '06:30', endTime: '07:15' }), section({ id: 'b', startTime: '22:00', endTime: '23:59' })]), { start: 360, end: 1440 });
  assert.deepEqual(C.calendarBounds([section({ startTime: '00:00', checked: false })]), { start: 480, end: 1080 });
});
test('weekly totals and noon/midnight labels are accurate', () => {
  assert.equal(C.weeklyMinutes([section(), section({ checked: false })]), 180);
  assert.equal(C.formatTime('00:00'), '12:00 AM');
  assert.equal(C.formatTime('12:00'), '12:00 PM');
  assert.equal(C.formatTime('13:05'), '1:05 PM');
});

test('credits count each checked section once, including alternative sections of the same class', () => {
  assert.equal(C.totalCredits([]), 0);
  assert.equal(C.totalCredits([
    section({ credits: 3 }),
    section({ id: 'b', credits: 4, days: [1] }),
    section({ id: 'c', credits: 5, checked: false }),
    section({ id: 'd', credits: null }),
    section({ id: 'e' }),
  ]), 7);
  assert.equal(C.totalCredits([section({ credits: 0.1 }), section({ id: 'b', credits: 0.2 })]), 0.3);
});

test('optional credits accept zero and fractions while rejecting invalid amounts', () => {
  for (const credits of [undefined, null, 0, 1, 2.5]) assert.equal(C.validate(section({ credits })), '');
  for (const credits of [-1, NaN, Infinity, '3', '']) assert.ok(C.validate(section({ credits })));
});

test('saved credits survive reloads and legacy or damaged credit fields preserve the class', () => {
  const saved = C.normalize(JSON.parse(JSON.stringify(section({ credits: 2.5 }))));
  assert.equal(saved.credits, 2.5);
  assert.equal(C.totalCredits([saved]), 2.5);
  for (const credits of [undefined, null, -1, 'bad', Infinity]) {
    const restored = C.normalize(section({ credits }));
    assert.equal(restored.classCode, 'BUSI 100');
    assert.equal(restored.credits, null);
    assert.equal(C.totalCredits([restored]), 0);
  }
  assert.equal(C.normalize(section({ credits: 0 })).credits, 0);
});

test('default alphabetical order uses natural class numbers, descriptions, and blank names last', () => {
  const list = [
    section({ id: 'blank', classCode: '', description: '' }),
    section({ id: 'math', classCode: 'MATH 101' }),
    section({ id: 'ten', classCode: 'BUSI 10' }),
    section({ id: 'two', classCode: 'busi 2' }),
    section({ id: 'desc', classCode: '', description: 'Art history' }),
  ];
  assert.deepEqual(C.sortSections(list).map(s => s.id), ['desc', 'two', 'ten', 'math', 'blank']);
  assert.deepEqual(C.sortSections(list, 'unknown').map(s => s.id), ['desc', 'two', 'ten', 'math', 'blank']);
  assert.deepEqual(list.map(s => s.id), ['blank', 'math', 'ten', 'two', 'desc']);
});

test('recently added order remains newest first after editing and switching sort modes', () => {
  const list = [section({ id: 'old', classCode: 'ZOO 100' }), section({ id: 'new', classCode: 'ART 100' })];
  C.sortSections(list);
  C.sortSections(list, 'color');
  list[0] = { ...list[0], classCode: 'AAA 100', credits: 4, color: 3 };
  assert.deepEqual(C.sortSections(list, 'recent').map(s => s.id), ['new', 'old']);
  assert.deepEqual(C.sortSections(list).map(s => s.id), ['old', 'new']);
});

test('color sorting groups the palette and orders each group alphabetically without hiding unchecked classes', () => {
  const list = [
    section({ id: 'gold', color: 2, classCode: 'ART 100' }),
    section({ id: 'sage-z', color: 0, classCode: 'ZOO 100', checked: false }),
    section({ id: 'sand', color: 1, classCode: 'ART 100' }),
    section({ id: 'sage-a', color: 0, classCode: 'ART 100' }),
    section({ id: 'sage-blank', color: 0, classCode: '', description: '' }),
  ];
  assert.deepEqual(C.sortSections(list, 'color').map(s => s.id), ['sage-a', 'sage-z', 'sage-blank', 'sand', 'gold']);
  assert.deepEqual(C.sortSections([section({ id: 'a' }), section({ id: 'b' })]).map(s => s.id), ['a', 'b']);
});

test('every selectable color survives saved schedule normalization and invalid colors fall back safely', () => {
  for (let color = 0; color < C.COLORS.length; color++) {
    assert.equal(C.normalize(JSON.parse(JSON.stringify(section({ color })))).color, color);
  }
  for (const color of [undefined, -1, C.COLORS.length, '2', null]) assert.equal(C.normalize(section({ color })).color, 0);
});
