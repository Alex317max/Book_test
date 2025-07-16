// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import BookingTab from './components/BookingTab';
import MyBookingsTab from './components/MyBookingsTab';
import AdminTab from './components/AdminTab';
import ProfileModal from './components/ProfileModal';
import { fetchUserProfile, updateUserProfile } from './api';

export const UserContext = React.createContext(null);

const App = () => {
  const [activeTab, setActiveTab] = useState('book');
  const [currentUser, setCurrentUser] = useState(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const TG_ID_RAW = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const TG_ID = TG_ID_RAW ? parseInt(TG_ID_RAW, 10) : 123456789;
  const ADMIN_IDS = new Set([702912659, 123456789]);
  const IS_ADMIN = ADMIN_IDS.has(TG_ID);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    setProfileError('');
    setNeedsProfileSetup(false);
    setShowEditProfileModal(false);
    try {
      console.log("Fetching user profile...");
      const userProfile = await fetchUserProfile();
      console.log("User profile fetched:", userProfile);
      setCurrentUser(userProfile);
      
      // ОБНОВЛЕННАЯ ЛОГИКА: Обязательная настройка, если display_name пуст
      if (!userProfile.display_name) {
        console.log("User display_name is missing, needs setup.");
        setNeedsProfileSetup(true);
      } else {
        console.log("User display_name is present:", userProfile.display_name);
      }

    } catch (error) {
      console.error("Ошибка загрузки профиля:", error);
      setProfileError(`Не удалось загрузить профиль: ${error.message}. Попробуйте перезагрузить приложение.`);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    // Инициализируем Telegram Web App для получения актуальных данных пользователя
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        // Можно добавить задержку, если initDataUnsafe не сразу доступна
        // setTimeout(loadProfile, 100); 
        loadProfile();
    } else {
        // Если не в Telegram, или для локальной разработки
        console.warn("Telegram WebApp not found, using fallback for profile loading.");
        loadProfile();
    }
  }, [loadProfile]); // loadProfile теперь в зависимостях, но он useCallback

  const handleProfileSubmit = async (newName) => {
    setProfileError('');
    try {
      console.log("Submitting new profile name:", newName);
      const updatedProfile = await updateUserProfile(newName);
      console.log("Profile updated:", updatedProfile);
      setCurrentUser(updatedProfile);
      setNeedsProfileSetup(false); 
      setShowEditProfileModal(false);
    } catch (error) {
      console.error("Ошибка обновления профиля:", error);
      setProfileError(error.message || 'Не удалось сохранить имя. Попробуйте еще раз.');
    }
  };
  
  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  const EditProfileButton = () => (
    <button 
      className="btn btn-sm btn-outline-secondary ms-auto" 
      onClick={() => {
        setProfileError('');
        setShowEditProfileModal(true);
      }}
      title="Редактировать имя"
    >
      {currentUser?.effective_display_name || 'Профиль'} <i className="bi bi-pencil-square"></i>
    </button>
  );

  // --- Логика Рендеринга ---

  if (isLoadingProfile) {
    return (
      <div className="container py-4 text-center">
        <p>Загрузка данных пользователя...</p>
        {profileError && <div className="alert alert-danger mt-2">{profileError}</div>}
      </div>
    );
  }

  if (profileError && !currentUser) {
    return (
      <div className="container py-4 text-center">
        <div className="alert alert-danger">{profileError}</div>
        <button className="btn btn-primary" onClick={loadProfile}>Попробовать снова</button>
      </div>
    );
  }
  
  if (needsProfileSetup && currentUser) {
    return (
      <ProfileModal
        currentName={''} // При первой настройке поле имени должно быть пустым
        onSubmit={handleProfileSubmit}
        error={profileError}
        isInitialSetup={true}
      />
    );
  }

  const renderMainApp = () => (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-3">
        {currentUser && <span className="me-auto">Привет, {currentUser.effective_display_name}!</span>}
        {/* Если EditProfileButton здесь, то его объявление тоже должно быть выше или currentUser должен быть доступен */}
        {currentUser && <EditProfileButton />} 
      </div>

      <ul className="nav nav-tabs mb-4" id="bookingTabs" role="tablist">
        {/* ... ваши вкладки ... */}
        <li className="nav-item" role="presentation">
            <button className={`nav-link ${activeTab === 'book' ? 'active' : ''}`} onClick={() => handleTabClick('book')}>
              Забронировать
            </button>
        </li>
        <li className="nav-item" role="presentation">
            <button className={`nav-link ${activeTab === 'my-bookings' ? 'active' : ''}`} onClick={() => handleTabClick('my-bookings')}>
              Мои брони
            </button>
        </li>
        {IS_ADMIN && (
        <li className="nav-item" role="presentation">
            <button className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => handleTabClick('admin')}>
              Админка
            </button>
        </li>
        )}
      </ul>

      <div className="tab-content">
        {activeTab === 'book' && <div className="tab-pane fade show active"><BookingTab /></div>}
        {activeTab === 'my-bookings' && <div className="tab-pane fade show active"><MyBookingsTab /></div>}
        {IS_ADMIN && activeTab === 'admin' && <div className="tab-pane fade show active"><AdminTab /></div>}
      </div>
    </div>
  );

  if (showEditProfileModal && currentUser) {
    return (
      <>
        {/* Если модалка поверх, то фон рендерится */}
        <div style={{ opacity: 0.3, pointerEvents: 'none' }}>
          {renderMainApp()} {/* ВЫЗОВ renderMainApp */}
        </div>
        <ProfileModal
          currentName={currentUser.display_name || ''}
          onSubmit={handleProfileSubmit}
          onClose={() => {
            setShowEditProfileModal(false);
            setProfileError('');
          }}
          error={profileError}
          isInitialSetup={false}
        />
      </>
    );
  }

  if (currentUser && !needsProfileSetup) {
    return (
      <UserContext.Provider value={currentUser}>
        {renderMainApp()}
      </UserContext.Provider>
    );
  }

  return (
    <div className="container py-4 text-center">
      <p>Инициализация...</p> {/* Более общее сообщение, пока все условия не выполнятся */}
      {profileError && <div className="alert alert-danger mt-2">{profileError}</div>}
    </div>
  );
};
 
export default App;
