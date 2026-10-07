"use client";

import { useEffect, useState } from "react";

// Hair Q&A questions: what people ask the home page feature, how often,
// and how often the answer led to a tap. Data comes from
// /api/admin/hair-questions (aggregated server-side from ml_events).

type Row = {
  question: string;
  intent: string | null;
  curl_type: string | null;
  times_asked: number;
  click_through_rate: number;
};

type Totals = { asked: number; clicked: number; click_through_rate: number; events_scanned: number };

export default function AdminQuestionsPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(pw: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hair-questions", { headers: { "x-admin-password": pw } });
      if (res.status === 401) {
        setError("Incorrect password.");
        return false;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't load questions.");
        return false;
      }
      setRows(json.rows);
      setTotals(json.totals);
      return true;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) return;
    load(stored).then((ok) => {
      if (ok) {
        setPassword(stored);
        setAuthed(true);
      } else {
        sessionStorage.removeItem("admin_password");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const ok = await load(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthed(true);
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 font-sans text-dark">
        <h1 className="font-serif text-2xl font-semibold">Questions</h1>
        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin password"
            className="w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm focus:border-bronze focus:outline-none"
          />
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-dark py-3 text-sm text-white disabled:opacity-50">
            {loading ? "checking..." : "enter"}
          </button>
          {error && <p className="text-sm text-red">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 font-sans text-dark sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">Hair questions</h1>
      <p className="mt-2 text-sm text-dark/60">
        What visitors ask the home page feature, and how often an answer led to a tap.
      </p>

      {totals && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            ["asked", totals.asked],
            ["clicked", totals.clicked],
            ["click-through", `${totals.click_through_rate}%`],
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-dark p-4">
              <p className="font-mono text-[9px] lowercase text-muted">{label}</p>
              <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-dark text-left font-mono text-[10px] lowercase text-muted">
              <th className="py-2 pr-4">question</th>
              <th className="py-2 pr-4">intent</th>
              <th className="py-2 pr-4">curl type</th>
              <th className="py-2 pr-4 text-right">times asked</th>
              <th className="py-2 text-right">click-through</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.question}|${r.intent}|${r.curl_type}`} className="border-b border-[#e8e8e8] align-top">
                <td className="py-2 pr-4">{r.question}</td>
                <td className="py-2 pr-4 font-mono text-[11px] text-dark/70">{r.intent ?? "-"}</td>
                <td className="py-2 pr-4 font-mono text-[11px] text-dark/70">{r.curl_type ?? "-"}</td>
                <td className="py-2 pr-4 text-right font-mono">{r.times_asked}</td>
                <td className="py-2 text-right font-mono">{r.click_through_rate}%</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-dark/50">
                  No questions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
