import { useRef, useEffect } from 'react';

interface NotesSectionProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Free-form text notes section in the budget modal
 */
export function NotesSection({ value, onChange }: NotesSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <div className="lme-notes-section">
      <label className="lme-section-label" htmlFor="budget-notes">
        Notes
      </label>
      <textarea
        ref={textareaRef}
        id="budget-notes"
        className="lme-notes-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes about this budget category..."
        rows={4}
      />
    </div>
  );
}
