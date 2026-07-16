import { expect, test, describe } from 'vitest';
import { parseEvent } from './utils';

describe('NLP Parser (parseEvent)', () => {

  test('Debería extraer título limpio y etiqueta de tiempo', () => {
    const result = parseEvent('reunion de marketing mañana a las 5pm');
    expect(result.title).toBe('reunion de marketing');
    expect(result.isAllDay).toBe(false);
    expect(result.timeText).toContain('5:00'); // Debería contener la hora
  });

  test('Debería manejar eventos sin hora (Todo el día)', () => {
    const result = parseEvent('visitar al dentista el 15 de agosto');
    expect(result.title).toBe('visitar al dentista');
    expect(result.isAllDay).toBe(true);
  });

  test('Debería detectar etiquetas de importancia (#importante o !)', () => {
    const result1 = parseEvent('! llamada urgente a las 9pm');
    expect(result1.title).toBe('llamada urgente');
    expect(result1.isImportant).toBe(true);

    const result2 = parseEvent('cita medica #urgente mañana');
    expect(result2.title).toBe('cita medica');
    expect(result2.isImportant).toBe(true);
  });

  test('Debería manejar correctamente intervalos horarios complejos (El bug de 2004)', () => {
    const result = parseEvent('partido de futbol el 16 de agosto de 4 a 6 pm');
    expect(result.title).toBe('partido de futbol');
    expect(result.timeText).toContain('4:00');
    expect(result.timeText).toContain('6:00');
    expect(result.endTimestamp).toBeGreaterThan(result.timestamp); // El fin es mayor al inicio
  });

  test('Debería limpiar conectores extraños', () => {
    const result = parseEvent('ir al puesto de trabajo el dia de hoy a las 9:00pm');
    expect(result.title).toBe('ir al puesto de trabajo');
  });

});
