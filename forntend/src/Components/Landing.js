import React from "react";
import "./landing.css";

function Landing({ onDemo }) {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark" aria-hidden="true">
            〽
          </span>
          <span>Attendly</span>
        </div>
        <nav aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#benefits">Benefits</a>
          <a href="#about">About</a>
        </nav>
        <button type="button" className="landing-demo-nav" onClick={onDemo}>
          <span aria-hidden="true">✦</span> Demo
        </button>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="landing-badge">
            <span aria-hidden="true" />
            Smarter attendance. Better insights.
          </div>
          <h1>
            Personal Attendance
            <strong>Tracking System</strong>
          </h1>
          <p>
            A modern and simple way to track attendance, analyze patterns and
            stay on top of your progress.
          </p>

          <div className="landing-benefits" id="benefits">
            <div>
              <span aria-hidden="true">▣</span>
              <b>Track</b>
              <small>Attendance</small>
            </div>
            <div>
              <span aria-hidden="true">▥</span>
              <b>Visualize</b>
              <small>Analytics</small>
            </div>
            <div>
              <span aria-hidden="true">♢</span>
              <b>Stay</b>
              <small>Consistent</small>
            </div>
            <div>
              <span aria-hidden="true">ϟ</span>
              <b>Build a</b>
              <small>Better You</small>
            </div>
          </div>

          <button type="button" className="landing-demo" onClick={onDemo}>
            <span>✦ Try Demo</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="dashboard-preview" aria-label="Dashboard preview">
          <div className="preview-sidebar">
            <div className="preview-logo"><span>〽</span> Attendly</div>
            <div className="preview-side-link active">⌂ <span>Overview</span></div>
            <div className="preview-side-link">▣ <span>Attendance</span></div>
            <div className="preview-side-link">▥ <span>Analytics</span></div>
            <div className="preview-side-link">▤ <span>Reports</span></div>
            <div className="preview-side-link">⚙ <span>Settings</span></div>
          </div>
          <div className="preview-main">
            <div className="preview-topbar"><span>Good Morning,</span><b>Oct 6, 2025</b></div>
            <h2>Here's your attendance overview</h2>
            <p>Track your progress and stay consistent.</p>
            <div className="preview-stats">
              <div><small>This week <i>Good</i></small><strong>92%</strong><span>Attendance Rate</span></div>
              <div><small>Monthly avg</small><strong>84.3%</strong><span>Attendance Rate</span></div>
              <div><small>Total Days</small><strong>21</strong><span>Days Tracked</span></div>
            </div>
            <div className="preview-chart">
              <div className="preview-chart-title">Attendance Trend <small>Last 7 days⌄</small></div>
              <div className="preview-bars">{[58, 56, 54, 68, 65, 76, 83].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div>
              <div className="preview-days"><span>Sep 30</span><span>Oct 1</span><span>Oct 2</span><span>Oct 3</span><span>Oct 4</span><span>Oct 5</span><span>Oct 6</span></div>
            </div>
            <div className="preview-bottom">
              <div><b>Recent Activity</b><p>● Attendance marked</p><p>● Attendance marked</p><p>● Attendance marked</p></div>
              <div className="preview-ring"><b>92%</b><small>Attendance Rate</small></div>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-info-section" id="features">
        <div className="landing-section-heading">
          <span>Features</span>
          <h2>Everything you need to build better attendance habits.</h2>
        </div>
        <div className="landing-info-grid">
          <article>
            <span className="landing-step">01</span>
            <h3>Smart timetable setup</h3>
            <p>Keep your weekly classes structured and easy to update whenever your schedule changes.</p>
          </article>
          <article>
            <span className="landing-step">02</span>
            <h3>Clear attendance analytics</h3>
            <p>See subject summaries, attendance trends, and the numbers that matter at a glance.</p>
          </article>
          <article>
            <span className="landing-step">03</span>
            <h3>Actionable insights</h3>
            <p>Spot risk early and make informed choices to stay consistent throughout the semester.</p>
          </article>
        </div>
      </section>
      <section className="landing-info-section" id="how-it-works">
        <div className="landing-section-heading">
          <span>How It Works</span>
          <h2>Stay on top of attendance in three simple steps.</h2>
        </div>
        <div className="landing-info-grid">
          <article>
            <span className="landing-step">01</span>
            <h3>Set your timetable</h3>
            <p>Add your weekly schedule once and keep every subject organized in one place.</p>
          </article>
          <article>
            <span className="landing-step">02</span>
            <h3>Mark attendance</h3>
            <p>Record attendance as you go with a quick, focused flow built for students.</p>
          </article>
          <article>
            <span className="landing-step">03</span>
            <h3>Improve your progress</h3>
            <p>Use clear analytics and insights to understand trends and plan ahead.</p>
          </article>
        </div>
      </section>

      <section className="landing-info-section landing-about-section" id="about">
        <div className="landing-section-heading">
          <span>About Attendly</span>
          <h2>Built to make consistent attendance feel simple.</h2>
        </div>
        <p>
          Attendly is a student-focused attendance companion that brings
          timetables, daily tracking, and actionable insights together in one
          calm, easy-to-use experience.
        </p>
      </section>
    </main>
  );
}

export default Landing;
