import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/layout/PageLoading.astro', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function navigation() {
  const listeners = new Map(), timers = new Map(), microtasks = [];
  const overlay = { hidden: true };
  const content = { inert: false, setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; } };
  class Element { closest() { return this; } }
  class Anchor extends Element {
    constructor(href, extras = {}) { super(); Object.assign(this, { href, target: '', dataset: {}, download: false }, extras); }
    hasAttribute(name) { return name === 'download' && this.download; }
  }
  const register = (name, handler) => listeners.set(name, handler);
  runInNewContext(code, {
    document: { getElementById: id => id === 'page-loading' ? overlay : content, addEventListener: register, querySelector: () => null },
    window: { addEventListener: register }, location: new URL('https://example.test/'), URL,
    Element, HTMLAnchorElement: Anchor, queueMicrotask: fn => microtasks.push(fn),
    setTimeout: (fn, delay) => { assert.equal(delay, 150); timers.set(fn, fn); return fn; }, clearTimeout: id => timers.delete(id),
  });
  return { overlay, content, listeners, timers,
    click(href, eventExtras = {}, linkExtras = {}) {
      const event = { target: new Anchor(href, linkExtras), button: 0, defaultPrevented: false, ...eventExtras };
      listeners.get('click')(event);
      return event;
    },
    settle() { while (microtasks.length) microtasks.shift()(); },
    wait() { for (const fn of [...timers.values()]) { timers.delete(fn); fn(); } },
  };
}

test('navigation feedback waits briefly, blocks background focus and resets on back/forward restore or Escape', () => {
  const page = navigation();
  page.click('https://example.test/life');
  page.settle();
  assert.equal(page.overlay.hidden, true, 'Fast navigations never flash the overlay');
  page.wait();
  assert.equal(page.overlay.hidden, false);
  assert.equal(page.content.inert, true);
  assert.equal(page.content['aria-busy'], 'true');
  page.listeners.get('pageshow')();
  assert.equal(page.overlay.hidden, true);
  assert.equal(page.content.inert, false);
  page.click('https://example.test/life?refresh=tasks');
  page.settle(); page.wait();
  assert.equal(page.overlay.hidden, false);
  page.listeners.get('keydown')({ key: 'Escape' });
  assert.equal(page.overlay.hidden, true);
  assert.equal(page.content.inert, false);
});

test('external, hash, download, new-tab, modified and cancelled clicks never display navigation feedback', () => {
  const page = navigation();
  page.click('https://elsewhere.test/life');
  page.click('https://example.test/#explore');
  page.click('https://example.test/file.pdf');
  page.click('https://example.test/api/social/twitter');
  page.click('https://example.test/life', {}, { target: '_blank' });
  page.click('https://example.test/life', {}, { download: true });
  page.click('https://example.test/life', { ctrlKey: true });
  page.click('https://example.test/life', {}, { dataset: { loading: 'off' } });
  const cancelled = page.click('https://example.test/life');
  cancelled.defaultPrevented = true;
  page.settle(); page.wait();
  assert.equal(page.overlay.hidden, true);
  assert.equal(page.content.inert, false);
});
