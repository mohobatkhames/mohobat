export function isInvited(course, nationalId) {
  if (!course?.invitees) return true;
  return course.invitees[nationalId] !== false;
}

export function isAttending(course, nationalId) {
  if (!isInvited(course, nationalId)) return false;
  if (!course?.presence) return true;
  return course.presence[nationalId] !== false;
}

export function invitedStudents(course, students) {
  return students.filter((student) => student.grade === course.grade && isInvited(course, student.nationalId));
}
