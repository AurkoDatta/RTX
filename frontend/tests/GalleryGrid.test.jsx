import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GalleryGrid } from '../src/components/gallery/GalleryGrid.jsx';

vi.mock('../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

vi.mock('../src/services/api.js', () => ({
  fetchImageBlobUrl: vi.fn().mockResolvedValue('blob:mock-url'),
}));

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('GalleryGrid', () => {
  it('shows an empty-state message with no renders', () => {
    renderWithRouter(<GalleryGrid renders={[]} onDelete={vi.fn()} />);
    expect(screen.getByText(/no renders yet/i)).toBeInTheDocument();
  });

  it('renders one card per render with status and sample count', async () => {
    const renders = [
      {
        id: 1,
        sceneId: 5,
        status: 'completed',
        samplesCompleted: 64,
        imageUrl: '/api/renders/1/image',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        sceneId: null,
        status: 'cancelled',
        samplesCompleted: 12,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      },
    ];
    renderWithRouter(<GalleryGrid renders={renders} onDelete={vi.fn()} />);

    expect(screen.getByText(/Complete · 64 spp/)).toBeInTheDocument();
    expect(screen.getByText(/Cancelled · 12 spp/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));
  });

  it('shows an "Edit scene" link only when the render has a scene id', () => {
    const renders = [
      {
        id: 1,
        sceneId: 5,
        status: 'completed',
        samplesCompleted: 64,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        sceneId: null,
        status: 'completed',
        samplesCompleted: 64,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      },
    ];
    renderWithRouter(<GalleryGrid renders={renders} onDelete={vi.fn()} />);

    expect(screen.getAllByText('Edit scene')).toHaveLength(1);
  });

  it('calls onDelete with the render id when Delete is clicked', () => {
    const onDelete = vi.fn();
    const renders = [
      {
        id: 7,
        sceneId: null,
        status: 'completed',
        samplesCompleted: 64,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      },
    ];
    renderWithRouter(<GalleryGrid renders={renders} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(7);
  });
});
