/**
 * 测试基座：在 Node 里提供最小 DOM / localStorage 桩，
 * 把浏览器脚本加载进来，用于验证数据层与页面渲染。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'src/ui.js',
  'src/analytics.js',
  'src/seed.js',
  'src/store.js',
  'src/router.js',
  'src/pages/auth.js',
  'src/pages/home.js',
  'src/pages/detail.js',
  'src/pages/publish.js',
  'src/pages/messages.js',
  'src/pages/order.js',
  'src/pages/mine.js',
];

function installStubs() {
  const store = {};
  global.window = global;
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };

  const el = () => ({
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    addEventListener() {},
    remove() {},
    click() {},
    querySelector: () => el(),
    querySelectorAll: () => [],
    innerHTML: '',
  });

  global.document = {
    addEventListener() {},
    getElementById: () => el(),
    querySelector: () => el(),
    querySelectorAll: () => [],
    createElement: () => el(),
    body: { appendChild() {}, classList: { toggle() {} } },
    readyState: 'complete',
  };
}

function loadApp() {
  FILES.forEach((rel) => {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    // 用 Function 执行，模拟浏览器里的全局脚本
    new Function('window', 'document', 'localStorage', 'console', code)(
      global,
      global.document,
      global.localStorage,
      console
    );
  });
  return global.CFM;
}

/* ---------- 极简断言 ---------- */
let pass = 0;
let fail = 0;
let group = '';

function describe(name) {
  group = name;
  console.log('\n' + name);
}

function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log('  \u2713 ' + name);
  } else {
    fail++;
    console.log('  \u2717 ' + name + (extra ? '  → ' + extra : ''));
  }
}

function summary() {
  console.log('\n' + '='.repeat(46));
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(46) + '\n');
  return fail === 0;
}

module.exports = { ROOT, installStubs, loadApp, describe, ok, summary };
