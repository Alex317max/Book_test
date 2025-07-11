// src/components/MyBookingsTab.js
import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserBookings, cancelUserBooking } from '../api';

const MyBookingsTab = () => {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadUserBookings = useCallback(async () => {
    // ... (логика проверки дат остается)
    if (!fromDate || !toDate) {
      setError('Пожалуйста, выберите корректный диапазон дат.');
      setBookings([]);
      return;
    }
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);

    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      setError('Пожалуйста, выберите корректный диапазон дат.');
      setBookings([]);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage({ text: '', type: '' });
    try {
      const data = await fetchUserBookings(startDate, endDate);
      setBookings(data);
      if (data.length === 0) {
        setMessage({ text: 'Нет броней за выбранный период.', type: 'info' });
      }
    } catch (err) {
      setError(err.message || 'Ошибка загрузки бронирований');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadUserBookings();
  }, [loadUserBookings]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Вы уверены, что хотите отменить это бронирование?')) return;
    try {
      await cancelUserBooking(bookingId);
      setMessage({ text: 'Бронь успешно отменена', type: 'success' });
      loadUserBookings(); 
    } catch (err) {
      setMessage({ text: `Ошибка при отмене брони: ${err.message}`, type: 'danger' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  return (
    <>
      {/* ... (форма выбора дат и сообщения - без изменений) ... */}
      <div className="mb-3 d-flex flex-wrap gap-2 align-items-end">
        <div>
          <label htmlFor="from-date" className="form-label">С:</label>
          <input 
            type="date" 
            id="from-date" 
            className="form-control" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="to-date" className="form-label">По:</label>
          <input 
            type="date" 
            id="to-date" 
            className="form-control" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button 
          id="load-bookings-button" 
          className="btn btn-primary"
          onClick={loadUserBookings}
          disabled={isLoading}
        >
          {isLoading ? 'Загрузка...' : 'Показать'}
        </button>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({text: '', type: ''})} aria-label="Close"></button>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}


      <div id="bookings-container">
        {isLoading && bookings.length === 0 && <p>Загрузка бронирований...</p>}
        {!isLoading && !error && bookings.length > 0 && bookings.map(booking => {
          const bookingDate = new Date(booking.booking_date);
          const displayDate = new Date(bookingDate.getUTCFullYear(), bookingDate.getUTCMonth(), bookingDate.getUTCDate());
          const dateStr = isNaN(displayDate) ? 'Неверная дата' : displayDate.toLocaleDateString('ru-RU');
          
          // ОБНОВЛЕНО: Отображение time_slot
          const timeSlotDisplay = booking.time_slot === 'AM' ? 'Утро' : (booking.time_slot === 'PM' ? 'Вечер' : '');

          return (
            <div key={booking.id} className="card mb-2">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title mb-1">{booking.desk_name || `Стол #${booking.desk_id}`}</h5>
                  <p className="card-text mb-0">{dateStr} ({timeSlotDisplay})</p> {/* Добавили слот */}
                  <p className="card-text text-muted mb-0">Офис: {booking.office_name}</p>
                </div>
                <button 
                  className="btn btn-outline-danger btn-sm" 
                  onClick={() => handleCancelBooking(booking.id)}
                >
                  Отменить
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MyBookingsTab;