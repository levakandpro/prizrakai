document.addEventListener('DOMContentLoaded', () => {
  fetch('/get_requests')
    .then(res => res.json())
    .then(data => {
      const latestByEmail = {};
      data.forEach(entry => {
        if (!entry.time && !entry.date) return;

        const t = new Date(entry.time || entry.date).getTime();
        const current = latestByEmail[entry.email];
        const currentTime = current ? new Date(current.time || current.date).getTime() : 0;

        if (!current || t > currentTime) {
          latestByEmail[entry.email] = entry;
        }
      });
      data = Object.values(latestByEmail);

      const newGrid = document.getElementById("cards-pending");
      const confirmedGrid = document.getElementById("cards-confirmed");
      newGrid.innerHTML = "";
      confirmedGrid.innerHTML = "";

      data.forEach(entry => {
        const isConfirmed = entry.status === 'confirmed';

        const createdAt = entry.time ? new Date(entry.time) : null;
        const now = new Date();
        const minutesAgo = createdAt ? Math.floor((now - createdAt) / 60000) : null;
        const agoText = minutesAgo !== null ? `${minutesAgo} мин назад` : '';

        const card = document.createElement('div');
        card.className = 'card' + (isConfirmed ? '' : ' new');

        const isAdmin = entry.email === "natopchane@gmail.com";

        card.innerHTML = `
          <div class="meta">
            <div class="email">${entry.email}</div>
            <div class="time">${entry.time ? new Date(entry.time).toLocaleString('ru-RU') : ''} ${agoText ? `— 🕓 ${agoText}` : ''}</div>
            <div class="status ${entry.status}">${entry.status === 'confirmed' ? '✅ Подтверждено' : '🕒 Ожидает'}</div>
          </div>
          ${entry.filename ? `<img src="/static/uploads/${entry.filename}" class="screenshot">` : ''}
          <div class="actions">
            ${!isConfirmed && !isAdmin ? `<input type="checkbox" class="checkbox">` : ''}
            ${!isConfirmed && !isAdmin ? `<button class="btn btn-confirm">Подтвердить</button>` : ''}
            <button class="btn btn-delete">🗑 Удалить</button>
          </div>
        `;

        (isConfirmed ? confirmedGrid : newGrid).appendChild(card);
      });

      updateSummary();
    });
});

// Подтверждение одной заявки

document.addEventListener('click', (e) => {
  if (!e.target.matches('.btn-confirm')) return;

  const card = e.target.closest('.card');
  const filename = card.querySelector('img')?.src.split('/').pop();

  fetch('/confirm_payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  })
  .then(res => res.json())
  .then(res => {
    if (!res.success) {
      alert("❌ Ошибка при подтверждении");
      return;
    }

    card.querySelectorAll('.btn-confirm, .checkbox').forEach(el => el.remove());

    const statusEl = card.querySelector('.status');
    statusEl.textContent = '✅ Подтверждено';
    statusEl.classList.remove('pending');
    statusEl.classList.add('confirmed');

    card.classList.remove('new');

    const confirmedGrid = document.getElementById("cards-confirmed");
    confirmedGrid.appendChild(card);

    updateSummary();
  });
});

// Подтверждение всех выбранных

document.querySelector('.btn-confirm-all').addEventListener('click', () => {
  const confirmedGrid = document.getElementById("cards-confirmed");
  document.querySelectorAll('.card.new .checkbox:checked').forEach(input => {
    const card = input.closest('.card');
    const filename = card.querySelector('img')?.src.split('/').pop();

    fetch('/confirm_payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    })
    .then(res => res.json())
    .then(res => {
      if (!res.success) return;

      card.classList.remove('new');
      card.querySelector('.status').textContent = '✅ Подтверждено';
      card.querySelector('.status').classList.remove('pending');
      card.querySelector('.status').classList.add('confirmed');
      card.querySelector('.checkbox')?.remove();
      card.querySelector('.btn-confirm')?.remove();
      confirmedGrid.appendChild(card);
      updateSummary();
    });
  });
});

// Удаление заявки

document.addEventListener('click', e => {
  if (!e.target.matches('.btn-delete')) return;
  const card = e.target.closest('.card');
  const filename = card.querySelector('img')?.src.split('/').pop();
  if (!confirm('Удалить эту заявку?')) return;

  fetch('/delete_payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  })
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        card.remove();
        updateSummary();
        alert('✅ Заявка удалена');
      } else {
        alert('❌ Ошибка при удалении');
      }
    });
});

function updateSummary() {
  const total = document.querySelectorAll('.card').length;
  const pending = document.querySelectorAll('.card.new').length;
  const confirmed = total - pending;

  document.getElementById('count-total').textContent = total;
  document.getElementById('count-pending').textContent = pending;
  document.getElementById('count-confirmed').textContent = confirmed;
}