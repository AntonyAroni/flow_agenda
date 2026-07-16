import { test, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App Flow UI', () => {

  test('Debería poder crear un nuevo evento básico', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByPlaceholderText(/Ej. Leer un libro/i);
    const addButton = screen.getByRole('button', { name: /agregar al hilo/i });

    // El usuario escribe un evento
    await user.type(input, 'Cenar con el equipo a las 8pm');
    await user.click(addButton);

    // El evento debería aparecer renderizado
    const eventTitle = await screen.findByText('Cenar con el equipo');
    expect(eventTitle).toBeDefined();
    
    // Debería vaciarse el input
    expect(input.value).toBe('');
  });

  test('Debería mostrar la advertencia naranja de solapamiento', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByPlaceholderText(/Ej. Leer un libro/i);
    const addButton = screen.getByRole('button', { name: /agregar al hilo/i });

    // Evento 1
    await user.type(input, 'Reunion 1 mañana a las 3pm');
    await user.click(addButton);

    // Evento 2 (Choque intencional a la misma hora)
    await user.type(input, 'Llamada secreta mañana a las 3pm');
    await user.click(addButton);

    // El Toast naranja de advertencia debe saltar
    const warningText = await screen.findByText(/choca con: "Reunion 1"/i);
    expect(warningText).toBeDefined();

    // Podemos Deshacerlo
    const undoButton = screen.getByRole('button', { name: /Deshacer/i });
    await user.click(undoButton);

    // El Toast desaparece
    expect(screen.queryByText(/choca con:/i)).toBeNull();
  });

});
