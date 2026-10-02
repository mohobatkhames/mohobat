export const DEFAULT_WHATSAPP_NUMBER = '966559820932';

export function whatsappPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `966${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('5')) digits = `966${digits}`;
  if (!/^966\d{8,10}$/.test(digits)) return '';
  return digits;
}

export function whatsappLink(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function whatsappLabel(value) {
  const international = whatsappPhone(value) || DEFAULT_WHATSAPP_NUMBER;
  const local = international.startsWith('966') ? `0${international.slice(3)}` : international;
  return { local, international };
}

export function whatsappRecipients(audience, students = [], users = []) {
  const list = [];
  const seen = new Set();
  const add = (id, name, phone) => {
    const normalized = whatsappPhone(phone);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    list.push({ id, name, phone: normalized });
  };

  if (audience === 'all' || audience === 'students') {
    students.forEach((student) => {
      add(student.nationalId, student.name, student.phone || student.guardianPhone);
    });
  }

  if (audience === 'all' || audience === 'staff') {
    users
      .filter((user) => user.role === 'director' || user.role === 'teacher' || user.role === 'employee')
      .forEach((user) => add(user.nationalId, user.name, user.phone));
  }

  return list;
}

export function openWhatsAppChats(recipients, text) {
  const links = recipients.map((person) => whatsappLink(person.phone, text));
  let opened = 0;
  links.forEach((link) => {
    const tab = window.open(link, '_blank', 'noopener');
    if (tab) opened += 1;
  });
  return { opened, total: links.length };
}
