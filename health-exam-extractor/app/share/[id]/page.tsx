import { getShareWithExpiry } from '@/lib/db';
import type { ExamData, ExamResult } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  normal: '#16a34a',
  high: '#dc2626',
  low: '#2563eb',
  abnormal: '#d97706',
  unknown: '#6b7280',
};

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

const td: React.CSSProperties = { padding: '0.6rem 0.75rem' };

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getShareWithExpiry(id);

  if (!result) {
    return (
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔗</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#374151' }}>Link expired or not found</h1>
        <p style={{ color: '#6b7280', marginTop: 8 }}>This shared exam link has expired or does not exist.</p>
      </main>
    );
  }

  const { data, expiresAt } = result;
  const expiresDate = new Date(expiresAt * 1000).toLocaleString();

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Expiry banner */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: 14,
        color: '#1d4ed8',
      }}>
        🔗 Shared exam — this link expires on <strong>{expiresDate}</strong>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Health Exam Results</h1>
        <p style={{ color: '#555', marginTop: 4 }}>Read-only view of extracted exam data.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <InfoCard label="Exam type" value={data.exam_type} />
        <InfoCard label="Date" value={data.exam_date || '—'} />
        <InfoCard label="Lab / Clinic" value={data.laboratory_or_clinic || '—'} />
        <InfoCard label="Physician" value={data.physician || '—'} />
      </div>

      {/* Patient */}
      <Section title="Patient">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          <InfoCard label="Name" value={data.patient.name || '—'} />
          <InfoCard label="Age" value={data.patient.age || '—'} />
          <InfoCard label="Gender" value={data.patient.gender || '—'} />
          <InfoCard label="ID" value={data.patient.id || '—'} />
        </div>
      </Section>

      {/* Results table */}
      {data.results.length > 0 && (
        <Section title={`Results (${data.results.length})`}>
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
                {data.results.map((r: ExamResult, i: number) => (
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
      {data.notes && (
        <Section title="Notes">
          <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{data.notes}</p>
        </Section>
      )}

      {/* Raw JSON */}
      <Section title="Raw JSON">
        <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '1rem', borderRadius: 8, overflowX: 'auto', fontSize: 12, lineHeight: 1.6 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </Section>
    </main>
  );
}
