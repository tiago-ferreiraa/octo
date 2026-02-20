'use client';

import { useRef, useState } from 'react';
import type { ExamData, ExamResult } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  normal: '#16a34a',
  high: '#dc2626',
  low: '#2563eb',
  abnormal: '#d97706',
  unknown: '#6b7280',
};

const EXPIRY_OPTIONS = [
  { label: '1 min', seconds: 60 },
  { label: '1 hour', seconds: 3_600 },
  { label: '24 hours', seconds: 86_400 },
  { label: '7 days', seconds: 604_800 },
  { label: '30 days', seconds: 2_592_000 },
];

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Share panel state
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState(EXPIRY_OPTIONS[1]);
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setIsPdf(selected.type === 'application/pdf');
    setResult(null);
    setError(null);
    setShareOpen(false);
    setShareResult(null);
  }

  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setShareResult(null);
    try {
      const body = new FormData();
      body.append('image', file);
      const res = await fetch('/api/extract', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Extraction failed');
      setResult(json as ExamData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGenerateLink() {
    if (!result) return;
    setSharing(true);
    setShareResult(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: result, expiresIn: selectedExpiry.seconds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate link');
      setShareResult({ url: json.url as string, expiresAt: json.expiresAt as string });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSharing(false);
    }
  }

  async function handleCopy() {
    if (!shareResult) return;
    await navigator.clipboard.writeText(shareResult.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Health Exam Extractor</h1>
        <p style={{ color: '#555', marginTop: 4 }}>
          Upload a photo of a medical exam to extract structured data as JSON.
        </p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #cbd5e1',
          borderRadius: 12,
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'white',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={(e) => ((e.currentTarget.style.borderColor = '#2563eb'))}
        onMouseLeave={(e) => ((e.currentTarget.style.borderColor = '#cbd5e1'))}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {preview && isPdf ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 48 }}>📄</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>{file?.name}</p>
            <p style={{ fontSize: 13, color: '#888' }}>PDF selected — ready to extract</p>
          </div>
        ) : preview ? (
          <img
            src={preview}
            alt="Exam preview"
            style={{ maxHeight: 320, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
          />
        ) : (
          <div>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
            <p style={{ fontWeight: 500 }}>Click to select an image or PDF</p>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>JPEG, PNG, WEBP, PDF supported</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: '1rem', display: 'flex', gap: 12 }}>
        {preview && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={secondaryBtn}
            >
              Change image
            </button>
            <button
              onClick={handleExtract}
              disabled={loading}
              style={{ ...primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Extracting…' : 'Extract data'}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: 12, textAlign: 'center', color: '#555' }}>
          Analysing exam with Claude… this may take a few seconds.
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ marginTop: '2rem' }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
            <InfoCard label="Exam type" value={result.exam_type} />
            <InfoCard label="Date" value={result.exam_date || '—'} />
            <InfoCard label="Lab / Clinic" value={result.laboratory_or_clinic || '—'} />
            <InfoCard label="Physician" value={result.physician || '—'} />
          </div>

          {/* Patient */}
          <Section title="Patient">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              <InfoCard label="Name" value={result.patient.name || '—'} />
              <InfoCard label="Age" value={result.patient.age || '—'} />
              <InfoCard label="Gender" value={result.patient.gender || '—'} />
              <InfoCard label="ID" value={result.patient.id || '—'} />
            </div>
          </Section>

          {/* Results table */}
          {result.results.length > 0 && (
            <Section title={`Results (${result.results.length})`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Parameter', 'Value', 'Unit', 'Reference range', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r: ExamResult, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={td}>{r.parameter}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{r.value}</td>
                        <td style={{ ...td, color: '#666' }}>{r.unit || '—'}</td>
                        <td style={{ ...td, color: '#666' }}>{r.reference_range || '—'}</td>
                        <td style={td}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            background: STATUS_COLORS[r.status] + '1a',
                            color: STATUS_COLORS[r.status],
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Notes */}
          {result.notes && (
            <Section title="Notes">
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{result.notes}</p>
            </Section>
          )}

          {/* JSON + download + share */}
          <Section title="Raw JSON">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 8 }}>
              <button onClick={handleDownload} style={{ ...primaryBtn, background: '#16a34a' }}>
                Download JSON
              </button>
              <button
                onClick={() => { setShareOpen(!shareOpen); setShareResult(null); }}
                style={{ ...primaryBtn, background: '#7c3aed' }}
              >
                {shareOpen ? 'Close' : 'Share'}
              </button>
            </div>

            {/* Share panel */}
            {shareOpen && (
              <div style={{
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: 8,
                padding: '1rem',
                marginBottom: 12,
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#4c1d95', marginBottom: 10 }}>
                  Generate a shareable link
                </p>

                {/* Expiry picker */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { setSelectedExpiry(opt); setShareResult(null); }}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 6,
                        border: selectedExpiry.label === opt.label ? '2px solid #7c3aed' : '1px solid #c4b5fd',
                        background: selectedExpiry.label === opt.label ? '#7c3aed' : 'white',
                        color: selectedExpiry.label === opt.label ? 'white' : '#6d28d9',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateLink}
                  disabled={sharing}
                  style={{ ...primaryBtn, background: '#7c3aed', opacity: sharing ? 0.7 : 1, cursor: sharing ? 'not-allowed' : 'pointer' }}
                >
                  {sharing ? 'Generating…' : 'Generate link'}
                </button>

                {/* Generated link */}
                {shareResult && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'white',
                      border: '1px solid #c4b5fd',
                      borderRadius: 6,
                      padding: '0.5rem 0.75rem',
                    }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>
                        {shareResult.url}
                      </span>
                      <button
                        onClick={handleCopy}
                        style={{ ...primaryBtn, background: copied ? '#16a34a' : '#7c3aed', padding: '0.35rem 0.75rem', fontSize: 12, flexShrink: 0 }}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                      Expires: {new Date(shareResult.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '1rem', borderRadius: 8, overflowX: 'auto', fontSize: 12, lineHeight: 1.6 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </Section>
        </div>
      )}
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 500, fontSize: 14 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#374151' }}>{title}</h2>
      {children}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  background: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const td: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
};
