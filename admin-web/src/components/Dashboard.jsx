import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "../services/adminService.js";
import ChapterModal from "./ChapterModal.jsx";
import ActivityBuilder from "./ActivityBuilder.jsx";
import QuizBuilder from "./QuizBuilder.jsx";

const subjectName = (id) =>
  ({ bangla: "বাংলা", english: "English", math: "গণিত" })[id] ?? id;

export default function Dashboard({ admin, onLogout }) {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState("activities");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setChapters(await adminService.listChapters());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load chapters.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => ({
    all: chapters.length,
    published: chapters.filter((x) => x.status === "published").length,
    draft: chapters.filter((x) => x.status === "draft").length,
    activities: chapters.reduce((sum, x) => sum + x.activity_count, 0),
  }), [chapters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapters.filter((chapter) => {
      if (classFilter !== "all" && chapter.class_level !== Number(classFilter)) return false;
      if (subjectFilter !== "all" && chapter.subject_id !== subjectFilter) return false;
      if (statusFilter !== "all" && chapter.status !== statusFilter) return false;
      if (!q) return true;
      return [chapter.title_bn, chapter.title_en ?? "", subjectName(chapter.subject_id)]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [chapters, search, classFilter, subjectFilter, statusFilter]);

  const nextNumber = chapters.length
    ? Math.max(...chapters.map((x) => x.chapter_number)) + 1
    : 1;

  async function logout() {
    await adminService.logout();
    onLogout();
  }

  async function archive(chapter) {
    if (!window.confirm(`Archive "${chapter.title_bn}"? Student history will be kept.`)) return;
    try {
      await adminService.archiveChapter(chapter.id);
      await load();
    } catch (error) {
      setError(error.message);
    }
  }

  if (selectedChapter) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div>
            <button className="back-link" onClick={() => setSelectedChapter(null)}>← Chapters</button>
            <h1>{selectedChapter.title_bn}</h1>
            <p className="muted">
              Class {selectedChapter.class_level} · {subjectName(selectedChapter.subject_id)}
            </p>
          </div>

          <div className="segmented">
            <button className={workspaceTab === "activities" ? "active" : ""} onClick={() => setWorkspaceTab("activities")}>
              Activities
            </button>
            <button className={workspaceTab === "quiz" ? "active" : ""} onClick={() => setWorkspaceTab("quiz")}>
              Quiz Builder
            </button>
          </div>
        </header>

        {workspaceTab === "activities" ? (
          <ActivityBuilder chapter={selectedChapter} onOpenQuiz={() => setWorkspaceTab("quiz")} />
        ) : (
          <QuizBuilder chapter={selectedChapter} />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">NCTB KIDS · WEB CMS</p>
          <h1>Admin Dashboard</h1>
          <p className="muted">{admin.name} · {admin.role === "admin" ? "Admin" : "Content Creator"}</p>
        </div>

        <div className="top-actions">
          <button className="ghost-btn" onClick={load}>↻ Refresh</button>
          <button className="ghost-btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CONTENT CONTROL CENTER</p>
          <h2>Upload lessons from any browser—no code, no JSON.</h2>
          <p>
            Teachers choose a chapter, fill visual forms, preview content structure, and publish to the same Supabase used by the mobile app.
          </p>
        </div>
        <button className="primary-btn hero-button" onClick={() => setEditor({ mode: "new" })}>
          ＋ New Chapter
        </button>
      </section>

      <section className="metric-grid">
        <Metric value={metrics.all} label="All Chapters" />
        <Metric value={metrics.published} label="Published" />
        <Metric value={metrics.draft} label="Draft" />
        <Metric value={metrics.activities} label="Activities" />
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">CURRICULUM</p>
            <h2>Chapter Management</h2>
          </div>
          <button className="primary-btn" onClick={() => setEditor({ mode: "new" })}>＋ Add Chapter</button>
        </div>

        <div className="filters">
          <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chapters..." />
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">All classes</option>
            <option value="1">Class 1</option>
            <option value="2">Class 2</option>
            <option value="3">Class 3</option>
          </select>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">All subjects</option>
            <option value="bangla">বাংলা</option>
            <option value="english">English</option>
            <option value="math">গণিত</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        {loading ? (
          <div className="loading-card">Loading chapters...</div>
        ) : (
          <div className="chapter-grid">
            {filtered.map((chapter) => (
              <article className="chapter-card" key={chapter.id}>
                <div className="chapter-card-top">
                  <span className={`status ${chapter.status}`}>{chapter.status}</span>
                  <span className="chapter-number">#{chapter.chapter_number}</span>
                </div>
                <h3>{chapter.title_bn}</h3>
                <p className="muted">
                  Class {chapter.class_level} · {subjectName(chapter.subject_id)}
                </p>
                <p className="muted">
                  {chapter.published_activity_count}/{chapter.activity_count} activities published
                </p>
                <div className="row-actions">
                  <button className="primary-btn" onClick={() => setSelectedChapter(chapter)}>Manage Content</button>
                  <button className="ghost-btn" onClick={() => setEditor({ mode: "edit", chapter })}>Edit</button>
                  <button className="ghost-btn danger-outline" onClick={() => archive(chapter)}>Archive</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editor ? (
        <ChapterModal
          chapter={editor.chapter}
          nextNumber={nextNumber}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await load();
          }}
        />
      ) : null}
    </main>
  );
}

function Metric({ value, label }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
