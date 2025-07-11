import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchOffices, 
  fetchAdminDesks,
  addNewDesk,
  deleteDesk,
  addNewOffice,
  deleteOffice
} from '../api';

const AdminTab = () => {
  const [offices, setOffices] = useState([]);
  const [allDesks, setAllDesks] = useState([]);
  
  const [addDeskOfficeId, setAddDeskOfficeId] = useState('');
  const [addDeskName, setAddDeskName] = useState('');
  
  const [deleteDeskId, setDeleteDeskId] = useState('');
  
  const [addOfficeName, setAddOfficeName] = useState('');
  const [deleteOfficeId, setDeleteOfficeId] = useState('');

  const [adminMessage, setAdminMessage] = useState({ text: '', type: 'info', visible: false });

  const showAdminMessage = (text, type = 'success', duration = 5000) => {
    setAdminMessage({ text, type, visible: true });
    setTimeout(() => {
      setAdminMessage(prev => ({ ...prev, visible: false }));
    }, duration);
  };

  const loadAdminData = useCallback(async () => {
    try {
      const officesData = await fetchOffices();
      setOffices(officesData);
      const desksData = await fetchAdminDesks();
      setAllDesks(desksData);
    } catch (error) {
      showAdminMessage(`Ошибка загрузки данных: ${error.message}`, 'danger');
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleAddDesk = async () => {
    if (!addDeskOfficeId) {
      showAdminMessage('Выберите офис для добавления стола', 'warning');
      return;
    }
    if (!addDeskName.trim()) {
      showAdminMessage('Введите название стола', 'warning');
      return;
    }
    try {
      const result = await addNewDesk(addDeskOfficeId, addDeskName.trim());
      showAdminMessage(`Стол "${addDeskName.trim()}" добавлен (ID: ${result.id})`, 'success');
      setAddDeskName('');
      // setAddDeskOfficeId(''); // Оставляем офис выбранным для удобства
      loadAdminData(); // Обновляем списки
    } catch (error) {
      showAdminMessage(`Ошибка добавления стола: ${error.message}`, 'danger');
    }
  };

  const handleDeleteDesk = async () => {
    if (!deleteDeskId) {
      showAdminMessage('Выберите стол для удаления', 'warning');
      return;
    }
    if (!window.confirm('Удалить этот стол? Все бронирования будут отменены.')) return;
    try {
      const selectedDesk = allDesks.find(d => d.id.toString() === deleteDeskId);
      await deleteDesk(deleteDeskId);
      showAdminMessage(`Стол "${selectedDesk?.name || `ID ${deleteDeskId}`}" удален`, 'success');
      setDeleteDeskId('');
      loadAdminData();
    } catch (error) {
      showAdminMessage(`Ошибка удаления стола: ${error.message}`, 'danger');
    }
  };

  const handleAddOffice = async () => {
    if (!addOfficeName.trim()) {
      showAdminMessage('Введите название офиса', 'warning');
      return;
    }
    try {
      const result = await addNewOffice(addOfficeName.trim());
      showAdminMessage(`Офис "${addOfficeName.trim()}" добавлен (ID: ${result.id})`, 'success');
      setAddOfficeName('');
      loadAdminData();
    } catch (error) {
      showAdminMessage(`Ошибка добавления офиса: ${error.message}`, 'danger');
    }
  };

  const handleDeleteOffice = async () => {
    if (!deleteOfficeId) {
      showAdminMessage('Выберите офис для удаления', 'warning');
      return;
    }
    if (!window.confirm('Удалить этот офис? Сначала удалите все столы в нем (бэкенд может это проверить).')) return;
    try {
      const selectedOffice = offices.find(o => o.id.toString() === deleteOfficeId);
      await deleteOffice(deleteOfficeId);
      showAdminMessage(`Офис "${selectedOffice?.name || `ID ${deleteOfficeId}`}" удален`, 'success');
      setDeleteOfficeId('');
      loadAdminData();
    } catch (error) {
      showAdminMessage(`Ошибка удаления офиса: ${error.message}`, 'danger');
    }
  };


  return (
    <>
      {adminMessage.visible && (
        <div className={`alert alert-${adminMessage.type} alert-dismissible fade show`} role="alert">
          {adminMessage.text}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setAdminMessage(prev => ({ ...prev, visible: false }))} 
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h2 className="h5 mb-0">Управление столами</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6 card-title">Добавить стол</h3>
                  <div className="mb-3">
                    <label htmlFor="admin-office-select" className="form-label">Офис:</label>
                    <select 
                      id="admin-office-select" 
                      className="form-select"
                      value={addDeskOfficeId}
                      onChange={(e) => setAddDeskOfficeId(e.target.value)}
                    >
                      <option value="">-- Выберите офис --</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.id}>{office.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="desk-name-input" className="form-label">Название стола:</label>
                    <input 
                      type="text" 
                      id="desk-name-input" 
                      className="form-control" 
                      placeholder="Введите название"
                      value={addDeskName}
                      onChange={(e) => setAddDeskName(e.target.value)}
                    />
                  </div>
                  <button 
                    id="add-desk-button" 
                    className="btn btn-success w-100"
                    onClick={handleAddDesk}
                  >
                    Добавить стол
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6 card-title">Удалить стол</h3>
                  <div className="mb-3">
                    <label htmlFor="desk-select-delete" className="form-label">Стол:</label>
                    <select 
                      id="desk-select-delete" 
                      className="form-select"
                      value={deleteDeskId}
                      onChange={(e) => setDeleteDeskId(e.target.value)}
                      disabled={allDesks.length === 0}
                    >
                      <option value="">{allDesks.length > 0 ? '-- Выберите стол --' : '-- Нет столов --'}</option>
                      {allDesks.map(desk => (
                        <option key={desk.id} value={desk.id}>
                          {desk.office_name} - {desk.name || `Стол ${desk.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button 
                    id="remove-desk-button" 
                    className="btn btn-danger w-100"
                    onClick={handleDeleteDesk}
                    disabled={!deleteDeskId || allDesks.length === 0}
                  >
                    Удалить стол
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h2 className="h5 mb-0">Управление офисами</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6 card-title">Добавить офис</h3>
                  <div className="mb-3">
                    <label htmlFor="office-name-input" className="form-label">Название офиса:</label>
                    <input 
                      type="text" 
                      id="office-name-input" 
                      className="form-control" 
                      placeholder="Введите название"
                      value={addOfficeName}
                      onChange={(e) => setAddOfficeName(e.target.value)}
                    />
                  </div>
                  <button 
                    id="add-office-button" 
                    className="btn btn-success w-100"
                    onClick={handleAddOffice}
                  >
                    Добавить офис
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6 card-title">Удалить офис</h3>
                  <div className="mb-3">
                    <label htmlFor="office-select-delete" className="form-label">Офис:</label>
                    <select 
                      id="office-select-delete" 
                      className="form-select"
                      value={deleteOfficeId}
                      onChange={(e) => setDeleteOfficeId(e.target.value)}
                      disabled={offices.length === 0}
                    >
                      <option value="">{offices.length > 0 ? '-- Выберите офис --' : '-- Нет офисов --'}</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.id}>{office.name}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    id="remove-office-button" 
                    className="btn btn-danger w-100"
                    onClick={handleDeleteOffice}
                    disabled={!deleteOfficeId || offices.length === 0}
                  >
                    Удалить офис
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminTab;