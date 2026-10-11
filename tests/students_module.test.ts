import { createSessionToken, AuthenticatedUser } from '../server/authSession';

const BASE_URL = 'http://localhost:3000';

// Helpers to generate tokens for different tenant schools and roles
function getAdminToken(schoolId: string, email = `admin@${schoolId}.com`): string {
  const user: AuthenticatedUser = {
    email,
    role: 'admin',
    schoolId,
    name: 'Admin ' + schoolId
  };
  return createSessionToken(user);
}

function getTeacherToken(schoolId: string, assignedClasses: string[], email = `teacher@${schoolId}.com`): string {
  const user: AuthenticatedUser = {
    email,
    role: 'teacher',
    schoolId,
    name: 'Teacher ' + schoolId,
    teacherId: 'TCH-' + schoolId,
    assignedClasses
  };
  return createSessionToken(user);
}

function getReceptionistToken(schoolId: string, email = `receptionist@${schoolId}.com`): string {
  const user: AuthenticatedUser = {
    email,
    role: 'receptionist',
    schoolId,
    name: 'Receptionist ' + schoolId
  };
  return createSessionToken(user);
}

function getStaffToken(schoolId: string, email = `staff@${schoolId}.com`): string {
  const user: AuthenticatedUser = {
    email,
    role: 'staff',
    schoolId,
    name: 'Staff ' + schoolId
  };
  return createSessionToken(user);
}

function getUnknownRoleToken(schoolId: string): string {
  const user: any = {
    email: `unknown@${schoolId}.com`,
    role: 'guest_attacker',
    schoolId,
    name: 'Unknown User'
  };
  return createSessionToken(user);
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING STUDENTS MODULE 10/10+ INTEGRATION AUDIT & TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
      failed++;
    }
  }

  const schoolA = 'test-school-alpha';
  const schoolB = 'test-school-beta';

  const tokenAdminA = getAdminToken(schoolA);
  const tokenAdminB = getAdminToken(schoolB);
  const tokenTeacherA = getTeacherToken(schoolA, ['Grade 1-A']);
  const tokenReceptionistA = getReceptionistToken(schoolA);
  const tokenStaffA = getStaffToken(schoolA);
  const tokenUnknown = getUnknownRoleToken(schoolA);

  // Seed classes in test schools to satisfy class existence checks
  const seedClasses = ['Grade 1-A', 'Grade 1-B', 'Grade 2-B', 'Grade 3-A', 'Grade 4-A', 'Grade 1'];
  for (const cls of seedClasses) {
    await fetch(`${BASE_URL}/api/classes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ className: cls })
    });
    await fetch(`${BASE_URL}/api/classes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ className: cls })
    });
  }

  // ------------------------------------------------------------------------
  // TEST GROUP 1: UNAUTHENTICATED ACCESS MUST BE REJECTED (401)
  // ------------------------------------------------------------------------
  console.log('\n--- 1. AUTHENTICATION ENFORCEMENT & PUBLIC REJECTION ---');

  const resUnauthGet = await fetch(`${BASE_URL}/api/students`);
  assert(resUnauthGet.status === 401, 'GET /api/students without token returns 401');

  const resUnauthGetOne = await fetch(`${BASE_URL}/api/students/STD-9999`);
  assert(resUnauthGetOne.status === 401, 'GET /api/students/:id without token returns 401');

  const resUnauthPost = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Unauth Student', class: 'Grade 1' })
  });
  assert(resUnauthPost.status === 401, 'POST /api/students without token returns 401');

  const resUnauthPut = await fetch(`${BASE_URL}/api/students/STD-9999`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Updated Name' })
  });
  assert(resUnauthPut.status === 401, 'PUT /api/students/:id without token returns 401');

  const resUnauthDelete = await fetch(`${BASE_URL}/api/students/STD-9999`, {
    method: 'DELETE'
  });
  assert(resUnauthDelete.status === 401, 'DELETE /api/students/:id without token returns 401');

  const resUnauthBulk = await fetch(`${BASE_URL}/api/students/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', studentIds: ['STD-1'] })
  });
  assert(resUnauthBulk.status === 401, 'POST /api/students/bulk without token returns 401');

  const resUnauthImport = await fetch(`${BASE_URL}/api/students/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students: [] })
  });
  assert(resUnauthImport.status === 401, 'POST /api/students/import without token returns 401');

  // ------------------------------------------------------------------------
  // TEST GROUP 2: ZERO-TRUST HEADER SPOOFING FORBIDDEN
  // ------------------------------------------------------------------------
  console.log('\n--- 2. HEADER IDENTITY SPOOFING REJECTION ---');

  const resHeaderSpoof = await fetch(`${BASE_URL}/api/students`, {
    headers: { 'X-School-Email': 'admin@test-school-alpha.com' }
  });
  assert(resHeaderSpoof.status === 401, 'X-School-Email header alone without token is rejected with 401');

  const resDefaultSchoolSpoof = await fetch(`${BASE_URL}/api/students`, {
    headers: { 'X-School-Email': 'default-school' }
  });
  assert(resDefaultSchoolSpoof.status === 401, 'X-School-Email: default-school spoofing rejected with 401');

  // ------------------------------------------------------------------------
  // TEST GROUP 3: ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS
  // ------------------------------------------------------------------------
  console.log('\n--- 3. ROLE-BASED ACCESS CONTROL (RBAC) ---');

  const resUnknownRole = await fetch(`${BASE_URL}/api/students`, {
    headers: { Authorization: `Bearer ${tokenUnknown}` }
  });
  assert(resUnknownRole.status === 403, 'Unknown/invalid role fails closed with 403');

  const resStaffView = await fetch(`${BASE_URL}/api/students`, {
    headers: { Authorization: `Bearer ${tokenStaffA}` }
  });
  assert(resStaffView.status === 403, 'Staff role has no students.view permission (403)');

  const resStaffCreate = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenStaffA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fullName: 'Staff Student', class: 'Grade 1', guardianPhone: '252615000000' })
  });
  assert(resStaffCreate.status === 403, 'Staff role cannot create student (403)');

  // Receptionist can create but cannot delete
  const resRecepDelete = await fetch(`${BASE_URL}/api/students/STD-9999`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenReceptionistA}` }
  });
  assert(resRecepDelete.status === 403, 'Receptionist role cannot delete student (403)');

  const resRecepBulkDelete = await fetch(`${BASE_URL}/api/students/bulk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenReceptionistA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'delete', studentIds: ['STD-9999'] })
  });
  assert(resRecepBulkDelete.status === 403, 'Receptionist role cannot bulk delete students (403)');

  // ------------------------------------------------------------------------
  // TEST GROUP 4: DATA VALIDATION & INPUT QUALITY GATES
  // ------------------------------------------------------------------------
  console.log('\n--- 4. DATA VALIDATION & QUALITY GATES ---');

  const resEmptyName = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: ' ', class: 'Grade 1-A', guardianPhone: '252615000000' })
  });
  assert(resEmptyName.status === 400, 'Rejects empty/blank student fullName (400)');

  const resMissingClass = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Axmed Cali', class: '', guardianPhone: '252615000000' })
  });
  assert(resMissingClass.status === 400, 'Rejects missing class (400)');

  const resShortPhone = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Axmed Cali', class: 'Grade 1-A', guardianPhone: '123' })
  });
  assert(resShortPhone.status === 400, 'Rejects invalid guardian phone < 6 digits (400)');

  const resFutureDob = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Axmed Cali',
      class: 'Grade 1-A',
      guardianPhone: '252615000000',
      dateOfBirth: '2099-01-01'
    })
  });
  assert(resFutureDob.status === 400, 'Rejects future date of birth (400)');

  // ------------------------------------------------------------------------
  // TEST GROUP 5: FULL CRUD LIFECYCLE & DUPLICATE PREVENTION
  // ------------------------------------------------------------------------
  console.log('\n--- 5. FULL CRUD LIFECYCLE & DUPLICATE PREVENTION ---');

  const studentAId = 'STD-TST-' + Math.floor(10000 + Math.random() * 90000);
  const studentPayload = {
    id: studentAId,
    fullName: 'Jaamac Cali Warsame',
    class: 'Grade 1-A',
    gender: 'Male',
    guardianPhone: '252615111222',
    guardianName: 'Cali Warsame',
    guardianRelationship: 'Aabe (Father)',
    rollNumber: 'R-01',
    dateOfBirth: '2015-05-15',
    address: 'Wadajir, Mogadishu',
    section: 'A',
    status: 'active'
  };

  // 1. CREATE
  const resCreate = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(studentPayload)
  });
  assert(resCreate.status === 201, 'Create student in School A returns 201 Created');
  const createdData = await resCreate.json();
  assert(createdData.id === studentAId, 'Returned created student ID matches');
  assert(createdData.fullName === studentPayload.fullName, 'Returned student fullName matches');

  // 2. PREVENT DUPLICATE ROLL NUMBER IN SAME CLASS & SCHOOL
  const resDupRoll = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...studentPayload,
      id: 'STD-TST-NEW-ID',
      fullName: 'Different Name',
      rollNumber: 'R-01' // Same roll in Grade 1-A
    })
  });
  assert(resDupRoll.status === 400 || resDupRoll.status === 409, 'Rejects duplicate roll number in same class (400/409)');

  // 3. PREVENT DUPLICATE STUDENT ID
  const resDupId = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...studentPayload,
      id: studentAId,
      rollNumber: 'R-99'
    })
  });
  assert(resDupId.status === 400 || resDupId.status === 409, 'Rejects duplicate student ID (400/409)');

  // 4. READ SINGLE RECORD
  const resGetSingle = await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });
  assert(resGetSingle.status === 200, 'Read created student details returns 200');
  const singleData = await resGetSingle.json();
  assert(singleData.guardianName === 'Cali Warsame', 'Guardian name preserved');
  assert(singleData.rollNumber === 'R-01', 'Roll number preserved');

  // 5. UPDATE RECORD
  const resUpdate = await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guardianPhone: '252615999888',
      address: 'Hodan, Mogadishu',
      status: 'inactive'
    })
  });
  assert(resUpdate.status === 200, 'Update student returns 200');

  const resVerifyUpdate = await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });
  const updatedData = await resVerifyUpdate.json();
  assert(updatedData.guardianPhone === '252615999888', 'Updated guardian phone reflected');
  assert(updatedData.status === 'inactive', 'Updated status reflected');

  // ------------------------------------------------------------------------
  // TEST GROUP 6: MULTI-TENANT ISOLATION (SCHOOL A VS SCHOOL B)
  // ------------------------------------------------------------------------
  console.log('\n--- 6. MULTI-TENANT ISOLATION GATES ---');

  // School B attempts to read School A's student
  const resCrossRead = await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    headers: { Authorization: `Bearer ${tokenAdminB}` }
  });
  assert(resCrossRead.status === 404, 'School B cannot read School A student (IDOR protection returns 404)');

  // School B attempts to update School A's student
  const resCrossUpdate = await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenAdminB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Malicious Update' })
  });
  assert(resCrossUpdate.status === 404, 'School B cannot update School A student (returns 404)');

  // School B attempts to delete School A's student
  const resCrossDelete = await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenAdminB}` }
  });
  assert(resCrossDelete.status === 404, 'School B cannot delete School A student (returns 404)');

  // School B listing students should NOT include studentAId
  const resListB = await fetch(`${BASE_URL}/api/students`, {
    headers: { Authorization: `Bearer ${tokenAdminB}` }
  });
  const listB = await resListB.json();
  const foundInB = Array.isArray(listB) ? listB.some((s: any) => s.id === studentAId) : false;
  assert(!foundInB, 'School A student is strictly absent from School B roster listing');

  // ------------------------------------------------------------------------
  // TEST GROUP 7: TEACHER CLASS RESTRICTIONS
  // ------------------------------------------------------------------------
  console.log('\n--- 7. TEACHER CLASS RESTRICTIONS ---');

  // Teacher A is assigned to 'Grade 1-A'
  // Student A is in 'Grade 1-A'
  const resTeacherViewStudentA = await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    headers: { Authorization: `Bearer ${tokenTeacherA}` }
  });
  assert(resTeacherViewStudentA.status === 200, 'Teacher can view student in assigned class Grade 1-A (200)');

  // Create Student in Grade 2-B (outside Teacher A's assigned classes)
  const studentGrade2Id = 'STD-TST-G2-' + Math.floor(1000 + Math.random() * 9000);
  await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: studentGrade2Id,
      fullName: 'Sahra Xasan Nuur',
      class: 'Grade 2-B',
      guardianPhone: '252615333444',
      status: 'active'
    })
  });

  // Teacher A attempts to view student in Grade 2-B
  const resTeacherViewOutside = await fetch(`${BASE_URL}/api/students/${studentGrade2Id}`, {
    headers: { Authorization: `Bearer ${tokenTeacherA}` }
  });
  assert(resTeacherViewOutside.status === 403, 'Teacher cannot view student outside assigned class (403)');

  // Teacher roster listing only shows assigned class students
  const resTeacherList = await fetch(`${BASE_URL}/api/students`, {
    headers: { Authorization: `Bearer ${tokenTeacherA}` }
  });
  const teacherStudents = await resTeacherList.json();
  const allInAssigned = (teacherStudents || []).every((s: any) => s.class === 'Grade 1-A');
  assert(allInAssigned, 'Teacher roster listing contains ONLY assigned class students');

  // ------------------------------------------------------------------------
  // TEST GROUP 8: BULK OPERATIONS (STATUS, CLASS, ARCHIVE, RESTORE, DELETE)
  // ------------------------------------------------------------------------
  console.log('\n--- 8. BULK OPERATIONS ---');

  // Create two temporary students for bulk testing
  const bulkId1 = 'STD-BLK-1-' + Math.floor(1000 + Math.random() * 9000);
  const bulkId2 = 'STD-BLK-2-' + Math.floor(1000 + Math.random() * 9000);
  await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bulkId1, fullName: 'Bulk Test 1', class: 'Grade 1-A', guardianPhone: '252615777111' })
  });
  await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bulkId2, fullName: 'Bulk Test 2', class: 'Grade 1-A', guardianPhone: '252615777222' })
  });

  // Bulk Archive
  const resBulkArchive = await fetch(`${BASE_URL}/api/students/bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'archive', studentIds: [bulkId1, bulkId2] })
  });
  assert(resBulkArchive.status === 200, 'Bulk archive returns 200');
  const bulkArchRes = await resBulkArchive.json();
  assert(bulkArchRes.processedCount === 2, 'Bulk archive processed exactly 2 students');

  // Verify archived status
  const resCheckArch = await fetch(`${BASE_URL}/api/students/${bulkId1}`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });
  const checkArchData = await resCheckArch.json();
  assert(checkArchData.status === 'archived', 'Student status is now archived');

  // Bulk Restore
  const resBulkRestore = await fetch(`${BASE_URL}/api/students/bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'restore', studentIds: [bulkId1, bulkId2] })
  });
  assert(resBulkRestore.status === 200, 'Bulk restore returns 200');
  const resCheckRest = await fetch(`${BASE_URL}/api/students/${bulkId1}`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });
  const checkRestData = await resCheckRest.json();
  assert(checkRestData.status === 'active', 'Student status restored to active');

  // Bulk Class Change
  const resBulkClass = await fetch(`${BASE_URL}/api/students/bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'change_class', studentIds: [bulkId1, bulkId2], targetClass: 'Grade 1-B' })
  });
  assert(resBulkClass.status === 200, 'Bulk class change returns 200');

  // Bulk Cross-tenant protection: School B tries to bulk delete School A students
  const resBulkCross = await fetch(`${BASE_URL}/api/students/bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', studentIds: [bulkId1, bulkId2] })
  });
  assert(resBulkCross.status === 404, 'Cross-tenant bulk action returns 404 (No students in tenant)');

  // Bulk Delete
  const resBulkDelete = await fetch(`${BASE_URL}/api/students/bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', studentIds: [bulkId1, bulkId2] })
  });
  assert(resBulkDelete.status === 200, 'Bulk delete returns 200');

  const resCheckDel1 = await fetch(`${BASE_URL}/api/students/${bulkId1}`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });
  assert(resCheckDel1.status === 404, 'Bulk-deleted student 1 is gone (404)');

  // ------------------------------------------------------------------------
  // TEST GROUP 9: BATCH IMPORT ENDPOINT
  // ------------------------------------------------------------------------
  console.log('\n--- 9. PRODUCTION BATCH IMPORT ENDPOINT ---');

  const importBatch = [
    {
      fullName: 'Mustafe Cabdi Jaamac',
      class: 'Grade 3-A',
      gender: 'Male',
      guardianPhone: '252615444555',
      rollNumber: 'R-101'
    },
    {
      fullName: 'Nimco Yuusuf Geedi',
      class: 'Grade 3-A',
      gender: 'Female',
      guardianPhone: '252615444666',
      rollNumber: 'R-102'
    },
    // Invalid record (missing class)
    {
      fullName: 'Khalad Xog',
      class: '',
      guardianPhone: '252615444777'
    }
  ];

  const resImport = await fetch(`${BASE_URL}/api/students/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ students: importBatch })
  });
  assert(resImport.status === 201, 'Batch import returns 201 Created');
  const importResult = await resImport.json();
  assert(importResult.importedCount === 2, 'Imported exactly 2 valid students');
  assert(importResult.skippedCount === 1, 'Skipped 1 invalid student');
  assert(Array.isArray(importResult.errors) && importResult.errors.length === 1, 'Provides detailed row-level error reporting');

  // Clean up imported test students and Grade2 student
  if (Array.isArray(importResult.students)) {
    const ids = importResult.students.map((s: any) => s.id);
    await fetch(`${BASE_URL}/api/students/bulk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', studentIds: ids })
    });
  }
  await fetch(`${BASE_URL}/api/students/${studentGrade2Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });
  await fetch(`${BASE_URL}/api/students/${studentAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });

  // ------------------------------------------------------------------------
  // TEST GROUP 10: CHECK-DUPLICATE ENDPOINT
  // ------------------------------------------------------------------------
  console.log('\n--- 10. CHECK-DUPLICATE ENDPOINT ---');

  // Create one student to check duplicate against
  const checkDupId = 'STD-DUP-CHECK';
  await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: checkDupId,
      fullName: 'Xamdi Shire Guuleed',
      class: 'Grade 4-A',
      guardianPhone: '252615888999',
      rollNumber: 'R-401'
    })
  });

  const resCheckRollDup = await fetch(`${BASE_URL}/api/students/check-duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      className: 'Grade 4-A',
      rollNumber: 'R-401'
    })
  });
  const rollDupData = await resCheckRollDup.json();
  assert(rollDupData.hasDuplicate === true, 'Duplicate check identifies duplicate roll number in class');

  const resCheckNameDup = await fetch(`${BASE_URL}/api/students/check-duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Xamdi Shire Guuleed',
      className: 'Grade 4-A'
    })
  });
  const nameDupData = await resCheckNameDup.json();
  assert(nameDupData.hasDuplicate === true, 'Duplicate check identifies duplicate name in class');

  const resCheckUnique = await fetch(`${BASE_URL}/api/students/check-duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Caaqil Geedi',
      className: 'Grade 4-A',
      rollNumber: 'R-999',
      guardianPhone: '252615000999'
    })
  });
  const uniqueData = await resCheckUnique.json();
  assert(uniqueData.hasDuplicate === false, 'Duplicate check returns false for unique student');

  // Clean up
  await fetch(`${BASE_URL}/api/students/${checkDupId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenAdminA}` }
  });

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
