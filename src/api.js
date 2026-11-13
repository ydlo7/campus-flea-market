/**
 * HTTP 客户端：所有写操作都打到 /api，令牌存在 localStorage
 */
(function () {
  const CFM = (window.CFM = window.CFM || {});
  const KEY = 'cfm.token';
  let token = '';
  try {
    token = localStorage.getItem(KEY) || '';
  } catch (e) {
    token = '';
  }

  async function req(method, path, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;

    let res;
    try {
      res = await fetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      const err = new Error('连不上服务器，请先运行 npm start 再打开页面');
      err.offline = true;
      throw err;
    }

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      /* 非 JSON 响应 */
    }

    if (!res.ok) {
      const err = new Error((data && data.error) || '请求失败（' + res.status + '）');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  CFM.api = {
    req,
    get: (p) => req('GET', p),
    post: (p, b) => req('POST', p, b === undefined ? {} : b),
    patch: (p, b) => req('PATCH', p, b),
    del: (p) => req('DELETE', p),
    token: () => token,
    hasToken: () => !!token,
    setToken(t) {
      token = t || '';
      try {
        if (t) localStorage.setItem(KEY, t);
        else localStorage.removeItem(KEY);
      } catch (e) {
        /* ignore */
      }
    },
  };
})();
