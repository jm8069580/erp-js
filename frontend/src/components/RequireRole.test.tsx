import { describe, expect, it, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import RequireRole from './RequireRole';
import { useAuthStore } from '../store/auth.store';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderWithRouter(ui: ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/protegido']}>
      {ui}
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, restored: false });
  });

  it('redirects to login when there is no user', () => {
    renderWithRouter(
      <RequireRole roles={['ADMIN']}>
        <main>Contenido protegido</main>
      </RequireRole>,
    );

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('redirects to home when the user role is not allowed', () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        role: 'USER',
      },
      restored: false,
    });

    renderWithRouter(
      <RequireRole roles={['ADMIN', 'MANAGER']}>
        <main>Contenido protegido</main>
      </RequireRole>,
    );

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('renders children when the user role is allowed', () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        role: 'ADMIN',
      },
      restored: false,
    });

    renderWithRouter(
      <RequireRole roles={['ADMIN', 'MANAGER']}>
        <main>Contenido protegido</main>
      </RequireRole>,
    );

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/protegido');
  });
});