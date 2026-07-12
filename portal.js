(() => {
  'use strict';

  const app = window.UNCampus;
  const form = document.getElementById('resultSearchForm');
  const batchSelect = document.getElementById('studentBatch');
  const nicInput = document.getElementById('studentNic');
  const resultSection = document.getElementById('resultSection');

  const populateBatches = () => {
    const current = batchSelect.value;
    const { batches } = app.getData();
    batchSelect.innerHTML = '<option value="">Select your batch</option>' + batches
      .slice()
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((batch) => `<option value="${app.escapeHtml(batch)}">${app.escapeHtml(batch)}</option>`)
      .join('');
    if (batches.includes(current)) batchSelect.value = current;
  };

  const renderResult = (student) => {
    const attendancePct = app.attendancePercentage(student.attendance);
    const passed = student.modules.filter((module) => app.isPass(module.marks)).length;
    const failed = student.modules.length - passed;
    const average = student.modules.length
      ? Math.round(student.modules.reduce((sum, module) => sum + Number(module.marks || 0), 0) / student.modules.length)
      : 0;
    const overall = app.overallPass(student);

    document.getElementById('studentInitials').textContent = app.initials(student.name);
    document.getElementById('resultStudentName').textContent = student.name;
    document.getElementById('resultNic').textContent = student.nic;
    document.getElementById('resultCourse').textContent = student.course;
    document.getElementById('resultBatch').textContent = student.batch;

    const badge = document.getElementById('overallBadge');
    badge.classList.toggle('fail', !overall);
    document.getElementById('overallStatus').textContent = overall ? 'PASS' : 'FAIL';

    document.getElementById('attendancePercentage').textContent = `${attendancePct}%`;
    document.getElementById('attendanceRing').style.setProperty('--attendance', attendancePct);
    document.getElementById('totalDays').textContent = student.attendance.total;
    document.getElementById('presentDays').textContent = student.attendance.present;
    document.getElementById('absentDays').textContent = student.attendance.absent;

    document.getElementById('moduleCount').textContent = student.modules.length;
    document.getElementById('passedCount').textContent = passed;
    document.getElementById('failedCount').textContent = failed;
    document.getElementById('averageMark').textContent = `${average}%`;

    document.getElementById('moduleResultsBody').innerHTML = student.modules.map((module, index) => {
      const pass = app.isPass(module.marks);
      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${app.escapeHtml(module.no)}</strong></td>
          <td>${app.escapeHtml(module.name)}</td>
          <td class="result-mark">${app.clampMarks(module.marks)} <small>(${app.gradeFor(module.marks)})</small></td>
          <td><span class="status-pill ${pass ? 'status-pass' : 'status-fail'}">${pass ? 'Pass' : 'Fail'}</span></td>
        </tr>
      `;
    }).join('');

    app.renderGradeScale(document.getElementById('gradeScale'));
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const batch = batchSelect.value;
    const nic = app.normaliseNic(nicInput.value);

    if (!batch) {
      app.showToast('Please select your batch before searching.', 'error', 'Batch required');
      batchSelect.focus();
      return;
    }
    if (!nic) {
      app.showToast('Please enter your NIC number.', 'error', 'NIC required');
      nicInput.focus();
      return;
    }
    if (!app.isValidNic(nic)) {
      app.showToast('Enter a valid NIC: 11–12 digits, or the older 9 digits followed by V/X.', 'error', 'Invalid NIC');
      nicInput.focus();
      return;
    }

    const student = app.getData().students.find((item) =>
      app.normaliseBatch(item.batch) === app.normaliseBatch(batch) && app.normaliseNic(item.nic) === nic
    );

    if (!student) {
      resultSection.hidden = true;
      app.showToast('No result was found for that batch and NIC. Check the details or contact the administration.', 'error', 'Result not found');
      return;
    }

    renderResult(student);
    app.showToast(`Result loaded successfully for ${student.name}.`, 'success', 'Result found');
  });

  nicInput.addEventListener('input', () => {
    nicInput.value = nicInput.value.toUpperCase().replace(/\s+/g, '');
  });

  document.getElementById('newSearchBtn').addEventListener('click', () => {
    resultSection.hidden = true;
    form.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => batchSelect.focus(), 350);
  });

  document.getElementById('printResultBtn').addEventListener('click', () => window.print());
  window.addEventListener('un-campus-data-updated', populateBatches);

  populateBatches();
  app.renderGradeScale(document.getElementById('gradeScale'));
})();
