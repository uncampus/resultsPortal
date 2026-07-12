(() => {
  'use strict';

  const STORAGE_KEY = 'unCampusResultsPortalData_v1';
  const THEME_KEY = 'unCampusResultsTheme';

  const GRADES = [
    { min: 85, max: 100, grade: 'A+' },
    { min: 75, max: 84, grade: 'A' },
    { min: 65, max: 74, grade: 'B+' },
    { min: 55, max: 64, grade: 'B' },
    { min: 45, max: 54, grade: 'C' },
    { min: 0, max: 44, grade: 'F' }
  ];

  const createId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const seedData = () => ({
    batches: ['DIIT 01', 'DIIT 02', 'DIIT 03', 'DIIT 04'],
    students: [
      {
        id: createId(),
        name: 'Ayesha Perera',
        nic: '20001234567',
        course: 'Diploma in Information Technology',
        batch: 'DIIT 01',
        attendance: { total: 120, present: 110, absent: 10 },
        modules: [
          { no: 'DIT101', name: 'Computer Fundamentals', marks: 82 },
          { no: 'DIT102', name: 'Programming Fundamentals', marks: 76 },
          { no: 'DIT103', name: 'Database Management', marks: 68 },
          { no: 'DIT104', name: 'Web Development', marks: 88 },
          { no: 'DIT105', name: 'Networking Essentials', marks: 72 },
          { no: 'DIT106', name: 'Professional Practice', marks: 79 }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: createId(),
        name: 'Mohamed Rizwan',
        nic: '199912345678',
        course: 'Diploma in Information Technology',
        batch: 'DIIT 02',
        attendance: { total: 116, present: 99, absent: 17 },
        modules: [
          { no: 'DIT101', name: 'Computer Fundamentals', marks: 71 },
          { no: 'DIT102', name: 'Programming Fundamentals', marks: 63 },
          { no: 'DIT103', name: 'Database Management', marks: 59 },
          { no: 'DIT104', name: 'Web Development', marks: 67 }
        ],
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  });

  const normaliseNic = (value) => String(value || '').trim().replace(/\s+/g, '').toUpperCase();
  const normaliseBatch = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
  const initials = (name) => String(name || 'Student').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const isValidNic = (nic) => /^(?:\d{9}[VX]|\d{11,12})$/i.test(normaliseNic(nic));
  const clampMarks = (marks) => Math.min(100, Math.max(0, Number(marks) || 0));
  const gradeFor = (marks) => GRADES.find((item) => clampMarks(marks) >= item.min)?.grade || 'F';
  const isPass = (marks) => clampMarks(marks) >= 45;
  const attendancePercentage = (attendance) => {
    const total = Number(attendance?.total) || 0;
    const present = Number(attendance?.present) || 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };
  const overallPass = (student) => Array.isArray(student?.modules) && student.modules.length > 0 && student.modules.every((module) => isPass(module.marks));

  const getData = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && Array.isArray(stored.batches) && Array.isArray(stored.students)) return stored;
    } catch (error) {
      console.warn('Could not read saved portal data:', error);
    }
    const data = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  };

  const saveData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('un-campus-data-updated'));
  };

  const resetData = () => {
    const data = seedData();
    saveData(data);
    return data;
  };

  const showToast = (message, type = 'info', title = '') => {
    const region = document.getElementById('toastRegion');
    if (!region) return;

    const labels = {
      success: { icon: '✓', title: title || 'Success' },
      error: { icon: '!', title: title || 'Something went wrong' },
      info: { icon: 'i', title: title || 'Information' }
    };
    const config = labels[type] || labels.info;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${config.icon}</div>
      <div><strong>${escapeHtml(config.title)}</strong><p>${escapeHtml(message)}</p></div>
      <button class="toast-close" type="button" aria-label="Close notification">×</button>
    `;
    region.appendChild(toast);

    const close = () => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 250);
    };
    toast.querySelector('.toast-close').addEventListener('click', close);
    setTimeout(close, 4400);
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  const renderGradeScale = (element) => {
    if (!element) return;
    element.innerHTML = GRADES.map((item) => `
      <div class="grade-item">
        <strong>${item.grade}</strong>
        <span>${item.min}–${item.max} marks</span>
      </div>
    `).join('');
  };

  const startClock = () => {
    const clock = document.getElementById('liveDateTime');
    const year = document.getElementById('currentYear');
    if (year) year.textContent = new Date().getFullYear();
    if (!clock) return;

    const update = () => {
      const now = new Date();
      clock.textContent = now.toLocaleString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };
    update();
    setInterval(update, 1000);
  };

  const initialiseTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    const preferredDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const theme = saved || (preferredDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    updateThemeButton(theme);

    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem(THEME_KEY, next);
      updateThemeButton(next);
    });
  };

  const updateThemeButton = (theme) => {
    const icon = document.querySelector('#themeToggle .theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
  };

  document.addEventListener('DOMContentLoaded', () => {
    initialiseTheme();
    startClock();
  });

  window.UNCampus = {
    STORAGE_KEY,
    GRADES,
    createId,
    getData,
    saveData,
    resetData,
    normaliseNic,
    normaliseBatch,
    initials,
    isValidNic,
    clampMarks,
    gradeFor,
    isPass,
    overallPass,
    attendancePercentage,
    showToast,
    escapeHtml,
    renderGradeScale
  };
})();
