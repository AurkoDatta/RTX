import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectListEditor } from '../src/components/scene-editor/ObjectListEditor.jsx';
import { defaultObject } from '../src/utils/sceneSchema.js';

describe('ObjectListEditor', () => {
  it('shows an empty-state message with no objects', () => {
    render(<ObjectListEditor objects={[]} onChange={vi.fn()} maxObjects={5} />);
    expect(screen.getByText(/no objects yet/i)).toBeInTheDocument();
  });

  it('adds a sphere when the add-sphere button is clicked', () => {
    const onChange = vi.fn();
    render(<ObjectListEditor objects={[]} onChange={onChange} maxObjects={5} />);

    fireEvent.click(screen.getByText('+ Sphere'));

    expect(onChange).toHaveBeenCalledOnce();
    const [newObjects] = onChange.mock.calls[0];
    expect(newObjects).toHaveLength(1);
    expect(newObjects[0].type).toBe('sphere');
  });

  it('adds a point light with an emissive material via the quick-add control', () => {
    const onChange = vi.fn();
    render(<ObjectListEditor objects={[]} onChange={onChange} maxObjects={5} />);

    fireEvent.click(screen.getByText('+ Point light'));

    const [newObjects] = onChange.mock.calls[0];
    expect(newObjects[0].type).toBe('sphere');
    expect(newObjects[0].material.type).toBe('emissive');
  });

  it('removes an object when its Remove button is clicked', () => {
    const onChange = vi.fn();
    const objects = [defaultObject('sphere'), defaultObject('plane')];
    render(<ObjectListEditor objects={objects} onChange={onChange} maxObjects={5} />);

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    const [remaining] = onChange.mock.calls[0];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].type).toBe('plane');
  });

  it('disables the add buttons once the object cap is reached', () => {
    const objects = [defaultObject('sphere'), defaultObject('sphere')];
    render(<ObjectListEditor objects={objects} onChange={vi.fn()} maxObjects={2} />);

    expect(screen.getByText('+ Sphere')).toBeDisabled();
    expect(screen.getByText('+ Plane')).toBeDisabled();
    expect(screen.getByText('+ Triangle')).toBeDisabled();
  });
});
