import React, { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { adminService } from "./services/adminService.js";

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .currentAdmin()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="boot-screen">Opening NCTB Kids Admin CMS…</div>;
  }

  if (!admin) {
    return <LoginPage onLogin={setAdmin} />;
  }

  return <Dashboard admin={admin} onLogout={() => setAdmin(null)} />;
}
