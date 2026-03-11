import React, { useEffect, useMemo, useState } from 'react';
import './getstarted.css';

function Getstarted() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [theme, setTheme] = useState(() => localStorage.getItem('pat-theme') || 'light'); // 'light' | 'dark'

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    remember: false,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [status, setStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error' | ''
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('pat-theme', theme);
  }, [theme]);

  const isRegister = mode === 'register';

  const subtitle = useMemo(() => {
    if (isRegister) return 'Create your account and start tracking attendance.';
    return 'Login to continue to your dashboard.';
  }, [isRegister]);

  function setField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setStatus({ type: '', message: '' });
  }

  function clearNonModeFields(nextMode) {
    setErrors({ name: '', email: '', password: '', confirmPassword: '' });
    setStatus({ type: '', message: '' });
    setSubmitting(false);

    if (nextMode === 'login') {
      setValues((prev) => ({ ...prev, name: '', confirmPassword: '' }));
    }
  }

  function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  function validate() {
    const next = { name: '', email: '', password: '', confirmPassword: '' };
    let ok = true;

    if (isRegister && values.name.trim().length < 2) {
      next.name = 'Please enter your full name.';
      ok = false;
    }

    if (!validateEmail(values.email.trim())) {
      next.email = 'Enter a valid email.';
      ok = false;
    }

    if (values.password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
      ok = false;
    }

    if (isRegister) {
      if (!values.confirmPassword) {
        next.confirmPassword = 'Please confirm your password.';
        ok = false;
      } else if (values.password !== values.confirmPassword) {
        next.confirmPassword = 'Passwords do not match.';
        ok = false;
      }
    }

    setErrors(next);
    return ok;
  }

  function microShake() {
    const el = document.getElementById('pat-submit');
    if (!el || !el.animate) return;

    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], {
      duration: 220,
      easing: 'ease-out',
    });
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!validate()) {
      setStatus({ type: 'error', message: 'Please fix the highlighted fields.' });
      microShake();
      return;
    }

    setSubmitting(true);
    setStatus({ type: '', message: '' });

    // Demo-only fake submit (connect to backend later)
    await new Promise((r) => setTimeout(r, 900));

    setSubmitting(false);
    setStatus({
      type: 'success',
      message: isRegister ? 'Account created! (demo only)' : 'Login successful! (demo only)',
    });
  }

  return (
    <div className={`pat-auth ${theme === 'dark' ? 'pat-dark' : 'pat-light'}`}>
      <div className="pat-card" role="region" aria-label="Authentication">
        {/* Left side: brand + simple illustration */}
        <section className="pat-left" aria-label="Project introduction">
          <div className="pat-badge">
            <span className="pat-badge-dot" aria-hidden="true" />
            <span>Personal Attendance Tracking</span>
          </div>

          <h1 className="pat-title">Personal Attendance Tracking System</h1>
          <p className="pat-tagline">A clean, student-friendly way to manage daily attendance.</p>

          <div className="pat-illustration" aria-hidden="true">
            <div className="pat-chip">
              <div className="pat-chip-row">
                <span className="pat-chip-label">This week</span>
                <span className="pat-chip-pill">Good</span>
              </div>
              <div className="pat-chip-value">92% present</div>
              <div className="pat-chip-muted">Keep it consistent</div>
            </div>

            <div className="pat-chip pat-chip-2">
              <div className="pat-chip-row">
                <span className="pat-chip-label">Monthly avg</span>
                <span className="pat-chip-pill pat-pill-blue">Stable</span>
              </div>
              <div className="pat-chip-value">84.3%</div>
              <div className="pat-chip-muted">Auto calculated</div>
            </div>
          </div>

          <div className="pat-left-footer">Minimal UI · Soft colors · Smooth transitions</div>
        </section>

        {/* Right side: form */}
        <section className="pat-right" aria-label="Login and registration form">
          <header className="pat-right-header">
            <div>
              <h2 className="pat-form-title">{isRegister ? 'Create account' : 'Welcome back'}</h2>
              <p className="pat-form-subtitle">{subtitle}</p>
            </div>

            <button
              type="button"
              className="pat-theme-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle theme"
            >
              <span className="pat-theme-dot" aria-hidden="true" />
              <span className="pat-theme-text">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
          </header>

          <div className={`pat-tabs ${isRegister ? 'pat-tabs-register' : ''}`} role="tablist" aria-label="Auth mode toggle">
            <div className="pat-tab-indicator" aria-hidden="true" />
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={`pat-tab ${!isRegister ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                clearNonModeFields('login');
              }}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`pat-tab ${isRegister ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                clearNonModeFields('register');
              }}
            >
              Register
            </button>
          </div>

          <form className="pat-form" onSubmit={onSubmit} noValidate>
            {isRegister && (
              <div className="pat-field">
                <label className="pat-label" htmlFor="pat-name">
                  Name
                </label>
                <div className={`pat-input-wrap ${errors.name ? 'has-error' : ''}`}>
                  <input
                    id="pat-name"
                    type="text"
                    value={values.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    autoComplete="name"
                  />
                  <span className="pat-input-icon" aria-hidden="true">
                    👤
                  </span>
                </div>
                <div className="pat-error">{errors.name}</div>
              </div>
            )}

            <div className="pat-field">
              <label className="pat-label" htmlFor="pat-email">
                Email
              </label>
              <div className={`pat-input-wrap ${errors.email ? 'has-error' : ''}`}>
                <input
                  id="pat-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <span className="pat-input-icon" aria-hidden="true">
                  @
                </span>
              </div>
              <div className="pat-error">{errors.email}</div>
            </div>

            <div className="pat-field">
              <div className="pat-label-row">
                <label className="pat-label" htmlFor="pat-password">
                  Password
                </label>
                <span className="pat-hint">Min 6 characters</span>
              </div>
              <div className={`pat-input-wrap ${errors.password ? 'has-error' : ''}`}>
                <input
                  id="pat-password"
                  type="password"
                  value={values.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <span className="pat-input-icon" aria-hidden="true">
                  🔒
                </span>
              </div>
              <div className="pat-error">{errors.password}</div>
            </div>

            {isRegister && (
              <div className="pat-field">
                <label className="pat-label" htmlFor="pat-confirm">
                  Confirm password
                </label>
                <div className={`pat-input-wrap ${errors.confirmPassword ? 'has-error' : ''}`}>
                  <input
                    id="pat-confirm"
                    type="password"
                    value={values.confirmPassword}
                    onChange={(e) => setField('confirmPassword', e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                  <span className="pat-input-icon" aria-hidden="true">
                    ✅
                  </span>
                </div>
                <div className="pat-error">{errors.confirmPassword}</div>
              </div>
            )}

            <div className="pat-row">
              <label className="pat-check">
                <input
                  type="checkbox"
                  checked={values.remember}
                  onChange={(e) => setField('remember', e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="pat-link"
                onClick={() => setStatus({ type: 'error', message: 'Forgot password is not connected yet (demo).' })}
              >
                Forgot password?
              </button>
            </div>

            <button id="pat-submit" type="submit" className="pat-primary" disabled={submitting}>
              <span>{submitting ? (isRegister ? 'Creating...' : 'Logging in...') : isRegister ? 'Create account' : 'Login'}</span>
              <span className="pat-arrow" aria-hidden="true">
                →
              </span>
            </button>

            <div className={`pat-status ${status.type === 'error' ? 'is-error' : status.type === 'success' ? 'is-success' : ''}`}>
              {status.message}
            </div>

            <button
              type="button"
              className="pat-secondary"
              onClick={() => setStatus({ type: 'error', message: 'Google login is just a UI demo.' })}
            >
              <span className="pat-google" aria-hidden="true">
                G
              </span>
              <span>Continue with Google</span>
            </button>

            <p className="pat-footer">
              {isRegister ? 'Already have an account?' : 'New here?'}
              <button
                type="button"
                className="pat-link pat-link-strong"
                onClick={() => {
                  const next = isRegister ? 'login' : 'register';
                  setMode(next);
                  clearNonModeFields(next);
                }}
              >
                {isRegister ? 'Login instead' : 'Create an account'}
              </button>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Getstarted;