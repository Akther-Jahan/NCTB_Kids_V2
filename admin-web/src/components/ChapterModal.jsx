import React, { useEffect, useState } from "react";
import { adminService } from "../services/adminService.js";

const empty = {
  classLevel: 1,
  subjectId: "bangla",
  chapterNumber: 1,
  titleBn: "",
  titleEn: "",
  summaryBn: "",
  coverUrl: "",
  status: "draft",
};

export default function ChapterModal({ chapter, nextNumber, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (chapter) {
      setForm({
        id: chapter.id,
        classLevel: chapter.class_level,
        subjectId: chapter.subject_id,
        chapterNumber: chapter.chapter_number,
        titleBn: chapter.title_bn,
        titleEn: chapter.title_en ?? "",
        summaryBn: chapter.summary_bn ?? "",
        coverUrl: chapter.cover_url ?? "",
        status: chapter.status,
      });
    } else {
      setForm({ ...empty, chapterNumber: nextNumber });
    }
  }, [chapter, nextNumber]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function save(event) {
    event.preventDefault();
    if (!form.titleBn.trim()) {
      setError("Chapter title is required.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await adminService.saveChapter(form);
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <p className="eyebrow">CURRICULUM</p>
            <h2>{chapter ? "Edit Chapter" : "New Chapter"}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={save} className="form-stack">
          <div className="grid-3">
            <label>
              Class
              <select value={form.classLevel} onChange={(e) => set("classLevel", Number(e.target.value))}>
                <option value={1}>Class 1</option>
                <option value={2}>Class 2</option>
                <option value={3}>Class 3</option>
              </select>
            </label>

            <label>
              Subject
              <select value={form.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
                <option value="bangla">বাংলা</option>
                <option value="english">English</option>
                <option value="math">গণিত</option>
              </select>
            </label>

            <label>
              Chapter number
              <input
                type="number"
                min="1"
                value={form.chapterNumber}
                onChange={(e) => set("chapterNumber", Number(e.target.value))}
              />
            </label>
          </div>

          <label>
            Chapter title
            <input value={form.titleBn} onChange={(e) => set("titleBn", e.target.value)} />
          </label>

          <label>
            English title <span className="optional">(optional)</span>
            <input value={form.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
          </label>

          <label>
            Summary
            <textarea rows="3" value={form.summaryBn} onChange={(e) => set("summaryBn", e.target.value)} />
          </label>

          <label>
            Cover image URL <span className="optional">(optional)</span>
            <input value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} />
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button className="primary-btn" disabled={busy}>
              {busy ? "Saving..." : "Save Chapter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
