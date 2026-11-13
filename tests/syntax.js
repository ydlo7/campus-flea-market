/**
 * 语法检查：对 src 下所有脚本执行 `node --check`
 * 运行：node tests/syntax.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = ['src', 'scripts'];

function walk(dir, acc) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) walk(full, acc);
    else if (d.name.endsWith('.js')) acc.push(full);
  });
  return acc;
}

const files = TARGETS.reduce((acc, t) => walk(path.join(ROOT, t), acc), []);
let failed = 0;

files.forEach((file) => {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log('  \u2713 ' + path.relative(ROOT, file));
  } catch (e) {
    failed++;
    console.log('  \u2717 ' + path.relative(ROOT, file));
    console.log(String(e.stderr || e.message));
  }
});

console.log(`\n  ${files.length - failed}/${files.length} 个文件语法通过\n`);
process.exit(failed ? 1 : 0);
