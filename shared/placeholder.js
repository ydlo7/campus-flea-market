/**
 * 占位资源生成器（浏览器 / Node 通用）
 * - 商品图：浅色渐变 + emoji
 * - 收款码：伪二维码
 * - 支付凭证：仿支付成功截图
 * - 头像：渐变 + emoji
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.CFM = root.CFM || {};
    Object.assign(root.CFM, api);
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  function mix(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const f = (v) => Math.round(v + (255 - v) * k);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  function pic(emoji, c1, c2) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${mix(c1, 0.62)}"/><stop offset="1" stop-color="${mix(c2, 0.78)}"/></linearGradient></defs>` +
      `<rect width="640" height="640" fill="url(#g)"/>` +
      `<circle cx="512" cy="128" r="150" fill="#ffffff" opacity="0.5"/>` +
      `<text x="320" y="348" font-size="158" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function makeQR(seedText, color) {
    let seed = 0;
    const str = String(seedText || 'campus-flea');
    for (let i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) % 99991;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const N = 25;
    const S = 12;
    const M = 2;
    const size = N * S + M * 2;
    let cells = '';
    const finder = (ox, oy) => {
      let s = '';
      s += `<rect x="${ox * S + M}" y="${oy * S + M}" width="${7 * S}" height="${7 * S}" fill="${color}"/>`;
      s += `<rect x="${(ox + 1) * S + M}" y="${(oy + 1) * S + M}" width="${5 * S}" height="${5 * S}" fill="#fff"/>`;
      s += `<rect x="${(ox + 2) * S + M}" y="${(oy + 2) * S + M}" width="${3 * S}" height="${3 * S}" fill="${color}"/>`;
      return s;
    };
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const inFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
        if (inFinder) continue;
        if (rnd() > 0.52) cells += `<rect x="${x * S + M}" y="${y * S + M}" width="${S}" height="${S}" fill="${color}"/>`;
      }
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<rect width="${size}" height="${size}" fill="#ffffff"/>${cells}` +
      finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7) + `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function proofPic(amount) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620" viewBox="0 0 420 620">` +
      `<rect width="420" height="620" fill="#F3F4F6"/>` +
      `<rect x="18" y="70" width="384" height="470" rx="22" fill="#ffffff"/>` +
      `<circle cx="210" cy="180" r="42" fill="#0FAE6E"/>` +
      `<path d="M190 180l14 14 28-30" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<text x="210" y="268" font-size="30" font-weight="700" text-anchor="middle" fill="#1B1C1F" font-family="PingFang SC,Microsoft YaHei,sans-serif">支付成功</text>` +
      `<text x="210" y="330" font-size="52" font-weight="800" text-anchor="middle" fill="#1B1C1F" font-family="PingFang SC,Microsoft YaHei,sans-serif">¥${amount}</text>` +
      `<line x1="56" y1="372" x2="364" y2="372" stroke="#ECECEF" stroke-width="2"/>` +
      `<text x="56" y="412" font-size="19" fill="#9AA0A8" font-family="PingFang SC,Microsoft YaHei,sans-serif">当前状态</text>` +
      `<text x="364" y="412" font-size="19" fill="#5C6169" text-anchor="end" font-family="PingFang SC,Microsoft YaHei,sans-serif">支付成功</text>` +
      `<text x="56" y="458" font-size="19" fill="#9AA0A8" font-family="PingFang SC,Microsoft YaHei,sans-serif">转账说明</text>` +
      `<text x="364" y="458" font-size="19" fill="#5C6169" text-anchor="end" font-family="PingFang SC,Microsoft YaHei,sans-serif">二手闲置</text>` +
      `<text x="210" y="500" font-size="16" fill="#C3C7CD" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif">模拟凭证 · 演示数据</text>` +
      `<text x="210" y="592" font-size="17" fill="#B7BBC1" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif">微信支付</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function avatarPic(emoji, c1, c2) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">` +
      `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="160" height="160" fill="url(#a)"/>` +
      `<text x="80" y="92" font-size="82" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  return { pic, makeQR, proofPic, avatarPic, mix };
});
