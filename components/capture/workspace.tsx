'use client';
import { useEffect, useState } from 'react';
import { useGentleman } from '@/components/gentleman-context';
import {
  deskBuckets,
  promoteCapture,
  quickCapture,
  type CaptureReview,
} from '@/lib/capture/model';
import { parseMemory, type PrivateRecord } from '@/lib/gentleman/model';
export function QuickCapture() {
  const { memory, update } = useGentleman();
  const [text, setText] = useState(''),
    [notice, setNotice] = useState('');
  return (
    <form
      className="gent-editor capture-quick"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          update(quickCapture(memory, text));
          setText('');
          setNotice(
            'Added to your working inbox. Review it below, then save private memory to keep your work.',
          );
        } catch (e) {
          setNotice(e instanceof Error ? e.message : 'Unable to capture.');
        }
      }}
    >
      <span className="eyebrow gold">A THOUGHT, BEFORE IT ESCAPES</span>
      <h2>Capture now. Decide later.</h2>
      <label>
        Your private note
        <textarea
          required
          maxLength={16000}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A conversation, a promise, an idea worth keeping…"
        />
      </label>
      <div className="gent-actions">
        <button className="gold-button">Add to Logbook</button>
        <span className="small-note">Private by default · no AI request</span>
      </div>
      <output>{notice}</output>
    </form>
  );
}
export function CaptureReviewPanel({ note }: { note: PrivateRecord }) {
  const { memory, update, ask } = useGentleman();
  const [review, setReview] = useState<CaptureReview | null>(null),
    [basis, setBasis] = useState(''),
    [error, setError] = useState('');
  const target =
    review?.kind === 'person'
      ? 'Circle'
      : review?.kind === 'reference'
        ? 'Vault'
        : 'Desk';
  return (
    <div className="capture-review">
      {note.completed ? (
        <p className="small-note">
          Processed or archived. Reopen only if you want to review this capture
          again.
        </p>
      ) : (
        <button
          className="outline-button"
          onClick={() => {
            setBasis(JSON.stringify(note));
            setReview({
              kind: 'task',
              title: note.title,
              detail: note.detail,
              date: '',
              relatedPersonId: '',
            });
            setError('');
          }}
        >
          Turn this capture into an action or memory
        </button>
      )}
      {review && (
        <form
          className="gent-editor"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              update(promoteCapture(memory, note.id, basis, review));
              setReview(null);
              setError(
                `Created in ${target}. The source is marked processed. Save private memory to keep both changes.`,
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Check this review.');
            }
          }}
        >
          <h3>Review before keeping</h3>
          <p className="small-note">
            No details are inferred. Edit what should be carried forward. The
            new record starts excluded from Cassius context.
          </p>
          <label>
            Keep as
            <select
              value={review.kind}
              onChange={(e) =>
                setReview({
                  ...review,
                  kind: e.target.value as CaptureReview['kind'],
                  relatedPersonId: '',
                })
              }
            >
              <option value="task">Desk · task or meeting</option>
              <option value="decision">Desk · decision</option>
              <option value="person">Circle · new person</option>
              <option value="reference">Vault · reference</option>
            </select>
          </label>
          <label>
            {review.kind === 'person' ? 'Person’s name' : 'Title'}
            <input
              required
              maxLength={160}
              value={review.title}
              onChange={(e) => setReview({ ...review, title: e.target.value })}
            />
          </label>
          <label>
            Details to keep
            <textarea
              maxLength={16000}
              rows={5}
              value={review.detail}
              onChange={(e) => setReview({ ...review, detail: e.target.value })}
            />
          </label>
          <label>
            {review.kind === 'person'
              ? 'Follow-up date (optional)'
              : 'Action or review date (optional)'}
            <input
              type="date"
              value={review.date}
              onChange={(e) => setReview({ ...review, date: e.target.value })}
            />
          </label>
          {review.kind !== 'person' && (
            <label>
              Related person (optional)
              <select
                value={review.relatedPersonId}
                onChange={(e) =>
                  setReview({ ...review, relatedPersonId: e.target.value })
                }
              >
                <option value="">No link</option>
                {memory.records
                  .filter((r) => r.kind === 'person')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <p className="small-note">
            This creates a separate copy and marks the original processed.
            Removing the original later does not remove the copy. No message,
            reminder or invitation is sent.
          </p>
          <div className="gent-actions">
            <button className="gold-button">Create in {target}</button>
            <button type="button" onClick={() => setReview(null)}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                ask(
                  `Help me clarify this private capture into a possible action or decision. Ask about missing dates and people; do not claim to save anything or contact anyone.\n${review.title}\n${review.detail.slice(0, 4500)}`,
                )
              }
            >
              Discuss with Cassius
            </button>
          </div>
        </form>
      )}
      <output>{error}</output>
    </div>
  );
}
export function DeskFocus() {
  const { memory, update, ask } = useGentleman();
  const [today, setToday] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => {
      const d = new Date();
      setToday(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    };
    const first = setTimeout(refresh, 0),
      timer = setInterval(refresh, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  const buckets = deskBuckets(memory, today);
  return (
    <section className="desk-focus">
      <span className="eyebrow gold">DESK / WHAT NEEDS A DECISION</span>
      <h2>Make room for what matters.</h2>
      <p className="small-note">
        Dates you recorded · {today || 'your local day'}
      </p>
      <div className="desk-buckets">
        {(
          [
            ['overdue', 'Needs attention'],
            ['today', 'Today'],
            ['upcoming', 'Ahead'],
            ['undated', 'Unscheduled'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <h3>
              {label}
              <span>{buckets[key].length}</span>
            </h3>
            {buckets[key].slice(0, 5).map((r) => (
              <article key={r.id}>
                <strong>{r.title}</strong>
                <small>
                  {r.kind} · {r.date || 'Choose a date below'}
                  {r.relatedPersonId
                    ? ` · ${memory.records.find((p) => p.id === r.relatedPersonId)?.title || ''}`
                    : ''}
                </small>
                <div className="gent-actions">
                  <button
                    onClick={() => {
                      try {
                        update(
                          parseMemory({
                            ...memory,
                            records: memory.records.map((p) =>
                              p.id === r.id ? { ...p, completed: true } : p,
                            ),
                          }),
                        );
                        setError('');
                      } catch {
                        setError('Unable to update this item.');
                      }
                    }}
                  >
                    Mark complete
                  </button>
                  <button
                    onClick={() =>
                      ask(
                        `Help me prepare this ${r.kind}. These are the details I am choosing to discuss; do not infer authority to act.\n${r.title}\nDate: ${r.date || 'not set'}\n${r.detail.slice(0, 4000)}`,
                      )
                    }
                  >
                    Prepare
                  </button>
                </div>
              </article>
            ))}
            {!buckets[key].length && (
              <p className="small-note">Clear for now.</p>
            )}
            {buckets[key].length > 5 && (
              <p className="small-note">
                {buckets[key].length - 5} more in the records below.
              </p>
            )}
          </div>
        ))}
      </div>
      <output>{error}</output>
    </section>
  );
}
