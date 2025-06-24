// admin.js
document.querySelectorAll('.star-toggle').forEach(el =>
  el.addEventListener('click', () => el.classList.toggle('active'))
);
// 2) Подтверждение одной заявки
document.querySelectorAll('.card.new .btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const card = btn.closest('.card');
    // обновляем статус
    const statusEl = card.querySelector('.status');
    statusEl.classList.replace('pending','confirmed');
    statusEl.textContent = 'Подтверждено';

    // снимаем рамку new
    card.classList.remove('new');

    // перемещаем в секцию подтверждённых
    const confirmedGrid = document.querySelector('h2.confirmed + .grid');
    confirmedGrid.appendChild(card);
  })
);
// 3) Подтверждение выбранных заявок
document.querySelector('.btn-confirm-all').addEventListener('click', () => {
  const confirmedGrid = document.querySelector('h2.confirmed + .grid');
  document.querySelectorAll('.card.new .checkbox:checked').forEach(input => {
    const card = input.closest('.card');
    // обновляем статус
    const statusEl = card.querySelector('.status');
    statusEl.classList.replace('pending','confirmed');
    statusEl.textContent = 'Подтверждено';
    // снимаем класс new и стили задержки, сбрасываем checkbox
    card.classList.remove('new');
    input.checked = false;
    // перемещаем в раздел подтверждённых
    confirmedGrid.appendChild(card);
  });
});
// 4) Фильтрация заявок
const filterSelect = document.querySelector('.filter');
filterSelect.addEventListener('change', () => {
  const mode = filterSelect.value;
  document.querySelectorAll('.card').forEach(card => {
    let show = false;
    if (mode.includes('Все заявки')) {
      show = true;
    } else if (mode.includes('Только новые')) {
      show = card.classList.contains('new');
    } else if (mode.includes('Только старые')) {
      // карточки со старыми отмечены наличием .delayed
      show = !!card.querySelector('.delayed');
    } else if (mode.includes('Только подтверждённые')) {
      show = card.querySelector('.status.confirmed') !== null;
    }
    card.style.display = show ? '' : 'none';
  });
});
// 5) Обновление счетчиков в шапке
function updateSummary() {
  const all = document.querySelectorAll('.card').length;
  const pending = document.querySelectorAll('.card.new').length;
  const confirmed = document.querySelectorAll('.card .status.confirmed').length;

  document.querySelector('.pill.total strong').textContent = all;
  document.querySelector('.pill.pending strong').textContent = pending;
  document.querySelector('.pill.confirmed strong').textContent = confirmed;
}

// Вызываем при загрузке и после любых действий
updateSummary();

// Добавить вызов после единичного подтверждения
document.querySelectorAll('.card .btn').forEach(btn =>
  btn.addEventListener('click', updateSummary)
);

// И после массового подтверждения
document.querySelector('.btn-confirm-all')
  .addEventListener('click', updateSummary);
// 6) Сохранение и восстановление состояния из localStorage
function saveState() {
  const state = Array.from(document.querySelectorAll('.card')).map(card => ({
    id: card.querySelector('.info')?.textContent.trim(),  // уникальный идентификатор, например время
    confirmed: !!card.querySelector('.status.confirmed'),
    starred: card.querySelector('.star-toggle').classList.contains('active'),
    checked: card.querySelector('.checkbox').checked
  }));
  localStorage.setItem('cardsState', JSON.stringify(state));
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem('cardsState') || '[]');
  saved.forEach(item => {
    const card = Array.from(document.querySelectorAll('.card')).find(c =>
      c.querySelector('.info')?.textContent.trim() === item.id
    );
    if (!card) return;
    const star = card.querySelector('.star-toggle');
    const box  = card.querySelector('.checkbox');
    const statusEl = card.querySelector('.status');

    if (item.starred) star.classList.add('active');
    box.checked = item.checked;

    if (item.confirmed && statusEl.classList.contains('pending')) {
      statusEl.classList.replace('pending','confirmed');
      statusEl.textContent = 'Подтверждено';
      card.classList.remove('new');
      document.querySelector('h2.confirmed + .grid').appendChild(card);
    }
  });
}

// Восстанавливаем при загрузке
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  updateSummary();
});

// Сохраняем после любых изменений
document.querySelectorAll('.star-toggle').forEach(el =>
  el.addEventListener('click', () => { saveState(); })
);
document.querySelectorAll('.card .btn').forEach(btn =>
  btn.addEventListener('click', () => { saveState(); })
);
document.querySelector('.btn-confirm-all').addEventListener('click', () => {
  saveState();
});
// 7) Перемещать отмеченные звёздой карточки наверх секции
function updateFavoritesOrder() {
  document.querySelectorAll('h2').forEach(section => {
    const grid = section.nextElementSibling;
    const cards = Array.from(grid.children);
    // сначала – starred, потом остальные
    cards
      .filter(card => card.querySelector('.star-toggle').classList.contains('active'))
      .forEach(card => grid.insertBefore(card, grid.firstChild));
  });
}

// Вызов после клика по звезде и после загрузки/восстановления состояния
document.querySelectorAll('.star-toggle').forEach(el =>
  el.addEventListener('click', () => {
    updateFavoritesOrder();
    saveState();
  })
);

// При загрузке страницы:
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  updateSummary();
  updateFavoritesOrder();
});
// 9) Collapse/Expand карточки
document.querySelectorAll('.card .header').forEach(header => {
  header.addEventListener('click', () => {
    header.closest('.card').classList.toggle('collapsed');
  });
});
// 10) Поиск по имени
const searchInput = document.querySelector('.search');
searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim().toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    const name = card.querySelector('.header').textContent.trim().toLowerCase();
    card.style.display = name.includes(term) ? '' : 'none';
  });
});
// 11) Сброс фильтра и поиска по ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // очистить строку поиска
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    // сбросить фильтр в селекте
    filterSelect.selectedIndex = 0;
    filterSelect.dispatchEvent(new Event('change'));
  }
});
// 12) Сортировка по дате (по возрастанию/убыванию)
const sortBtn = document.createElement('button');
sortBtn.textContent = '↕ Сортировать по дате';
sortBtn.style.cssText = 'margin-left:16px;padding:10px 14px;border-radius:12px;border:1px solid #333;background:#1a1a1a;color:#fff;cursor:pointer;';
document.querySelector('.summary-card').appendChild(sortBtn);

let asc = true;
sortBtn.addEventListener('click', () => {
  const sections = ['.grid']; // применяем ко всем grid
  sections.forEach(sel => {
    const grid = document.querySelector(sel);
    const cards = Array.from(grid.children);
    cards.sort((a, b) => {
      const da = new Date(a.querySelector('.info').textContent);
      const db = new Date(b.querySelector('.info').textContent);
      return asc ? da - db : db - da;
    });
    cards.forEach(c => grid.appendChild(c));
  });
  asc = !asc;
  sortBtn.textContent = asc ? '↑ Сортировать по дате' : '↓ Сортировать по дате';
});
// 13) Экспорт в CSV
const exportBtn = document.createElement('button');
exportBtn.textContent = '💾 Экспорт в CSV';
exportBtn.style.cssText = 'margin-left:8px;padding:10px 14px;border-radius:12px;border:1px solid #333;background:#1a1a1a;color:#fff;cursor:pointer;';
document.querySelector('.summary-card').appendChild(exportBtn);

exportBtn.addEventListener('click', () => {
  const rows = [['Имя','Время','Статус']];
  document.querySelectorAll('.card').forEach(card => {
    const name = card.querySelector('.header').textContent.trim();
    const time = card.querySelector('.info').textContent.trim();
    const status = card.querySelector('.status').textContent.trim();
    rows.push([name, time, status]);
  });
  const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'zayavki.csv';
  link.click();
});
// Создание кнопки «Сбросить всё»
const resetBtn = document.createElement('button');
resetBtn.textContent = '🔄 Сбросить всё';
resetBtn.style.cssText = 'margin-left:8px;padding:10px 14px;border-radius:12px;border:1px solid #f33;background:#1a1a1a;color:#f33;cursor:pointer;';
document.querySelector('.summary-card').appendChild(resetBtn);

resetBtn.addEventListener('click', () => {
  if (confirm('Вы уверены, что хотите сбросить все данные?')) {
    localStorage.clear();
    location.reload();
  }
});
// 15) Горячие клавиши: Enter — подтвердить карточку, Ctrl+Enter — массовое подтверждение
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    document.querySelector('.btn-confirm-all').click();
  } else if (e.key === 'Enter') {
    const active = document.activeElement;
    const card = active.closest && active.closest('.card');
    if (card) {
      const btn = card.querySelector('.btn');
      if (btn) btn.click();
    }
  }
});
const summary = document.querySelector('.summary-card');

// сортировка
const sortBtn = document.createElement('button');
sortBtn.textContent = '↕ Сортировать по дате';
sortBtn.classList.add('action-btn');
summary.appendChild(sortBtn);
// ... ваш код сортировки остаётся без изменений ...

// экспорт
const exportBtn = document.createElement('button');
exportBtn.textContent = '💾 Экспорт в CSV';
exportBtn.classList.add('action-btn');
summary.appendChild(exportBtn);
// ... ваш код экспорта без изменений ...

// сброс
const resetBtn = document.createElement('button');
resetBtn.textContent = '🔄 Сбросить всё';
resetBtn.classList.add('action-btn','action-btn--danger');
summary.appendChild(resetBtn);
resetBtn.addEventListener('click', () => {
  if (confirm('Вы уверены, что хотите сбросить все данные?')) {
    localStorage.clear();
    location.reload();
  }
});
