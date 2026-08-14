import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "../services/adminService.js";
import FileUpload from "./FileUpload.jsx";

function option() {
  return { labelBn: "", imageUrl: "", isCorrect: false };
}

function formFor(order = 1) {
  return {
    orderIndex: order,
    questionBn: "",
    explanationBn: "",
    imageUrl: "",
    activityId: "",
    status: "draft",
    options: [
      { ...option(), isCorrect: true },
      option(),
    ],
  };
}

export default function QuizBuilder({ chapter }) {
  const [questions, setQuestions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(formFor(1));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [q, a] = await Promise.all([
      adminService.listQuizQuestions(chapter.id),
      adminService.listActivities(chapter.id),
    ]);
    setQuestions(q);
    setActivities(a.filter((x) => x.activity_type === "multiple_choice"));
  }

  useEffect(() => {
    load().catch((error) => setError(error.message));
  }, [chapter.id]);

  const nextOrder = useMemo(
    () => (questions.length ? Math.max(...questions.map((q) => q.order_index)) + 1 : 1),
    [questions],
  );

  const singleQuizActivity = useMemo(
    () => (activities.length === 1 ? activities[0] : null),
    [activities],
  );

  function openNew() {
    setForm({
      ...formFor(nextOrder),
      activityId: singleQuizActivity?.id ?? "",
    });
    setEditing(true);
    setError("");
  }

  function openEdit(question) {
    setForm({
      id: question.id,
      orderIndex: question.order_index,
      questionBn: question.question_bn,
      explanationBn: question.explanation_bn ?? "",
      imageUrl: question.image_url ?? "",
      activityId:
        question.activity_id ??
        singleQuizActivity?.id ??
        "",
      status: question.status,
      options:
        question.options.length >= 2
          ? question.options.map((x) => ({ ...x }))
          : formFor(1).options,
    });
    setEditing(true);
    setError("");
  }

  function setCorrect(index) {
    setForm((current) => ({
      ...current,
      options: current.options.map((item, i) => ({
        ...item,
        isCorrect: i === index,
      })),
    }));
  }

  function addOption() {
    if (form.options.length >= 6) return;
    setForm((current) => ({ ...current, options: [...current.options, option()] }));
  }

  function removeOption(index) {
    if (form.options.length <= 2) return;
    setForm((current) => {
      const next = current.options.filter((_, i) => i !== index);
      if (!next.some((x) => x.isCorrect)) next[0] = { ...next[0], isCorrect: true };
      return { ...current, options: next };
    });
  }

  async function save(event) {
    event.preventDefault();

    if (!form.questionBn.trim()) {
      setError("Question is required.");
      return;
    }

    if (form.options.some((x) => !x.labelBn.trim())) {
      setError("Every visible option needs a label.");
      return;
    }

    if (form.options.filter((x) => x.isCorrect).length !== 1) {
      setError("Select exactly one correct answer.");
      return;
    }

    const resolvedActivityId =
      form.activityId ||
      singleQuizActivity?.id ||
      "";

    if (!resolvedActivityId) {
      setError(
        activities.length === 0
          ? "Create a Quiz activity in the Activities tab before adding quiz questions."
          : "Select which Quiz activity this question belongs to.",
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      await adminService.saveQuizQuestion({
        ...form,
        activityId: resolvedActivityId,
        chapterId: chapter.id,
      });
      setEditing(false);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <p className="eyebrow">DYNAMIC QUIZ</p>
          <h2>Quiz Questions</h2>
        </div>
        <button className="primary-btn" onClick={openNew}>＋ New Question</button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="card-list">
        {questions.map((question) => (
          <article className="content-card" key={question.id}>
            <div>
              <span className={`status ${question.status}`}>{question.status}</span>
              <h3>{question.question_bn}</h3>
              <p className="muted">{question.options.length} options · Order {question.order_index}</p>
            </div>
            <button className="ghost-btn" onClick={() => openEdit(question)}>Edit Question</button>
          </article>
        ))}
      </div>

      {editing ? (
        <div className="modal-backdrop">
          <div className="modal-card modal-wide">
            <div className="modal-head">
              <div>
                <p className="eyebrow">VISUAL QUIZ BUILDER</p>
                <h2>{form.id ? "Edit Question" : "New Question"}</h2>
              </div>
              <button className="icon-btn" onClick={() => setEditing(false)}>×</button>
            </div>

            <form className="form-stack" onSubmit={save}>
              <div className="grid-2">
                <label>
                  Order
                  <input type="number" min="1" value={form.orderIndex} onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })} />
                </label>

                <label>
                  Quiz activity
                  {singleQuizActivity ? (
                    <>
                      <input
                        value={
                          singleQuizActivity.title_bn ||
                          `Quiz activity #${singleQuizActivity.order_index}`
                        }
                        readOnly
                      />
                      <small className="muted">
                        Automatically linked
                      </small>
                    </>
                  ) : (
                    <select
                      value={form.activityId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          activityId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        {activities.length
                          ? "Select Quiz activity"
                          : "No Quiz activity yet"}
                      </option>
                      {activities.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.title_bn ||
                            `Quiz activity #${activity.order_index}`}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="span-2">
                  Question
                  <textarea rows="2" value={form.questionBn} onChange={(e) => setForm({ ...form, questionBn: e.target.value })} />
                </label>

                <label className="span-2">
                  Explanation / feedback
                  <textarea rows="2" value={form.explanationBn} onChange={(e) => setForm({ ...form, explanationBn: e.target.value })} />
                </label>

                <div className="span-2">
                  <FileUpload value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} label="Question image" />
                </div>

                <label>
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <div className="builder-zone">
                <div className="section-head small">
                  <div>
                    <p className="eyebrow">OPTIONS</p>
                    <h3>2–6 dynamic options</h3>
                  </div>
                  <button type="button" className="secondary-btn" onClick={addOption} disabled={form.options.length >= 6}>
                    ＋ Add Option
                  </button>
                </div>

                {form.options.map((item, index) => (
                  <div className="sub-card" key={item.id ?? index}>
                    <div className="sub-card-head">
                      <strong>Option {String.fromCharCode(65 + index)}</strong>
                      <button type="button" className="text-danger" onClick={() => removeOption(index)} disabled={form.options.length <= 2}>
                        Remove
                      </button>
                    </div>

                    <div className="grid-2">
                      <label>
                        Label
                        <input
                          value={item.labelBn}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              options: form.options.map((x, i) =>
                                i === index ? { ...x, labelBn: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </label>

                      <label className="radio-line">
                        <input
                          type="radio"
                          name="correct-answer"
                          checked={item.isCorrect}
                          onChange={() => setCorrect(index)}
                        />
                        Correct answer
                      </label>

                      <div className="span-2">
                        <FileUpload
                          value={item.imageUrl ?? ""}
                          onChange={(imageUrl) =>
                            setForm({
                              ...form,
                              options: form.options.map((x, i) =>
                                i === index ? { ...x, imageUrl } : x,
                              ),
                            })
                          }
                          label={`Option ${String.fromCharCode(65 + index)} image`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error ? <div className="error-box">{error}</div> : null}

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="primary-btn" disabled={busy}>{busy ? "Saving..." : "Save Question"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
