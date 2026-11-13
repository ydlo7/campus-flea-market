/* ===== 页面：登录 / 注册 ===== */
(function () {
  const CFM = window.CFM;
  const { esc } = CFM.ui;

  const state = { tab: 'login' };

  CFM.pages.auth = {
    render() {
      const isLogin = state.tab === 'login';
      return `
      <div class="auth-wrap">
        <div class="auth">
          <div class="al"><span class="m">跳</span><span style="font-size:14px;font-weight:500">跳蚤市场 · 校园二手</span></div>
          <h1>${isLogin ? '登录你的账号' : '创建账号'}</h1>
          <p class="as">${isLogin ? '同校同学之间，把闲置交给下一个需要的人。' : '填写学号完成校园身份验证，更容易成交。'}</p>

          <div class="atabs">
            <button class="${isLogin ? 'on' : ''}" data-act="auth.tab" data-tab="login">登录</button>
            <button class="${!isLogin ? 'on' : ''}" data-act="auth.tab" data-tab="reg">注册</button>
          </div>

          ${isLogin
            ? `<div class="fld"><label>手机号</label><input class="inp" id="fPhone" type="tel" inputmode="numeric" value="13800138000"></div>
               <div class="fld"><label>密码</label><input class="inp" id="fPwd" type="password" value="123456"></div>
               <button class="btn primary" data-act="auth.login">登录</button>
               <div class="tip">演示账号已填好：<b>13800138000</b> / <b>123456</b>，直接登录即可。</div>`
            : `<div class="fld"><label>昵称</label><input class="inp" id="rNick" maxlength="12" placeholder="同学怎么称呼你"></div>
               <div class="fld"><label>手机号</label><input class="inp" id="rPhone" type="tel" inputmode="numeric" maxlength="11" placeholder="11 位手机号"></div>
               <div class="fld"><label>密码</label><input class="inp" id="rPwd" type="password" placeholder="至少 6 位"></div>
               <div style="display:flex;gap:12px">
                 <div class="fld" style="flex:1"><label>学校</label><input class="inp" id="rSchool" value="湖南大学"></div>
                 <div class="fld" style="flex:1"><label>校区</label><input class="inp" id="rCampus" value="南校区"></div>
               </div>
               <div class="fld"><label>学号（用于校园身份验证）</label><input class="inp" id="rNo" maxlength="16" placeholder="如 2023xxxx1024"></div>
               <button class="btn primary" data-act="auth.register">注册并进入</button>
               <div class="tip">填写学号后会显示「校园认证」标识；不填也可以注册，但主页没有认证标签。</div>`}

          <div class="foot">注册即代表同意《校园二手交易公约》<br>演示原型，交易与支付均为模拟</div>
        </div>
      </div>`;
    },
    mount() {
      const onEnter = (e) => {
        if (e.key !== 'Enter') return;
        if (state.tab === 'login') CFM.actions['auth.login']();
        else CFM.actions['auth.register']();
      };
      document.querySelectorAll('.auth input').forEach((i) => i.addEventListener('keydown', onEnter));
    },
  };

  CFM.actions['auth.tab'] = (el) => {
    state.tab = el.dataset.tab;
    CFM.router.refresh();
  };

  CFM.actions['auth.login'] = async () => {
    const phone = (document.getElementById('fPhone') || {}).value || '';
    const pwd = (document.getElementById('fPwd') || {}).value || '';
    if (!/^\d{6,}$/.test(phone)) return CFM.ui.toast('请输入正确的手机号');
    if (!pwd) return CFM.ui.toast('请输入密码');
    try {
      const r = await CFM.store.login(phone, pwd);
      CFM.ui.toast('欢迎回来，' + (r.snapshot.me ? r.snapshot.me.nick : '同学'));
      CFM.router.stack = [{ name: 'home', params: {} }];
      CFM.router.render();
    } catch (e) {
      CFM.ui.toast(e.message);
    }
  };

  CFM.actions['auth.register'] = async () => {
    const g = (id) => ((document.getElementById(id) || {}).value || '').trim();
    const nick = g('rNick'), phone = g('rPhone'), pwd = g('rPwd');
    if (!nick) return CFM.ui.toast('给自己起个昵称吧');
    if (!/^\d{11}$/.test(phone)) return CFM.ui.toast('手机号需要 11 位');
    if (pwd.length < 6) return CFM.ui.toast('密码至少 6 位');
    try {
      await CFM.store.register({
        nick, phone, pwd,
        school: g('rSchool') || '湖南大学',
        campus: g('rCampus') || '南校区',
        studentNo: g('rNo'),
      });
      CFM.ui.toast('注册成功，开始逛逛吧');
      CFM.router.stack = [{ name: 'home', params: {} }];
      CFM.router.render();
    } catch (e) {
      CFM.ui.toast(e.message);
    }
  };
})();
