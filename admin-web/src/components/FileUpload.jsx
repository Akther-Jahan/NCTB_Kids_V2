import React, { useState } from "react";
import { adminService } from "../services/adminService.js";

export default function FileUpload({ value, onChange, label = "Image" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");

    try {
      onChange(await adminService.uploadFile(file));
    } catch (error) {
      setError(
        error instanceof Error
          ? `${error.message} You can still paste a public URL below.`
          : "Upload failed.",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="upload-field">
      <label>
        {label} URL
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
      </label>
      <label className="upload-button">
        {busy ? "Uploading..." : "Choose file"}
        <input type="file" accept="image/*" onChange={upload} disabled={busy} hidden />
      </label>
      {error ? <small className="field-error">{error}</small> : null}
    </div>
  );
}
