import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "../services/adminService.js";
import FileUpload from "./FileUpload.jsx";

const TYPES = [
  ["story_snippet", "Story"],
  ["letter", "Letter"],
  ["snippet", "Reading"],
  ["word_build", "Word Builder"],
  ["picture_choice", "Picture Choice"],
  ["flashcard", "Flashcards"],
  ["matching", "Matching"],
  ["tap", "Tap & Learn"],
  ["drag_game", "Drag / Sort"],
  ["audio_lesson", "Audio Lesson"],
  ["image_lesson", "Image Lesson"],
  ["video_lesson", "Video Lesson"],
  ["multiple_choice", "Quiz"],
  ["puzzle", "Puzzle"],
];

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function template(type) {
  const base = { schema_version: 1, reward_xp: 10 };

  switch (type) {
    case "story_snippet":
      return { ...base, kind: "guided_story", slides: [{ id: uid("slide"), emoji: "📖", text_bn: "", speech_bn: "" }] };
    case "letter":
      return { ...base, letter: "", sound: "", examples: [{ emoji: "", word_bn: "" }] };
    case "snippet":
      return { ...base, imageEmoji: "📖", lines: [""] };
    case "word_build":
      return { ...base, letters: ["", ""], answer: "" };
    case "picture_choice":
      return {
        ...base,
        question: "",
        options: [
          { emoji: "", label_bn: "", image_url: "" },
          { emoji: "", label_bn: "", image_url: "" },
        ],
        answer: 0,
      };
    case "flashcard":
      return {
        ...base,
        audio_source: "device_tts",
        locale: "bn-BD",
        cards: [{ id: uid("card"), word_bn: "", emoji: "", speech_bn: "", image_url: "" }],
      };
    case "matching":
      return { ...base, shuffle: true, pairs: [{ id: uid("pair"), word_bn: "", emoji: "", image_url: "" }] };
    case "tap":
      return { ...base, prompt: "", items: [{ id: uid("item"), emoji: "", label_bn: "", description_bn: "" }] };
    case "drag_game":
      return { ...base, prompt: "", items: [{ emoji: "", label_bn: "", target: "" }] };
    case "audio_lesson":
      return {
        ...base,
        mode: "listen_repeat",
        audio_source: "device_tts",
        locale: "bn-BD",
        items: [{ id: uid("audio"), text_bn: "", emoji: "" }],
      };
    case "image_lesson":
      return { ...base, image_url: "", allow_zoom: true, source_label: "NCTB" };
    case "video_lesson":
      return { ...base, video_url: "", autoplay: false };
    case "multiple_choice":
      return { ...base, question_source: "quiz_questions", shuffle_questions: false, pass_score_percent: 60 };
    case "puzzle":
      return {
        ...base,
        mode: "missing_letter",
        prompt: "",
        voice_text: "",
        hint: "",
        pattern: "",
        options: ["", ""],
        correct_answer: "",
      };
    default:
      return base;
  }
}

function makeForm(order = 1) {
  return {
    id: undefined,
    orderIndex: order,
    activityType: "story_snippet",
    titleBn: "",
    instructionBn: "",
    status: "draft",
    payload: template("story_snippet"),
  };
}

function ListEditor({ items, setItems, renderItem, createItem, addLabel = "Add item", min = 1, max = 12 }) {
  return (
    <div className="list-editor">
      {items.map((item, index) => (
        <div key={item.id ?? index} className="sub-card">
          <div className="sub-card-head">
            <strong>#{index + 1}</strong>
            <button
              type="button"
              className="text-danger"
              disabled={items.length <= min}
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          {renderItem(item, index, (next) =>
            setItems(items.map((current, i) => (i === index ? next : current))),
          )}
        </div>
      ))}
      <button
        type="button"
        className="secondary-btn"
        disabled={items.length >= max}
        onClick={() => setItems([...items, createItem()])}
      >
        ＋ {addLabel}
      </button>
    </div>
  );
}

function PayloadFields({ type, payload, onChange, onOpenQuiz }) {
  const set = (key, value) => onChange({ ...payload, [key]: value });

  if (type === "story_snippet") {
    return (
      <>
        <h4>Story slides</h4>
        <ListEditor
          items={payload.slides ?? []}
          setItems={(slides) => set("slides", slides)}
          createItem={() => ({ id: uid("slide"), emoji: "📖", text_bn: "", speech_bn: "" })}
          addLabel="Add slide"
          renderItem={(slide, _, update) => (
            <div className="grid-2">
              <label>Emoji<input value={slide.emoji ?? ""} onChange={(e) => update({ ...slide, emoji: e.target.value })} /></label>
              <label>Voice text<input value={slide.speech_bn ?? ""} onChange={(e) => update({ ...slide, speech_bn: e.target.value })} /></label>
              <label className="span-2">Story text<textarea rows="2" value={slide.text_bn ?? ""} onChange={(e) => update({ ...slide, text_bn: e.target.value })} /></label>
              <div className="span-2">
                <FileUpload value={slide.image_url ?? ""} onChange={(image_url) => update({ ...slide, image_url })} label="Slide image" />
              </div>
            </div>
          )}
        />
      </>
    );
  }

  if (type === "letter") {
    return (
      <div className="grid-2">
        <label>Letter<input value={payload.letter ?? ""} onChange={(e) => set("letter", e.target.value)} /></label>
        <label>Sound / voice<input value={payload.sound ?? ""} onChange={(e) => set("sound", e.target.value)} /></label>
        <label className="span-2">
          Example words (comma separated)
          <input
            value={(payload.examples ?? []).map((x) => x.word_bn).join(", ")}
            onChange={(e) =>
              set(
                "examples",
                e.target.value.split(",").map((x) => ({ word_bn: x.trim() })).filter((x) => x.word_bn),
              )
            }
          />
        </label>
      </div>
    );
  }

  if (type === "snippet") {
    return (
      <>
        <label>Emoji<input value={payload.imageEmoji ?? ""} onChange={(e) => set("imageEmoji", e.target.value)} /></label>
        <label>
          Reading lines (one line per row)
          <textarea
            rows="6"
            value={(payload.lines ?? []).join("\n")}
            onChange={(e) => set("lines", e.target.value.split("\n"))}
          />
        </label>
      </>
    );
  }

  if (type === "word_build") {
    return (
      <div className="grid-2">
        <label>Correct word<input value={payload.answer ?? ""} onChange={(e) => set("answer", e.target.value)} /></label>
        <label>
          Letter tiles (comma separated)
          <input
            value={(payload.letters ?? []).join(", ")}
            onChange={(e) => set("letters", e.target.value.split(",").map((x) => x.trim()))}
          />
        </label>
      </div>
    );
  }

  if (type === "picture_choice") {
    return (
      <>
        <label>Question<input value={payload.question ?? ""} onChange={(e) => set("question", e.target.value)} /></label>
        <ListEditor
          items={payload.options ?? []}
          setItems={(options) => set("options", options)}
          createItem={() => ({ emoji: "", label_bn: "", image_url: "" })}
          min={2}
          max={6}
          addLabel="Add option"
          renderItem={(option, index, update) => (
            <div className="grid-2">
              <label>Label<input value={option.label_bn ?? ""} onChange={(e) => update({ ...option, label_bn: e.target.value })} /></label>
              <label>Emoji<input value={option.emoji ?? ""} onChange={(e) => update({ ...option, emoji: e.target.value })} /></label>
              <div className="span-2"><FileUpload value={option.image_url ?? ""} onChange={(image_url) => update({ ...option, image_url })} label="Option image" /></div>
              <label className="radio-line span-2">
                <input type="radio" checked={payload.answer === index} onChange={() => set("answer", index)} />
                Correct answer
              </label>
            </div>
          )}
        />
      </>
    );
  }

  if (type === "flashcard") {
    return (
      <ListEditor
        items={payload.cards ?? []}
        setItems={(cards) => set("cards", cards)}
        createItem={() => ({ id: uid("card"), word_bn: "", emoji: "", speech_bn: "", image_url: "" })}
        addLabel="Add card"
        renderItem={(card, _, update) => (
          <div className="grid-2">
            <label>Word<input value={card.word_bn ?? ""} onChange={(e) => update({ ...card, word_bn: e.target.value })} /></label>
            <label>Emoji<input value={card.emoji ?? ""} onChange={(e) => update({ ...card, emoji: e.target.value })} /></label>
            <label className="span-2">Voice text<input value={card.speech_bn ?? ""} onChange={(e) => update({ ...card, speech_bn: e.target.value })} /></label>
            <div className="span-2"><FileUpload value={card.image_url ?? ""} onChange={(image_url) => update({ ...card, image_url })} label="Card image" /></div>
          </div>
        )}
      />
    );
  }

  if (type === "matching") {
    return (
      <ListEditor
        items={payload.pairs ?? []}
        setItems={(pairs) => set("pairs", pairs)}
        createItem={() => ({ id: uid("pair"), word_bn: "", emoji: "", image_url: "" })}
        min={2}
        addLabel="Add pair"
        renderItem={(pair, _, update) => (
          <div className="grid-2">
            <label>Word<input value={pair.word_bn ?? ""} onChange={(e) => update({ ...pair, word_bn: e.target.value })} /></label>
            <label>Emoji<input value={pair.emoji ?? ""} onChange={(e) => update({ ...pair, emoji: e.target.value })} /></label>
            <div className="span-2"><FileUpload value={pair.image_url ?? ""} onChange={(image_url) => update({ ...pair, image_url })} label="Matching image" /></div>
          </div>
        )}
      />
    );
  }

  if (type === "tap") {
    return (
      <>
        <label>Prompt<input value={payload.prompt ?? ""} onChange={(e) => set("prompt", e.target.value)} /></label>
        <ListEditor
          items={payload.items ?? []}
          setItems={(items) => set("items", items)}
          createItem={() => ({ id: uid("item"), emoji: "", label_bn: "", description_bn: "" })}
          addLabel="Add tappable item"
          renderItem={(item, _, update) => (
            <div className="grid-2">
              <label>Label<input value={item.label_bn ?? ""} onChange={(e) => update({ ...item, label_bn: e.target.value })} /></label>
              <label>Emoji<input value={item.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
              <label className="span-2">Description<input value={item.description_bn ?? ""} onChange={(e) => update({ ...item, description_bn: e.target.value })} /></label>
            </div>
          )}
        />
      </>
    );
  }

  if (type === "drag_game") {
    return (
      <>
        <label>Prompt<input value={payload.prompt ?? ""} onChange={(e) => set("prompt", e.target.value)} /></label>
        <ListEditor
          items={payload.items ?? []}
          setItems={(items) => set("items", items)}
          createItem={() => ({ emoji: "", label_bn: "", target: "" })}
          min={2}
          addLabel="Add sortable item"
          renderItem={(item, _, update) => (
            <div className="grid-3">
              <label>Label<input value={item.label_bn ?? ""} onChange={(e) => update({ ...item, label_bn: e.target.value })} /></label>
              <label>Emoji<input value={item.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
              <label>Target/category<input value={item.target ?? ""} onChange={(e) => update({ ...item, target: e.target.value })} /></label>
            </div>
          )}
        />
      </>
    );
  }

  if (type === "audio_lesson") {
    return (
      <ListEditor
        items={payload.items ?? []}
        setItems={(items) => set("items", items)}
        createItem={() => ({ id: uid("audio"), text_bn: "", emoji: "" })}
        addLabel="Add sentence"
        renderItem={(item, _, update) => (
          <div className="grid-2">
            <label className="span-2">Sentence<input value={item.text_bn ?? ""} onChange={(e) => update({ ...item, text_bn: e.target.value })} /></label>
            <label>Emoji<input value={item.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
          </div>
        )}
      />
    );
  }

  if (type === "image_lesson") {
    return <FileUpload value={payload.image_url ?? ""} onChange={(image_url) => set("image_url", image_url)} label="Lesson image" />;
  }

  if (type === "video_lesson") {
    return (
      <div className="grid-2">
        <label className="span-2">Video URL<input value={payload.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} /></label>
        <label className="radio-line">
          <input type="checkbox" checked={Boolean(payload.autoplay)} onChange={(e) => set("autoplay", e.target.checked)} />
          Autoplay
        </label>
      </div>
    );
  }

  if (type === "multiple_choice") {
    return (
      <div className="info-box">
        Quiz options are managed in the visual Quiz Builder. No JSON is needed.
        <button type="button" className="secondary-btn inline-btn" onClick={onOpenQuiz}>
          Open Quiz Builder
        </button>
      </div>
    );
  }

  if (type === "puzzle") {
    return (
      <>
        <div className="grid-2">
          <label>
            Puzzle mode
            <select value={payload.mode ?? "missing_letter"} onChange={(e) => onChange(template("puzzle") && { ...template("puzzle"), mode: e.target.value })}>
              <option value="missing_letter">Missing Letter</option>
              <option value="word_order">Word Order</option>
              <option value="category_sort">Category Sort</option>
            </select>
          </label>
          <label>Prompt<input value={payload.prompt ?? ""} onChange={(e) => set("prompt", e.target.value)} /></label>
          <label>Voice text<input value={payload.voice_text ?? ""} onChange={(e) => set("voice_text", e.target.value)} /></label>
          <label>Hint<input value={payload.hint ?? ""} onChange={(e) => set("hint", e.target.value)} /></label>
        </div>

        {payload.mode === "missing_letter" ? (
          <div className="grid-2">
            <label>Pattern<input value={payload.pattern ?? ""} placeholder="আ_" onChange={(e) => set("pattern", e.target.value)} /></label>
            <label>Correct answer<input value={payload.correct_answer ?? ""} onChange={(e) => set("correct_answer", e.target.value)} /></label>
            <label className="span-2">
              Options (comma separated)
              <input value={(payload.options ?? []).join(", ")} onChange={(e) => set("options", e.target.value.split(",").map((x) => x.trim()))} />
            </label>
          </div>
        ) : null}

        {payload.mode === "word_order" ? (
          <div className="grid-2">
            <label>
              Words (comma separated)
              <input value={(payload.words ?? []).join(", ")} onChange={(e) => set("words", e.target.value.split(",").map((x) => x.trim()))} />
            </label>
            <label>
              Correct order (comma separated)
              <input value={(payload.correct_order ?? []).join(", ")} onChange={(e) => set("correct_order", e.target.value.split(",").map((x) => x.trim()))} />
            </label>
          </div>
        ) : null}

        {payload.mode === "category_sort" ? (
          <div className="info-box">
            Category Sort visual row editor is planned for the next CMS iteration. Save this activity as Draft for now.
          </div>
        ) : null}
      </>
    );
  }

  return null;
}

export default function ActivityBuilder({ chapter, onOpenQuiz }) {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(makeForm(1));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setActivities(await adminService.listActivities(chapter.id));
  }

  useEffect(() => {
    load().catch((error) => setError(error.message));
  }, [chapter.id]);

  const nextOrder = useMemo(
    () => (activities.length ? Math.max(...activities.map((a) => a.order_index)) + 1 : 1),
    [activities],
  );

  function openNew() {
    setForm(makeForm(nextOrder));
    setEditing(true);
    setError("");
  }

  function openEdit(activity) {
    setForm({
      id: activity.id,
      orderIndex: activity.order_index,
      activityType: activity.activity_type,
      titleBn: activity.title_bn ?? "",
      instructionBn: activity.instruction_bn ?? "",
      status: activity.status,
      payload: activity.payload ?? template(activity.activity_type),
    });
    setEditing(true);
    setError("");
  }

  function changeType(type) {
    setForm((current) => ({
      ...current,
      activityType: type,
      payload: template(type),
    }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await adminService.saveActivity({
        ...form,
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

  async function toggle(activity) {
    try {
      await adminService.setActivityStatus(
        activity.id,
        activity.status === "published" ? "draft" : "published",
      );
      await load();
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <p className="eyebrow">NO-CODE CONTENT</p>
          <h2>Activities</h2>
        </div>
        <button className="primary-btn" onClick={openNew}>＋ New Activity</button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="card-list">
        {activities.map((activity) => (
          <article className="content-card" key={activity.id}>
            <div>
              <span className={`status ${activity.status}`}>{activity.status}</span>
              <h3>{activity.title_bn || TYPES.find(([id]) => id === activity.activity_type)?.[1] || activity.activity_type}</h3>
              <p className="muted">
                Order {activity.order_index} · {TYPES.find(([id]) => id === activity.activity_type)?.[1]}
              </p>
            </div>
            <div className="row-actions">
              <button className="ghost-btn" onClick={() => openEdit(activity)}>Edit</button>
              {activity.activity_type === "multiple_choice" ? (
                <button className="ghost-btn" onClick={onOpenQuiz}>Quiz Questions</button>
              ) : null}
              <button className="ghost-btn" onClick={() => toggle(activity)}>
                {activity.status === "published" ? "Unpublish" : "Publish"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing ? (
        <div className="modal-backdrop">
          <div className="modal-card modal-wide">
            <div className="modal-head">
              <div>
                <p className="eyebrow">TEACHER CONTENT BUILDER</p>
                <h2>{form.id ? "Edit Activity" : "New Activity"}</h2>
              </div>
              <button className="icon-btn" onClick={() => setEditing(false)}>×</button>
            </div>

            <form className="form-stack" onSubmit={save}>
              <div className="grid-2">
                <label>
                  Activity type
                  <select value={form.activityType} onChange={(e) => changeType(e.target.value)}>
                    {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <label>
                  Order
                  <input type="number" min="1" value={form.orderIndex} onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })} />
                </label>
                <label>
                  Title
                  <input value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} />
                </label>
                <label>
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="span-2">
                  Instruction
                  <textarea rows="2" value={form.instructionBn} onChange={(e) => setForm({ ...form, instructionBn: e.target.value })} />
                </label>
              </div>

              <div className="builder-zone">
                <PayloadFields
                  type={form.activityType}
                  payload={form.payload}
                  onChange={(payload) => setForm({ ...form, payload })}
                  onOpenQuiz={onOpenQuiz}
                />
              </div>

              {error ? <div className="error-box">{error}</div> : null}

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="primary-btn" disabled={busy}>{busy ? "Saving..." : "Save Activity"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
