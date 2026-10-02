import * as XLSX from 'xlsx';
import { GRADES } from './constants.js';
import { normalizeId, toEnglishDigits } from './ids.js';

function normKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

function matchField(key) {
  const name = normKey(key);
  if (!name) return null;
  if (name.includes('ولي') && (name.includes('جوال') || name.includes('هاتف') || name.includes('phone'))) return 'guardianPhone';
  if (name.includes('ولي')) return 'guardian';
  if (name.includes('سجل') || name.includes('هويه') || name === 'id' || name === 'nationalid') return 'nationalId';
  if ((name.includes('جنس') || name === 'gender' || name === 'sex') && !name.includes('جنسي')) return 'gender';
  if (name.includes('صف') || name === 'grade' || name === 'class') return 'grade';
  if (name.includes('مرحله')) return 'stage';
  if ((name.includes('مدرس') || name === 'school') && !name.includes('نوع') && !name.includes('تصنيف') && !name.includes('احص')) {
    return name.includes('تحديث') ? 'schoolUpdated' : 'school';
  }
  if (name.includes('بريد') || name.includes('email')) return 'email';
  if (name.includes('جوال') || name.includes('هاتف') || name.includes('phone') || name.includes('mobile')) return 'phone';
  if (name.includes('درج') || name.includes('معدل') || name.includes('score')) return 'score';
  if (name.includes('اسم') || name === 'name') return 'name';
  return null;
}

function canonicalGrade(value) {
  const text = normKey(value);
  if (!text) return '';
  const patterns = [
    [/رابع.*ابتد/, 'الرابع الابتدائي'],
    [/خامس.*ابتد/, 'الخامس الابتدائي'],
    [/سادس.*ابتد/, 'السادس الابتدائي'],
    [/اول.*متوسط/, 'الأول المتوسط'],
    [/ثاني.*متوسط/, 'الثاني المتوسط'],
    [/ثالث.*متوسط/, 'الثالث المتوسط'],
    [/اول.*ثان/, 'الأول الثانوي'],
    [/ثاني.*ثان/, 'الثاني الثانوي'],
    [/ثالث.*ثان/, 'الثالث الثانوي'],
  ];
  const found = patterns.find(([pattern]) => pattern.test(text));
  if (found) return found[1];
  const direct = GRADES.find((grade) => normKey(grade) === text);
  return direct || String(value || '').trim();
}

function isMale(value) {
  const text = normKey(value);
  return ['ذكر', 'طالب', 'ذكور', 'طلاب', 'بنين', 'بنون', 'ولد', 'اولاد', 'male', 'm', 'boy'].includes(text);
}

function isFemale(value) {
  const text = normKey(value);
  return ['انثي', 'انثى', 'اناث', 'طالبه', 'طالبات', 'بنات', 'بنت', 'female', 'f', 'girl'].includes(text);
}

function mapRow(row) {
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const field = matchField(key);
    if (field && mapped[field] == null) mapped[field] = value;
  }
  return mapped;
}

export function parseStudentsWorkbook(data) {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }).map(mapRow).filter((row) => Object.keys(row).length);
  const hasGender = rows.some((row) => String(row.gender || '').trim());
  const males = hasGender ? rows.filter((row) => isMale(row.gender)) : [];
  const selected = hasGender ? rows.filter((row) => isFemale(row.gender)) : rows;

  const students = [];
  const skipped = [];
  for (const row of selected) {
    const nationalId = normalizeId(row.nationalId);
    const name = String(row.name || '').trim();
    if (!name || nationalId.length !== 10) {
      skipped.push(name || nationalId || 'سجل ناقص');
      continue;
    }
    const scoreText = toEnglishDigits(row.score).replace(/[^\d.]/g, '');
    const score = scoreText === '' ? '' : Number(scoreText);
    const school = String(row.schoolUpdated || row.school || '').trim();
    students.push({
      nationalId,
      name,
      grade: canonicalGrade(row.grade || row.stage),
      school,
      phone: toEnglishDigits(row.phone).replace(/[^\d+]/g, ''),
      email: String(row.email || '').trim(),
      guardian: String(row.guardian || '').trim(),
      guardianPhone: toEnglishDigits(row.guardianPhone).replace(/[^\d+]/g, ''),
      score: Number.isFinite(score) ? score : '',
    });
  }

  return {
    students,
    ignoredMales: males.length,
    skipped,
    assumedFemaleFile: !hasGender,
    emptyGender: hasGender && selected.length === 0,
  };
}

export function downloadStudentsTemplate() {
  const sheet = XLSX.utils.json_to_sheet([
    {
      الاسم: 'نورة محمد القحطاني',
      'السجل المدني': '1044556677',
      الجنس: 'أنثى',
      الصف: 'الثاني المتوسط',
      المدرسة: '',
      الجوال: '0550000000',
      'البريد الإلكتروني': 'noura@example.com',
      'ولي الأمر': 'محمد القحطاني',
      'جوال ولي الأمر': '0500000000',
      الدرجة: 98,
    },
    {
      الاسم: 'مثال يتم تجاهله',
      'السجل المدني': '1011223344',
      الجنس: 'ذكر',
      الصف: 'الثاني المتوسط',
      المدرسة: '',
      الجوال: '',
      'البريد الإلكتروني': '',
      'ولي الأمر': '',
      'جوال ولي الأمر': '',
      الدرجة: '',
    },
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'الطالبات');
  XLSX.writeFile(book, 'نموذج-طالبات-موهوبات.xlsx');
}
