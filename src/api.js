// src/api.js
const API_URL = 'https://bookingdasb.onrender.com'; // Или ваш локальный URL для тестов (путь к серверу, если он на внешнем хостинге)
//const API_URL = 'https://mail.is1c.ru:8000'; //не работает - это проблема самый кринге
//const API_URL = 'http://10.27.27.91:8000'; //работает если бэк и фронт на одном компе запустить(не наодном компе тоже работает но в локалке) //const API_URL = 'http://127.0.0.1:8000';
//const API_URL = 'http://217.71.129.131:8000';// нгту но не пашет
//const API_URL = 'http://vbr1.cloud.nstu.ru:8000';// нгту но не пашет
//const API_URL = 'https://tu72wd-37-192-242-74.ru.tuna.am';
const getTelegramUserData = () => {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || { id: 123456789 }; // Заглушка для тестов (запуску вне тг)
};

const getTgId = () => {
  return getTelegramUserData().id;
};

// --- Функции для профиля пользователя ---
export const fetchUserProfile = async () => {
  const tgUser = getTelegramUserData();
  const params = new URLSearchParams({
    tg_id: tgUser.id,
  });
  if (tgUser.username) params.append('tg_username', tgUser.username);
  if (tgUser.first_name) params.append('tg_first_name', tgUser.first_name);
  if (tgUser.last_name) params.append('tg_last_name', tgUser.last_name);

  const response = await fetch(`${API_URL}/users/profile?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Ошибка загрузки профиля пользователя');
  }
  return await response.json(); // Ожидаем UserProfileResponse
};

export const updateUserProfile = async (displayName) => {
  const tgUser = getTelegramUserData();
  const response = await fetch(`${API_URL}/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tg_id: tgUser.id,
      display_name: displayName,
      // Передаем актуальные данные из Telegram, если они могли измениться
      telegram_username: tgUser.username,
      telegram_first_name: tgUser.first_name,
      telegram_last_name: tgUser.last_name,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Ошибка обновления профиля');
  }
  return await response.json(); // Ожидаем UserProfileResponse
};


// --- Основные функции бронирования ---
export const fetchOffices = async () => {
  const response = await fetch(`${API_URL}/offices`);
  if (!response.ok) throw new Error('Ошибка загрузки офисов');
  return await response.json();
};

export const fetchDesks = async (officeId, date) => {
  const dateStr = date.toISOString().split('T')[0];
  const response = await fetch(`${API_URL}/desks/${officeId}?date_str=${dateStr}`); 
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Ошибка загрузки столов');
  }
  const desks = await response.json();
  // Ответ теперь содержит user_display_name вместо tg_id в availability_slots
  // { id, ..., availability_slots: { AM: {status, user_display_name}, PM: {status, user_display_name} } }
  return desks; 
};

export const bookDesk = async (deskId, date, timeSlot) => {
  const tgUser = getTelegramUserData();
  const response = await fetch(`${API_URL}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      desk_id: parseInt(deskId),
      tg_id: tgUser.id,
      booking_date: date.toISOString().split('T')[0],
      time_slot: timeSlot,
      // Передаем данные Telegram для get_or_create_user на бэкенде
      telegram_username: tgUser.username,
      telegram_first_name: tgUser.first_name,
      telegram_last_name: tgUser.last_name,
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка бронирования');
  }
  // Бэкенд теперь возвращает BookingResponse с user_display_name
  return await response.json(); 
};

export const fetchUserBookings = async (startDate = null, endDate = null) => {
  let url = `${API_URL}/my-bookings?tg_id=${getTgId()}`;
  if (startDate) url += `&start_date=${startDate.toISOString().split('T')[0]}`;
  if (endDate) url += `&end_date=${endDate.toISOString().split('T')[0]}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Ошибка загрузки бронирований');
  // Бэкенд возвращает BookingResponse с user_display_name
  return await response.json(); 
};

export const cancelUserBooking = async (bookingId) => {
  const response = await fetch(`${API_URL}/cancel-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_id: parseInt(bookingId),
      tg_id: getTgId() // tg_id нужен для проверки прав на отмену
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка отмены бронирования');
  }
  return true;
};

// --- Админские функции ---
// Передаем tg_id админа как параметр запроса
const getAdminTgIdParam = () => `tg_id_admin=${getTgId()}`;

export const addNewDesk = async (officeId, deskName) => {
  const response = await fetch(`${API_URL}/admin/add-desk?${getAdminTgIdParam()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      office_id: parseInt(officeId),
      desk_name: deskName,
      // tg_id убран из тела, так как передается в параметрах для проверки админа
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка добавления стола');
  }
  return await response.json();
};

export const deleteDesk = async (deskId) => {
  const response = await fetch(`${API_URL}/admin/remove-desk?${getAdminTgIdParam()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      desk_id: parseInt(deskId),
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка удаления стола');
  }
  return true;
};

export const addNewOffice = async (officeName) => {
  const response = await fetch(`${API_URL}/admin/add-office?${getAdminTgIdParam()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: officeName,
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка добавления офиса');
  }
  return await response.json();
};

export const deleteOffice = async (officeId) => {
  const response = await fetch(`${API_URL}/admin/remove-office?${getAdminTgIdParam()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      office_id: parseInt(officeId),
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка удаления офиса');
  }
  return true;
};

export const fetchAdminDesks = async () => {
  const url = `${API_URL}/admin/desks?${getAdminTgIdParam()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Ошибка загрузки столов для админа');
  // Ответ AdminDeskResponse не содержит status, но содержит office_name
  return await response.json();
};