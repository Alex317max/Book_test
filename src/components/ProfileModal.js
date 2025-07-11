// src/components/ProfileModal.js
import React, { useState } from 'react';

const ProfileModal = ({ currentName, onSubmit, error, isInitialSetup }) => { // Добавлен проп isInitialSetup
  const [name, setName] = useState(currentName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setIsSubmitting(true);
    await onSubmit(name.trim());
    // setIsSubmitting(false); // Управление isSubmitting теперь может быть в App.js или остаться здесь
                             // Если onSubmit асинхронный и может выдать ошибку, лучше isSubmitting сбрасывать в App.js
                             // или после успешного завершения здесь. Для простоты пока оставим так.
    setIsSubmitting(false); 
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">
                {isInitialSetup ? "Добро пожаловать!" : "Редактировать имя"}
              </h5>
              {/* Кнопка закрытия отсутствует для isInitialSetup */}
              {/* {!isInitialSetup && (
                <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting}></button>
              )} */}
            </div>
            <div className="modal-body">
              <p>
                {isInitialSetup 
                  ? "Пожалуйста, укажите ваше имя. Оно будет отображаться другим пользователям при бронировании."
                  : "Введите новое имя для отображения:"
                }
              </p>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите ваше имя"
                required
                minLength="2"
                maxLength="50"
                disabled={isSubmitting}
              />
              {error && <div className="alert alert-danger mt-2 small">{error}</div>}
            </div>
            <div className="modal-footer">
              {/* Кнопка отмены отсутствует для isInitialSetup */}
              {/* {!isInitialSetup && (
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  Отмена
                </button>
              )} */}
              <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? 'Сохранение...' : 'Сохранить и продолжить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;