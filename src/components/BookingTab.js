// src/components/BookingTab.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { fetchOffices, fetchDesks, bookDesk } from '../api';
import { UserContext } from '../App';

const BookingTab = () => {
    const currentUser = useContext(UserContext);
    const [offices, setOffices] = useState([]);
    const [selectedOfficeId, setSelectedOfficeId] = useState('');

    // --- ИСПРАВЛЕННЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДАТАМИ ---
    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0 (Вс) - 6 (Сб)
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Коррекция для Вс (day === 0)
        return new Date(d.setDate(diff));
    };

    const getInitialSelectedDate = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 (Вс) - 6 (Сб)

        // Если сегодня Сб (6) или Вс (0), переносим selectedDate на следующий понедельник
        if (dayOfWeek === 6) { // Суббота
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + 2);
            return getMonday(nextMonday); // Убедимся, что это понедельник
        } else if (dayOfWeek === 0) { // Воскресенье
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + 1);
            return getMonday(nextMonday); // Убедимся, что это понедельник
        }
        // Для будних дней оставляем текущий день, но currentWeekStart будет понедельником этой недели
        return today; 
    };
    // --- КОНЕЦ ИСПРАВЛЕННЫХ ФУНКЦИЙ ---

    // Инициализация состояний с использованием новых функций
    const initialSelectedDate = getInitialSelectedDate();
    const initialWeekStart = getMonday(initialSelectedDate); // Понедельник недели, к которой относится initialSelectedDate

    const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
    const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekStart);
    // --- КОНЕЦ ИНИЦИАЛИЗАЦИИ ---
    
    const [desks, setDesks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentDeskForModal, setCurrentDeskForModal] = useState(null);
    const [bookingTimeSlot, setBookingTimeSlot] = useState('AM');
    const [isLoadingDesks, setIsLoadingDesks] = useState(false);
    const [errorDesks, setErrorDesks] = useState('');
    const [bookingMessage, setBookingMessage] = useState({ text: '', type: '' });

    const loadOffices = useCallback(async () => {
        // ... (без изменений)
        try {
            const data = await fetchOffices();
            setOffices(data);
        } catch (error) {
            setBookingMessage({ text: `Ошибка загрузки офисов: ${error.message}`, type: 'danger' });
        }
    }, []);

    const loadDesks = useCallback(async (officeId, date) => {
        // ... (без изменений)
        if (!officeId) {
            setDesks([]);
            setErrorDesks('');
            return;
        }
        setIsLoadingDesks(true);
        setErrorDesks('');
        try {
            // Убедимся, что передаем объект Date
            const dateObj = date instanceof Date ? date : new Date(date);
            const data = await fetchDesks(officeId, dateObj);
            setDesks(data);
        } catch (error) {
            setErrorDesks(error.message || 'Ошибка загрузки столов');
            setDesks([]);
        } finally {
            setIsLoadingDesks(false);
        }
    }, []);

    useEffect(() => {
        loadOffices();
    }, [loadOffices]);

    useEffect(() => {
        if (selectedOfficeId && selectedDate) { // Добавил проверку selectedDate
            loadDesks(selectedOfficeId, selectedDate);
        } else {
            setDesks([]);
        }
    }, [selectedOfficeId, selectedDate, loadDesks]);

    const handleOfficeChange = (e) => setSelectedOfficeId(e.target.value);
    
    const handleDayClick = (date) => {
        setSelectedDate(new Date(date)); // Убедимся, что это новый объект Date
    };

    const handleWeekChange = (direction) => {
        const newWeekStartCandidate = new Date(currentWeekStart);
        newWeekStartCandidate.setDate(newWeekStartCandidate.getDate() + (direction === 'next' ? 7 : -7));
        
        // Устанавливаем currentWeekStart на понедельник этой новой недели
        const newActualWeekStart = getMonday(newWeekStartCandidate);
        setCurrentWeekStart(newActualWeekStart);

        // Устанавливаем selectedDate на первый рабочий день этой новой недели (понедельник)
        // или на текущий день, если он попадает в новую неделю и является рабочим.
        // Для простоты, всегда будем ставить на понедельник новой недели.
        let newSelectedDate = new Date(newActualWeekStart);

        // Если новая выбранная дата (понедельник) раньше сегодняшнего дня,
        // и это не текущая неделя, то может быть, стоит выбрать сегодняшний день, если он в этой неделе.
        // Но для консистентности, при переключении недель, всегда будем выбирать понедельник.
        // Если нужно более сложное поведение (например, не давать выбирать прошедшие дни), это отдельная логика.
        
        // Пропускаем выходные, если вдруг newActualWeekStart оказался не понедельником (хотя getMonday должен это обеспечить)
        // Эта логика уже не так нужна, если getMonday работает правильно.
        // if (newSelectedDate.getDay() === 0) newSelectedDate.setDate(newSelectedDate.getDate() + 1);
        // else if (newSelectedDate.getDay() === 6) newSelectedDate.setDate(newSelectedDate.getDate() + 2);
        
        setSelectedDate(newSelectedDate);
    };

    const handleOpenModal = (desk) => {
        // ... (без изменений)
        if (!currentUser || (!currentUser.display_name && !currentUser.telegram_first_name)) {
            setBookingMessage({ text: 'Пожалуйста, сначала установите ваше имя в профиле (кнопка вверху).', type: 'warning' });
            setTimeout(() => setBookingMessage({ text: '', type: '' }), 4000);
            return;
        }
        setCurrentDeskForModal(desk);
        if (desk.availability_slots.AM.status === 'free') setBookingTimeSlot('AM');
        else if (desk.availability_slots.PM.status === 'free') setBookingTimeSlot('PM');
        else setBookingTimeSlot('AM');
        setShowModal(true);
    };

    const handleBookDesk = async () => {
        // ... (без изменений)
        if (!currentDeskForModal || !bookingTimeSlot) {
            setBookingMessage({ text: 'Ошибка: Не выбран стол или время.', type: 'danger' });
            setTimeout(() => setBookingMessage({ text: '', type: '' }), 3000);
            return;
        }
        const deskId = currentDeskForModal.id;
        let bookingSuccessful = true;
        try {
            if (bookingTimeSlot === 'FULL') {
                if (currentDeskForModal.availability_slots.AM.status === 'free') {
                    await bookDesk(deskId, selectedDate, 'AM');
                } else { throw new Error('Утренний слот уже занят для бронирования на весь день.'); }
                if (currentDeskForModal.availability_slots.PM.status === 'free') {
                    await bookDesk(deskId, selectedDate, 'PM');
                } else { throw new Error('Вечерний слот уже занят. Бронь на утро была сделана, но на вечер не удалась.');}
                setBookingMessage({ text: `Стол ${currentDeskForModal.name || deskId} забронирован на весь день!`, type: 'success' });
            } else {
                await bookDesk(deskId, selectedDate, bookingTimeSlot);
                setBookingMessage({ text: `Стол ${currentDeskForModal.name || deskId} забронирован на ${bookingTimeSlot === 'AM' ? 'утро' : 'вечер'}!`, type: 'success' });
            }
        } catch (error) {
            bookingSuccessful = false;
            setBookingMessage({ text: `Ошибка бронирования: ${error.message}`, type: 'danger' });
        } finally {
            if (bookingSuccessful) {
                loadDesks(selectedOfficeId, selectedDate);
                setShowModal(false);
            }
            setTimeout(() => setBookingMessage({ text: '', type: '' }), 5000);
        }
    };

    const getDeskCardClass = (desk) => { /* ... без изменений ... */ 
        const amStatus = desk.availability_slots.AM.status;
        const pmStatus = desk.availability_slots.PM.status;
        if (amStatus === 'booked' && pmStatus === 'booked') return 'border-danger bg-danger-subtle';
        if (amStatus === 'booked' || pmStatus === 'booked') return 'border-warning bg-warning-subtle';
        return 'border-success bg-success-subtle';
    };
    
    const renderDaySelector = () => { 
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Нормализуем today для сравнения только дат

        for (let i = 0; i < 5; i++) { // Пн-Пт
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + i);
            date.setHours(0,0,0,0); // Нормализуем для сравнения

            const isTodayDate = date.toDateString() === today.toDateString();
            const isActive = date.toDateString() === selectedDate.toDateString();
            
            // Логика для отключения прошедших дней (опционально)
            // const isPast = date < today;
            // if (isPast && !isTodayDate) { // Не отображаем прошедшие дни, кроме сегодняшнего
            //     // или делаем их disabled
            // }

            days.push(
                <button
                    key={i}
                    className={`btn btn-sm flex-grow-1 ${isActive ? 'active btn-primary' : (isTodayDate ? 'btn-info' : 'btn-outline-secondary')}`}
                    onClick={() => handleDayClick(date)}
                    // disabled={isPast && !isTodayDate} // Пример отключения прошедших дней
                >
                    <div className="small">{date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()}</div>
                    <div className="fw-bold">{date.getDate()}</div>
                </button>
            );
        }
        return <div className="d-flex justify-content-between gap-1">{days}</div>;
    };

    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 4); // Пятница

    return (
        <>
            {/* ... остальная JSX разметка без изменений ... */}
            <div className="card mb-3">
                 <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label htmlFor="office-select-booking" className="form-label">Офис:</label>
                            <select id="office-select-booking" className="form-select" value={selectedOfficeId} onChange={handleOfficeChange}>
                                <option value="">-- Выберите офис --</option>
                                {offices.map(office => (<option key={office.id} value={office.id}>{office.name}</option>))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                <div id="current-week" className="text-center fw-bold small">
                                    <button onClick={() => handleWeekChange('prev')} className="btn btn-outline-secondary btn-sm me-2">←</button>
                                    <span>
                                        {currentWeekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                    </span>
                                    <button onClick={() => handleWeekChange('next')} className="btn btn-outline-secondary btn-sm ms-2">→</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="gap-2 my-3" id="day-selector">{renderDaySelector()}</div>
                </div>
            </div>

            {bookingMessage.text && (
                <div className={`alert alert-${bookingMessage.type} alert-dismissible fade show`} role="alert">
                    {bookingMessage.text}
                    <button type="button" className="btn-close" onClick={() => setBookingMessage({ text: '', type: '' })} aria-label="Close"></button>
                </div>
            )}

            {isLoadingDesks && <p>Загрузка столов...</p>}
            {errorDesks && <div className="alert alert-danger">{errorDesks} <button className="btn btn-link" onClick={() => loadDesks(selectedOfficeId, selectedDate)}>Обновить</button></div>}
             {!isLoadingDesks && !errorDesks && selectedOfficeId && desks.length === 0 && <p className="text-muted">Нет доступных столов для выбранной даты или офис пуст.</p>}
            {!isLoadingDesks && !errorDesks && !selectedOfficeId && <p className="text-muted">Выберите офис для отображения столов.</p>}


            <div className="row" id="desk-container">
                {desks.map(desk => (
                    <div key={desk.id} className="col-md-4 col-lg-3 mb-3">
                        <div
                            className={`card h-100 ${getDeskCardClass(desk)}`}
                            style={{ cursor: (desk.availability_slots.AM.status === 'free' || desk.availability_slots.PM.status === 'free') ? 'pointer' : 'default' }}
                            onClick={() => (desk.availability_slots.AM.status === 'free' || desk.availability_slots.PM.status === 'free') ? handleOpenModal(desk) : null}
                        >
                            <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-2">
                                <h5 className="card-title mb-1 h6">{desk.name || `Стол ${desk.id}`}</h5>
                                <p className="text-muted small mb-1">{desk.office_name}</p>
                                <div className="mt-1">
                                    <span className={`badge rounded-pill text-bg-${desk.availability_slots.AM.status === 'free' ? 'success' : 'danger'} me-1`}>
                                        Утро {desk.availability_slots.AM.status === 'booked' && desk.availability_slots.AM.user_display_name ? `(${desk.availability_slots.AM.user_display_name})` : ''}
                                    </span>
                                    <span className={`badge rounded-pill text-bg-${desk.availability_slots.PM.status === 'free' ? 'success' : 'danger'}`}>
                                        Вечер {desk.availability_slots.PM.status === 'booked' && desk.availability_slots.PM.user_display_name ? `(${desk.availability_slots.PM.user_display_name})` : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && currentDeskForModal && (
                <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Бронирование: {currentDeskForModal.name || `Стол ${currentDeskForModal.id}`}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className="mb-1"><strong>Дата:</strong> {selectedDate.toLocaleDateString('ru-RU')}</p>
                                <p><strong>Офис:</strong> {currentDeskForModal.office_name}</p>
                                <div className="form-check mb-2">
                                    <input
                                        className="form-check-input" type="radio" name="time-slot" id="slot-am" value="AM"
                                        checked={bookingTimeSlot === 'AM'}
                                        onChange={(e) => setBookingTimeSlot(e.target.value)}
                                        disabled={currentDeskForModal.availability_slots.AM.status !== 'free'}
                                    />
                                    <label className={`form-check-label d-block ${currentDeskForModal.availability_slots.AM.status !== 'free' ? 'text-muted' : ''}`} htmlFor="slot-am">
                                        Утро 
                                        {currentDeskForModal.availability_slots.AM.status === 'free' 
                                            ? <span className="text-success small"> (Свободно)</span>
                                            : <span className="text-danger small"> (Занято {currentDeskForModal.availability_slots.AM.user_display_name || ''})</span>
                                        }
                                    </label>
                                </div>
                                <div className="form-check mb-2">
                                    <input
                                        className="form-check-input" type="radio" name="time-slot" id="slot-pm" value="PM"
                                        checked={bookingTimeSlot === 'PM'}
                                        onChange={(e) => setBookingTimeSlot(e.target.value)}
                                        disabled={currentDeskForModal.availability_slots.PM.status !== 'free'}
                                    />
                                    <label className={`form-check-label d-block ${currentDeskForModal.availability_slots.PM.status !== 'free' ? 'text-muted' : ''}`} htmlFor="slot-pm">
                                        Вечер 
                                        {currentDeskForModal.availability_slots.PM.status === 'free' 
                                            ? <span className="text-success small"> (Свободно)</span>
                                            : <span className="text-danger small"> (Занято {currentDeskForModal.availability_slots.PM.user_display_name || ''})</span>
                                        }
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input" type="radio" name="time-slot" id="slot-full" value="FULL"
                                        checked={bookingTimeSlot === 'FULL'}
                                        onChange={(e) => setBookingTimeSlot(e.target.value)}
                                        disabled={currentDeskForModal.availability_slots.AM.status !== 'free' || currentDeskForModal.availability_slots.PM.status !== 'free'}
                                    />
                                    <label className={`form-check-label d-block ${(currentDeskForModal.availability_slots.AM.status !== 'free' || currentDeskForModal.availability_slots.PM.status !== 'free') ? 'text-muted' : ''}`} htmlFor="slot-full">
                                        Весь день
                                        {(currentDeskForModal.availability_slots.AM.status === 'free' && currentDeskForModal.availability_slots.PM.status === 'free')
                                            ? <span className="text-success small"> (Свободно)</span>
                                            : <span className="text-warning small"> (Занято частично или полностью)</span>
                                        }
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Закрыть</button>
                                <button
                                    type="button" className="btn btn-primary" onClick={handleBookDesk}
                                    disabled={ 
                                        !bookingTimeSlot || 
                                        (bookingTimeSlot === 'AM' && currentDeskForModal.availability_slots.AM.status !== 'free') ||
                                        (bookingTimeSlot === 'PM' && currentDeskForModal.availability_slots.PM.status !== 'free') ||
                                        (bookingTimeSlot === 'FULL' && (currentDeskForModal.availability_slots.AM.status !== 'free' || currentDeskForModal.availability_slots.PM.status !== 'free'))
                                    }
                                >
                                    Забронировать
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BookingTab;