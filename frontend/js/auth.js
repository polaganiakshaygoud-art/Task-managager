// ============================================================
//  Auth Views: Login & Register
// ============================================================

function renderAuthPage() {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-bg-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>

      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
              <path d="M8 11h16M8 16h10M8 21h13" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="24" cy="20" r="5" fill="#43e97b"/>
              <path d="M22 20l1.5 1.5L26 18.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6c63ff"/>
                  <stop offset="1" stop-color="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 class="logo-title">TaskFlow</h1>
            <p class="logo-sub">Organize. Focus. Achieve.</p>
          </div>
        </div>

        <!-- Tab switcher -->
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login" onclick="showLoginForm()">Sign In</button>
          <button class="auth-tab" id="tab-register" onclick="showRegisterForm()">Sign Up</button>
        </div>

        <!-- Login Form -->
        <form id="login-form" class="auth-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label for="login-email">Email</label>
            <div class="input-wrap">
              <span class="input-icon">✉️</span>
              <input type="email" id="login-email" placeholder="you@example.com" required autocomplete="email"/>
            </div>
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <div class="input-wrap">
              <span class="input-icon">🔒</span>
              <input type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password"/>
              <button type="button" class="toggle-pw" onclick="togglePw('login-password', this)">👁️</button>
            </div>
          </div>
          <div id="login-error" class="auth-error hidden"></div>
          <button type="submit" class="btn-primary btn-full" id="login-btn">
            <span class="btn-text">Sign In</span>
            <span class="btn-loader hidden"></span>
          </button>
          <div class="auth-extra-links">
            <a href="#" onclick="showForgotForm()">Forgot password?</a>
          </div>
          
          <div class="auth-divider"><span>OR</span></div>
          <div id="google-btn-container"></div>

          <p class="auth-footer-text">Don't have an account? <a href="#" onclick="showRegisterForm()">Sign up free</a></p>
        </form>

        <!-- Register Form -->
        <form id="register-form" class="auth-form hidden" onsubmit="handleRegister(event)">
          <div class="form-group">
            <label for="reg-username">Username</label>
            <div class="input-wrap">
              <span class="input-icon">👤</span>
              <input type="text" id="reg-username" placeholder="johndoe" required minlength="3" autocomplete="username"/>
            </div>
          </div>
          <div class="form-group">
            <label for="reg-email">Email</label>
            <div class="input-wrap">
              <span class="input-icon">✉️</span>
              <input type="email" id="reg-email" placeholder="you@example.com" required autocomplete="email"/>
            </div>
          </div>
          <div class="form-group">
            <label for="reg-password">Password</label>
            <div class="input-wrap">
              <span class="input-icon">🔒</span>
              <input type="password" id="reg-password" placeholder="Min 6 characters" required minlength="6" autocomplete="new-password"/>
              <button type="button" class="toggle-pw" onclick="togglePw('reg-password', this)">👁️</button>
            </div>
          </div>
          <div id="register-error" class="auth-error hidden"></div>
          <button type="submit" class="btn-primary btn-full" id="register-btn">
            <span class="btn-text">Create Account</span>
            <span class="btn-loader hidden"></span>
          </button>
          <p class="auth-footer-text">Already have an account? <a href="#" onclick="showLoginForm()">Sign in</a></p>
        </form>

        <!-- Forgot Password Form -->
        <form id="forgot-form" class="auth-form hidden" onsubmit="handleForgot(event)">
          <div class="form-group">
            <label for="forgot-email">Email</label>
            <div class="input-wrap">
              <span class="input-icon">✉️</span>
              <input type="email" id="forgot-email" placeholder="you@example.com" required/>
            </div>
          </div>
          <div id="forgot-error" class="auth-error hidden"></div>
          <button type="submit" class="btn-primary btn-full" id="forgot-btn">
            <span class="btn-text">Send Reset Code</span>
            <span class="btn-loader hidden"></span>
          </button>
          <p class="auth-footer-text"><a href="#" onclick="showLoginForm()">Back to Sign In</a></p>
        </form>

        <!-- Reset Password Form -->
        <form id="reset-form" class="auth-form hidden" onsubmit="handleReset(event)">
          <div class="form-group">
            <label for="reset-email">Email</label>
            <div class="input-wrap">
              <span class="input-icon">✉️</span>
              <input type="email" id="reset-email" readonly/>
            </div>
          </div>
          <div class="form-group">
            <label for="reset-code">Reset Code (6 digits)</label>
            <div class="input-wrap">
              <span class="input-icon">🔢</span>
              <input type="text" id="reset-code" placeholder="123456" required maxlength="6"/>
            </div>
          </div>
          <div class="form-group">
            <label for="reset-password">New Password</label>
            <div class="input-wrap">
              <span class="input-icon">🔒</span>
              <input type="password" id="reset-password" placeholder="••••••••" required minlength="6"/>
            </div>
          </div>
          <div id="reset-error" class="auth-error hidden"></div>
          <button type="submit" class="btn-primary btn-full" id="reset-btn">
            <span class="btn-text">Reset Password</span>
            <span class="btn-loader hidden"></span>
          </button>
          <p class="auth-footer-text"><a href="#" onclick="showLoginForm()">Back to Sign In</a></p>
        </form>
      </div>
    </div>
  `;
  initGoogleAuth();
}

async function initGoogleAuth() {
  try {
    const { googleClientId } = await API.Config.get();
    if (!googleClientId) return;

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleResponse
    });

    const container = document.getElementById('google-btn-container');
    if (container) {
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: container.offsetWidth,
        text: 'signin_with'
      });
    }
  } catch (err) {
    console.error('Google Auth init failed:', err);
  }
}

async function handleGoogleResponse(response) {
  const errEl = document.getElementById('login-error');
  try {
    const user = await API.Auth.googleLogin(response.credential);
    window.AppRouter.navigateTo('dashboard', user);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

function showLoginForm() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.add('hidden');
  document.getElementById('reset-form').classList.add('hidden');
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
}

function showRegisterForm() {
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.add('hidden');
  document.getElementById('reset-form').classList.add('hidden');
  document.getElementById('tab-register').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
}

function showForgotForm() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.remove('hidden');
  document.getElementById('reset-form').classList.add('hidden');
}

function showResetForm(email) {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.add('hidden');
  document.getElementById('reset-form').classList.remove('hidden');
  document.getElementById('reset-email').value = email;
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    const user = await API.Auth.login(email, password);
    window.AppRouter.navigateTo('dashboard', user);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    shakeElement(errEl);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');
  const btn = document.getElementById('register-btn');

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    const user = await API.Auth.register(username, email, password);
    window.AppRouter.navigateTo('dashboard', user);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    shakeElement(errEl);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleForgot(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const errEl = document.getElementById('forgot-error');
  const btn = document.getElementById('forgot-btn');

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    await API.Auth.forgotPassword(email);
    showResetForm(email);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    shakeElement(errEl);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleReset(e) {
  e.preventDefault();
  const email = document.getElementById('reset-email').value;
  const code = document.getElementById('reset-code').value;
  const newPassword = document.getElementById('reset-password').value;
  const errEl = document.getElementById('reset-error');
  const btn = document.getElementById('reset-btn');

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    await API.Auth.resetPassword(email, code, newPassword);
    showLoginForm();
    if (window.showToast) window.showToast('Password reset successful! Please sign in.', 'success');
    else alert('Password reset successful! Please sign in.');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    shakeElement(errEl);
  } finally {
    setButtonLoading(btn, false);
  }
}

function setButtonLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

function shakeElement(el) {
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 600);
}
