import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} title="Título" onClose={vi.fn()}>
        Contenido
      </Modal>,
    );

    expect(screen.queryByText('Título')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('renders title and children when open', () => {
    render(
      <Modal open={true} title="Título" onClose={vi.fn()}>
        Contenido
      </Modal>,
    );

    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal open={true} title="Título" onClose={onClose}>
        Contenido
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = render(
      <Modal open={true} title="Título" onClose={onClose}>
        Contenido
      </Modal>,
    );

    const overlay = container.querySelector('.absolute');
    expect(overlay).not.toBeNull();

    await user.click(overlay as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});