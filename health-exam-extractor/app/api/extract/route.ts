import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import type { ExamData } from '@/lib/types';

// Allow up to 60s for Claude to process the image
export const maxDuration = 60;

const client = new Anthropic();

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];
const SUPPORTED_TYPES = [...IMAGE_TYPES, 'application/pdf'] as const;

const EXTRACTION_PROMPT = `Extract all health data from this medical exam document.

Return a JSON object with EXACTLY this structure — no extra fields, no markdown:
{
  "exam_type": "type of exam (e.g. Complete Blood Count, Lipid Panel, Urinalysis, X-Ray report…)",
  "exam_date": "date as shown on the document, or empty string",
  "laboratory_or_clinic": "name of lab or clinic, or empty string",
  "patient": {
    "name": "patient full name, or empty string",
    "age": "patient age, or empty string",
    "gender": "patient gender, or empty string",
    "id": "patient ID / document number, or empty string"
  },
  "results": [
    {
      "parameter": "test or measurement name",
      "value": "measured value as a string",
      "unit": "unit of measurement, or empty string",
      "reference_range": "normal reference range shown, or empty string",
      "status": "normal | high | low | abnormal | unknown"
    }
  ],
  "physician": "ordering or signing physician name, or empty string",
  "notes": "any additional clinical notes or observations, or empty string"
}

Rules:
- Include every measurable parameter you can read from the document.
- Determine status by comparing the value to the reference range shown; use "unknown" when no range is available.
- If a field is not present in the document, use an empty string — never omit a field.
- Return ONLY the JSON object, nothing else.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!SUPPORTED_TYPES.includes(imageFile.type as (typeof SUPPORTED_TYPES)[number])) {
      return NextResponse.json(
        { error: `Unsupported file type: ${imageFile.type}. Use JPEG, PNG, GIF, WEBP, or PDF.` },
        { status: 400 },
      );
    }

    const bytes = await imageFile.arrayBuffer();
    const isPdf = imageFile.type === 'application/pdf';

    let responseText: string | undefined;

    if (isPdf) {
      // Upload via Files API to avoid sending large base64 payloads inline.
      // The file is deleted after the request regardless of outcome.
      const uploaded = await client.beta.files.upload({
        file: new File([bytes], imageFile.name || 'exam.pdf', { type: 'application/pdf' }),
      });

      try {
        const response = await client.beta.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 4096,
          system:
            'You are a medical data extraction assistant. You read medical exam documents and extract structured data. Always return only valid JSON, no prose or markdown.',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: { type: 'file', file_id: uploaded.id },
                },
                { type: 'text', text: EXTRACTION_PROMPT },
              ],
            },
          ],
          betas: ['files-api-2025-04-14'],
        });
        responseText = response.content.find((b) => b.type === 'text')?.text;
      } finally {
        await client.beta.files.delete(uploaded.id).catch(() => {});
      }
    } else {
      const base64 = Buffer.from(bytes).toString('base64');
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system:
          'You are a medical data extraction assistant. You read medical exam documents and extract structured data. Always return only valid JSON, no prose or markdown.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: imageFile.type as ImageMediaType, data: base64 },
              },
              { type: 'text', text: EXTRACTION_PROMPT },
            ],
          },
        ],
      });
      responseText = response.content.find((b) => b.type === 'text')?.text;
    }

    if (!responseText) {
      return NextResponse.json({ error: 'No text response from Claude' }, { status: 500 });
    }

    // Strip any accidental markdown fences
    const raw = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let data: ExamData;
    try {
      data = JSON.parse(raw) as ExamData;
    } catch {
      console.error('Failed to parse Claude response:', raw);
      return NextResponse.json({ error: 'Claude returned invalid JSON' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Extract route error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
