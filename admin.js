(() => {
  'use strict';

  const app = window.UNCampus;
  let pendingConfirmAction = null;

  const panels = [...document.querySelectorAll('.admin-panel')];
  const navTabs = [...document.querySelectorAll('.nav-tab')];
  const form = document.getElementById('studentResultForm');
  const moduleEditor = document.getElementById('moduleEditor');
  const batchSelect = document.getElementById('adminBatch');
  const batchFilter = document.getElementById('batchFilter');
  const totalDaysInput = document.getElementById('adminTotalDays');
  const presentDaysInput = document.getElementById('adminPresentDays');
  const absentDaysInput = document.getElementById('adminAbsentDays');
  const attendancePreview = document.getElementById('adminAttendancePreview');
  const confirmModal = document.getElementById('confirmModal');

  const setPanel = (panelId) => {
    panels.forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
    navTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.panel === panelId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (panelId === 'studentListPanel') renderStudentTable();
    if (panelId === 'dashboardPanel') renderDashboard();
    if (panelId === 'settingsPanel') renderSettings();
  };

  navTabs.forEach((tab) => tab.addEventListener('click', () => setPanel(tab.dataset.panel)));
  document.querySelectorAll('[data-go-panel]').forEach((button) => button.addEventListener('click', () => setPanel(button.dataset.goPanel)));
  document.getElementById('quickAddBtn').addEventListener('click', () => {
    clearForm();
    setPanel('studentFormPanel');
  });

  const populateBatchControls = () => {
    const data = app.getData();
    const sorted = data.batches.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const currentBatch = batchSelect.value;
    const currentFilter = batchFilter.value;

    batchSelect.innerHTML = '<option value="">Select batch</option>' + sorted.map((batch) => `<option value="${app.escapeHtml(batch)}">${app.escapeHtml(batch)}</option>`).join('');
    batchFilter.innerHTML = '<option value="">All batches</option>' + sorted.map((batch) => `<option value="${app.escapeHtml(batch)}">${app.escapeHtml(batch)}</option>`).join('');

    if (sorted.includes(currentBatch)) batchSelect.value = currentBatch;
    if (sorted.includes(currentFilter)) batchFilter.value = currentFilter;
  };

  const addModuleRow = (module = { no: '', name: '', marks: '' }) => {
    const row = document.createElement('div');
    row.className = 'module-row';
    row.innerHTML = `
      <label class="field">
        <span>Module No</span>
        <input class="module-no" type="text" placeholder="DIT101" value="${app.escapeHtml(module.no)}" required />
      </label>
      <label class="field">
        <span>Module Name</span>
        <input class="module-name" type="text" placeholder="Module name" value="${app.escapeHtml(module.name)}" required />
      </label>
      <label class="field">
        <span>Marks</span>
        <input class="module-marks" type="number" min="0" max="100" placeholder="0–100" value="${module.marks ?? ''}" required />
      </label>
      <div class="field module-result-wrap">
        <span>Grade / Status</span>
        <div class="module-result-preview">—</div>
      </div>
      <button class="remove-module" type="button" aria-label="Remove module">×</button>
    `;
    moduleEditor.appendChild(row);

    const marksInput = row.querySelector('.module-marks');
    const preview = row.querySelector('.module-result-preview');
    const updatePreview = () => {
      if (marksInput.value === '') {
        preview.textContent = '—';
        return;
      }
      const marks = app.clampMarks(marksInput.value);
      preview.textContent = `${app.gradeFor(marks)} · ${app.isPass(marks) ? 'Pass' : 'Fail'}`;
      preview.style.color = app.isPass(marks) ? 'var(--success)' : 'var(--danger)';
    };
    marksInput.addEventListener('input', updatePreview);
    updatePreview();

    row.querySelector('.remove-module').addEventListener('click', () => {
      if (moduleEditor.children.length <= 1) {
        app.showToast('At least one module is required.', 'error', 'Cannot remove module');
        return;
      }
      row.remove();
    });
  };

  const updateAttendance = () => {
    const total = Math.max(0, Number(totalDaysInput.value) || 0);
    const present = Math.max(0, Number(presentDaysInput.value) || 0);
    const absent = Math.max(0, total - present);
    absentDaysInput.value = totalDaysInput.value === '' ? '' : absent;
    const percentage = total > 0 ? Math.round((Math.min(present, total) / total) * 100) : 0;
    attendancePreview.textContent = `${percentage}%`;
    attendancePreview.style.color = percentage >= 80 ? 'var(--success)' : percentage >= 60 ? 'var(--warning)' : 'var(--danger)';
  };

  totalDaysInput.addEventListener('input', updateAttendance);
  presentDaysInput.addEventListener('input', updateAttendance);
  document.getElementById('addModuleBtn').addEventListener('click', () => addModuleRow());

  const clearForm = () => {
    form.reset();
    document.getElementById('recordId').value = '';
    document.getElementById('formTitle').textContent = 'Add Student Result';
    document.getElementById('saveStudentBtn').textContent = 'Save Student Result';
    document.getElementById('cancelEditBtn').hidden = true;
    moduleEditor.innerHTML = '';
    addModuleRow();
    updateAttendance();
  };

  document.getElementById('clearFormBtn').addEventListener('click', clearForm);
  document.getElementById('cancelEditBtn').addEventListener('click', () => {
    clearForm();
    setPanel('studentListPanel');
  });

  const collectModules = () => [...moduleEditor.querySelectorAll('.module-row')].map((row) => ({
    no: row.querySelector('.module-no').value.trim(),
    name: row.querySelector('.module-name').value.trim(),
    marks: app.clampMarks(row.querySelector('.module-marks').value)
  }));

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const id = document.getElementById('recordId').value;
    const name = document.getElementById('adminStudentName').value.trim();
    const nic = app.normaliseNic(document.getElementById('adminNic').value);
    const course = document.getElementById('adminCourse').value.trim();
    const batch = batchSelect.value;
    const total = Number(totalDaysInput.value);
    const present = Number(presentDaysInput.value);
    const modules = collectModules();

    if (!name || !nic || !course || !batch) {
      app.showToast('Complete all student and course fields.', 'error', 'Missing information');
      return;
    }
    if (!app.isValidNic(nic)) {
      app.showToast('Enter a valid NIC: 11–12 digits, or the older 9 digits followed by V/X.', 'error', 'Invalid NIC');
      document.getElementById('adminNic').focus();
      return;
    }
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(present) || present < 0 || present > total) {
      app.showToast('Present days must be between 0 and the total number of days.', 'error', 'Invalid attendance');
      return;
    }
    if (!modules.length || modules.some((module) => !module.no || !module.name)) {
      app.showToast('Complete the module number, name, and marks for every module.', 'error', 'Incomplete modules');
      return;
    }

    const data = app.getData();
    const duplicate = data.students.find((student) => student.id !== id && app.normaliseNic(student.nic) === nic && app.normaliseBatch(student.batch) === app.normaliseBatch(batch));
    if (duplicate) {
      app.showToast('A record already exists for this NIC in the selected batch. Edit that record instead.', 'error', 'Duplicate record');
      return;
    }

    const record = {
      id: id || app.createId(),
      name,
      nic,
      course,
      batch,
      attendance: { total, present, absent: total - present },
      modules,
      updatedAt: new Date().toISOString()
    };

    if (id) {
      const index = data.students.findIndex((student) => student.id === id);
      if (index === -1) {
        app.showToast('The selected record could not be found.', 'error', 'Update failed');
        return;
      }
      data.students[index] = record;
      app.showToast(`${name}'s result was updated successfully.`, 'success', 'Record updated');
    } else {
      data.students.unshift(record);
      app.showToast(`${name}'s result was saved successfully.`, 'success', 'Record saved');
    }

    app.saveData(data);
    clearForm();
    renderAll();
    setPanel('studentListPanel');
  });

  const renderDashboard = () => {
    const data = app.getData();
    const students = data.students;
    const averageAttendance = students.length
      ? Math.round(students.reduce((sum, student) => sum + app.attendancePercentage(student.attendance), 0) / students.length)
      : 0;

    document.getElementById('metricStudents').textContent = students.length;
    document.getElementById('metricBatches').textContent = data.batches.length;
    document.getElementById('metricPassed').textContent = students.filter(app.overallPass).length;
    document.getElementById('metricAttendance').textContent = `${averageAttendance}%`;

    const recent = students.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    document.getElementById('recentStudents').innerHTML = recent.length ? recent.map((student) => `
      <div class="recent-item">
        <div class="recent-person">
          <div class="initial">${app.initials(student.name)}</div>
          <div><strong>${app.escapeHtml(student.name)}</strong><small>${app.escapeHtml(student.nic)} · ${app.escapeHtml(student.batch)}</small></div>
        </div>
        <small>${new Date(student.updatedAt).toLocaleDateString()}</small>
      </div>
    `).join('') : '<p class="muted">No student records yet.</p>';
  };

  const renderStudentTable = () => {
    const query = document.getElementById('studentFilter').value.trim().toLowerCase();
    const filterBatch = batchFilter.value;
    const data = app.getData();
    const rows = data.students.filter((student) => {
      const matchesQuery = !query || student.name.toLowerCase().includes(query) || student.nic.toLowerCase().includes(query);
      const matchesBatch = !filterBatch || student.batch === filterBatch;
      return matchesQuery && matchesBatch;
    });

    const tbody = document.getElementById('adminStudentTableBody');
    const empty = document.getElementById('studentEmptyState');
    tbody.innerHTML = rows.map((student) => {
      const pass = app.overallPass(student);
      return `
        <tr>
          <td><div class="student-cell"><div class="initial">${app.initials(student.name)}</div><div><strong>${app.escapeHtml(student.name)}</strong><small>${app.escapeHtml(student.course)}</small></div></div></td>
          <td>${app.escapeHtml(student.nic)}</td>
          <td>${app.escapeHtml(student.batch)}</td>
          <td>${student.modules.length}</td>
          <td>${app.attendancePercentage(student.attendance)}%</td>
          <td><span class="status-pill ${pass ? 'status-pass' : 'status-fail'}">${pass ? 'Pass' : 'Fail'}</span></td>
          <td><div class="action-buttons"><button class="small-action" type="button" data-edit-id="${student.id}" title="Edit">✎</button><button class="small-action delete" type="button" data-delete-id="${student.id}" title="Delete">×</button></div></td>
        </tr>
      `;
    }).join('');
    empty.hidden = rows.length > 0;

    tbody.querySelectorAll('[data-edit-id]').forEach((button) => button.addEventListener('click', () => editStudent(button.dataset.editId)));
    tbody.querySelectorAll('[data-delete-id]').forEach((button) => button.addEventListener('click', () => requestDeleteStudent(button.dataset.deleteId)));
  };

  const editStudent = (id) => {
    const student = app.getData().students.find((item) => item.id === id);
    if (!student) return;

    document.getElementById('recordId').value = student.id;
    document.getElementById('adminStudentName').value = student.name;
    document.getElementById('adminNic').value = student.nic;
    document.getElementById('adminCourse').value = student.course;
    batchSelect.value = student.batch;
    totalDaysInput.value = student.attendance.total;
    presentDaysInput.value = student.attendance.present;
    moduleEditor.innerHTML = '';
    student.modules.forEach(addModuleRow);
    updateAttendance();

    document.getElementById('formTitle').textContent = 'Update Student Result';
    document.getElementById('saveStudentBtn').textContent = 'Update Student Result';
    document.getElementById('cancelEditBtn').hidden = false;
    setPanel('studentFormPanel');
  };

  const openConfirm = (title, message, action) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    pendingConfirmAction = action;
    confirmModal.hidden = false;
  };

  const closeConfirm = () => {
    confirmModal.hidden = true;
    pendingConfirmAction = null;
  };

  document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeConfirm));
  document.getElementById('confirmActionBtn').addEventListener('click', () => {
    if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
    closeConfirm();
  });

  const requestDeleteStudent = (id) => {
    const data = app.getData();
    const student = data.students.find((item) => item.id === id);
    if (!student) return;
    openConfirm('Delete student record?', `This will permanently remove ${student.name}'s result from this browser.`, () => {
      data.students = data.students.filter((item) => item.id !== id);
      app.saveData(data);
      renderAll();
      app.showToast(`${student.name}'s record was deleted.`, 'success', 'Record deleted');
    });
  };

  document.getElementById('studentFilter').addEventListener('input', renderStudentTable);
  batchFilter.addEventListener('change', renderStudentTable);

  document.getElementById('batchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('newBatchName');
    const batch = app.normaliseBatch(input.value);
    if (!batch) return;
    const data = app.getData();
    if (data.batches.some((item) => app.normaliseBatch(item) === batch)) {
      app.showToast('That batch already exists.', 'error', 'Duplicate batch');
      return;
    }
    data.batches.push(batch);
    app.saveData(data);
    input.value = '';
    populateBatchControls();
    renderSettings();
    renderDashboard();
    app.showToast(`${batch} was added to the portal.`, 'success', 'Batch added');
  });

  const renderSettings = () => {
    const data = app.getData();
    document.getElementById('batchChips').innerHTML = data.batches
      .slice()
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((batch) => `<span class="batch-chip">${app.escapeHtml(batch)}<button type="button" data-remove-batch="${app.escapeHtml(batch)}" aria-label="Remove ${app.escapeHtml(batch)}">×</button></span>`)
      .join('');

    document.querySelectorAll('[data-remove-batch]').forEach((button) => button.addEventListener('click', () => {
      const batch = button.dataset.removeBatch;
      const current = app.getData();
      if (current.students.some((student) => student.batch === batch)) {
        app.showToast('This batch cannot be removed while student records are assigned to it.', 'error', 'Batch in use');
        return;
      }
      openConfirm('Remove batch?', `${batch} will be removed from the available batch list.`, () => {
        current.batches = current.batches.filter((item) => item !== batch);
        app.saveData(current);
        populateBatchControls();
        renderSettings();
        renderDashboard();
        app.showToast(`${batch} was removed.`, 'success', 'Batch removed');
      });
    }));

    app.renderGradeScale(document.getElementById('adminGradeScale'));
  };

  document.getElementById('exportDataBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(app.getData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `un-campus-results-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    app.showToast('A JSON backup was exported successfully.', 'success', 'Data exported');
  });

  document.getElementById('importDataInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported.batches) || !Array.isArray(imported.students)) throw new Error('Invalid data structure');
      app.saveData(imported);
      populateBatchControls();
      renderAll();
      clearForm();
      app.showToast('The backup file was imported successfully.', 'success', 'Data imported');
    } catch (error) {
      app.showToast('The selected file is not a valid UN Campus results backup.', 'error', 'Import failed');
    } finally {
      event.target.value = '';
    }
  });

  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    openConfirm('Reset demo data?', 'All current browser data will be replaced with the original demo records.', () => {
      app.resetData();
      populateBatchControls();
      clearForm();
      renderAll();
      app.showToast('Demo data has been restored.', 'success', 'Data reset');
    });
  });

  const renderAll = () => {
    renderDashboard();
    renderStudentTable();
    renderSettings();
  };

  document.getElementById('adminNic').addEventListener('input', (event) => {
    event.target.value = event.target.value.toUpperCase().replace(/\s+/g, '');
  });

  populateBatchControls();
  clearForm();
  renderAll();
})();
