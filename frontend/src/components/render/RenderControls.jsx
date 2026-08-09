import { Button } from '../common/Button.jsx';

const STATUS_LABELS = {
  connecting: 'Connecting…',
  rendering: 'Rendering',
  completed: 'Complete',
  cancelled: 'Cancelled',
  error: 'Failed',
};

export function RenderControls({ status, onCancel }) {
  const canCancel = status === 'connecting' || status === 'rendering';

  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs uppercase tracking-widest text-text-muted">
        {STATUS_LABELS[status] ?? status}
      </span>
      {canCancel && (
        <Button variant="danger" type="button" onClick={onCancel}>
          Cancel render
        </Button>
      )}
    </div>
  );
}
