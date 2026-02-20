export type ExamResult = {
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  status: 'normal' | 'high' | 'low' | 'abnormal' | 'unknown';
};

export type ExamData = {
  exam_type: string;
  exam_date: string;
  laboratory_or_clinic: string;
  patient: { name: string; age: string; gender: string; id: string };
  results: ExamResult[];
  physician: string;
  notes: string;
};
