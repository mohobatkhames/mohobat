import * as XLSX from 'xlsx';
import { parseStudentsWorkbook } from '../src/lib/excel.js';

function run(rows) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'students');
  const data = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
  return parseStudentsWorkbook(new Uint8Array(data));
}

const mixed = run([
  { الاسم: 'سارة أحمد', 'السجل المدني': '١٠٩٩٨٨٧٧٦٦', الجنس: 'أنثى', الصف: 'رابع ابتدائي', الدرجة: '95' },
  { الاسم: 'خالد', 'السجل المدني': '1011223344', الجنس: 'ذكر', الصف: 'رابع ابتدائي' },
  { الاسم: 'بدون سجل', الجنس: 'أنثى', الصف: 'الأول الثانوي' },
]);

const noGender = run([
  { اسم_الطالبة: 'ليان سعيد', الهوية: '1055667788', المرحلة: 'الثاني المتوسط' },
]);

if (mixed.students.length !== 1 || mixed.students[0].nationalId !== '1099887766' || mixed.students[0].grade !== 'الرابع الابتدائي') {
  throw new Error(`mixed import failed ${JSON.stringify(mixed)}`);
}
if (mixed.ignoredMales !== 1 || mixed.skipped.length !== 1) {
  throw new Error(`mixed counts failed ${JSON.stringify(mixed)}`);
}
if (noGender.students.length !== 1 || noGender.students[0].name !== 'ليان سعيد') {
  throw new Error(`no-gender import failed ${JSON.stringify(noGender)}`);
}
console.log('excel filters ok');
