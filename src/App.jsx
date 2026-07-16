import { useState, useEffect } from 'react';
import { Moon, Sun, Plus, CheckCircle2, Wind, AlertTriangle, Trash2, X } from 'lucide-react';
import { parseEvent } from './utils';

function App() {
  const [theme, setTheme] = useState('light');
  const [inputValue, setInputValue] = useState('');
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const parsed = parseEvent(inputValue);
    
    const newEvent = {
      id: Date.now(),
      title: parsed.title,
      timeText: parsed.timeText,
      timestamp: parsed.timestamp,
      endTimestamp: parsed.endTimestamp,
      isImportant: parsed.isImportant,
      completed: false
    };

    // Detección proactiva de choques
    let isOverlap = false;
    let conflictingTitle = '';

    for (let e of events) {
      if (newEvent.endTimestamp && e.endTimestamp) {
          if (newEvent.timestamp < e.endTimestamp && newEvent.endTimestamp > e.timestamp) {
              isOverlap = true; conflictingTitle = e.title; break;
          }
      } else if (newEvent.endTimestamp && !e.endTimestamp) {
          if (e.timestamp >= newEvent.timestamp && e.timestamp <= newEvent.endTimestamp) {
              isOverlap = true; conflictingTitle = e.title; break;
          }
      } else if (!newEvent.endTimestamp && e.endTimestamp) {
          if (newEvent.timestamp >= e.timestamp && newEvent.timestamp <= e.endTimestamp) {
              isOverlap = true; conflictingTitle = e.title; break;
          }
      } else {
          // Si ninguno tiene rango o solo son puntos fijos, checar un margen de 15 mins
          if (Math.abs(newEvent.timestamp - e.timestamp) < 15 * 60 * 1000) {
              isOverlap = true; conflictingTitle = e.title; break;
          }
      }
    }

    setEvents(prev => [...prev, newEvent]);
    setInputValue('');

    if (isOverlap) {
      if (toast && toast.timeoutId) clearTimeout(toast.timeoutId);
      const timeoutId = setTimeout(() => setToast(null), 7000);
      setToast({ 
         event: newEvent, 
         timeoutId, 
         message: `⚠️ Creado, pero choca con: "${conflictingTitle}"`,
         type: 'warning',
         actionType: 'creado'
      });
    }
  };

  const removeEvent = (id, actionType = 'completado') => {
    const eventToRemove = events.find(e => e.id === id);
    if (!eventToRemove) return;

    // Limpiar timeout anterior si existe
    if (toast && toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }

    setEvents(events.filter(e => e.id !== id));
    
    // Configurar nuevo toast para deshacer (5 segundos)
    const timeoutId = setTimeout(() => {
      setToast(null);
    }, 5000);

    setToast({ event: eventToRemove, timeoutId, message: `Evento ${actionType}`, actionType });
  };

  const undoAction = () => {
    if (toast && toast.event) {
      if (toast.actionType === 'creado') {
        // Deshacer creación: eliminarlo
        setEvents(prev => prev.filter(e => e.id !== toast.event.id));
      } else {
        // Deshacer eliminación/completado: restaurarlo
        setEvents(prev => [...prev, toast.event]);
      }
      clearTimeout(toast.timeoutId);
      setToast(null);
    }
  };

  const closeToast = () => {
    if (toast && toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    setToast(null);
  };

  // Ordenar los eventos cronológicamente
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const activeEvent = sortedEvents.length > 0 ? sortedEvents[0] : null;
  const upcomingEvents = sortedEvents.length > 1 ? sortedEvents.slice(1) : [];

  // Lógica de Agrupación Temporal
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const grouped = { hoy: [], manana: [], futuro: [] };
  
  upcomingEvents.forEach(ev => {
      const evDate = new Date(ev.timestamp);
      evDate.setHours(0,0,0,0);
      
      if (evDate.getTime() === today.getTime()) {
          grouped.hoy.push(ev);
      } else if (evDate.getTime() === tomorrow.getTime()) {
          grouped.manana.push(ev);
      } else {
          grouped.futuro.push(ev);
      }
  });

  const renderTimelineEvent = (ev, index, array) => {
    // Alerta si la diferencia de tiempo con el evento anterior es menor a 15 min
    const isOverlap = index > 0 && Math.abs(ev.timestamp - array[index - 1].timestamp) < 15 * 60 * 1000;
    
    return (
      <div key={ev.id} className={`timeline-item ${ev.isImportant ? 'important' : ''} ${isOverlap ? 'overlap' : ''}`}>
        <div className="timeline-marker"></div>
        <div className="timeline-content" style={{ width: '100%' }}>
          <span className="timeline-text" style={{ width: '100%' }}>
            {ev.isImportant && <span className="important-badge">!</span>}
            {isOverlap && <AlertTriangle size={14} className="overlap-icon" />}
            {ev.title}
            <button className="delete-event-btn" onClick={() => removeEvent(ev.id, 'eliminado')} title="Eliminar evento">
              <Trash2 size={16} />
            </button>
          </span>
          <span className="timeline-time">{ev.timeText}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="brand-title">Flow.</h1>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {activeEvent ? (
        <main className="focus-view">
          <div className="focus-label">
            <div className="pulse-dot"></div>
            Enfocado en
          </div>
          <h2 className="focus-task">{activeEvent.title}</h2>
          <p className="focus-time">{activeEvent.timeText}</p>
          <button className="complete-btn" onClick={() => removeEvent(activeEvent.id, 'completado')}>
            <CheckCircle2 size={18} />
            Completar
          </button>
        </main>
      ) : (
        <main className="empty-state">
          <Wind size={48} />
          <h3>Todo despejado</h3>
          <p>Añade algo a tu hilo para comenzar.</p>
        </main>
      )}

      {upcomingEvents.length > 0 && (
        <section className="timeline-section">
          
          {grouped.hoy.length > 0 && (
            <details className="timeline-group" open>
              <summary className="timeline-group-title">Hoy</summary>
              <div className="timeline-list">
                {grouped.hoy.map(renderTimelineEvent)}
              </div>
            </details>
          )}

          {grouped.manana.length > 0 && (
            <details className="timeline-group" open>
              <summary className="timeline-group-title">Mañana</summary>
              <div className="timeline-list">
                {grouped.manana.map(renderTimelineEvent)}
              </div>
            </details>
          )}

          {grouped.futuro.length > 0 && (
            <details className="timeline-group">
              <summary className="timeline-group-title">Más Adelante ({grouped.futuro.length})</summary>
              <div className="timeline-list">
                {grouped.futuro.map(renderTimelineEvent)}
              </div>
            </details>
          )}
          
        </section>
      )}

      <form className="input-area" onSubmit={handleInputSubmit}>
        <div className="input-container">
          <input
            type="text"
            className="smart-input"
            placeholder="Ej. Leer un libro a las 8pm"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="submit-btn" aria-label="Agregar al hilo">
            <Plus size={20} />
          </button>
        </div>
      </form>

      {toast && (
        <div className={`toast-container ${toast.type === 'warning' ? 'warning' : ''}`}>
          <span className="toast-message">{toast.message}</span>
          <button className="undo-btn" onClick={undoAction}>Deshacer</button>
          <div className="toast-divider"></div>
          <button className="close-toast-btn" onClick={closeToast} title="Cerrar">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
