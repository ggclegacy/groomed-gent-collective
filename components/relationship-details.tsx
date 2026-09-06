'use client';
import { useState } from 'react';
import { useGentleman } from '@/components/gentleman-context';
import { parseMemory, type PrivateRecord } from '@/lib/gentleman/model';
import { followUpTask, meetingBrief, nextFollowUp } from '@/lib/circle/model';
import { localTime } from '@/lib/voyage/model';
export function RelationshipDetails({ person }: { person: PrivateRecord }) {
  const { memory, update, ask } = useGentleman();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<
    NonNullable<PrivateRecord['relationship']>
  >({
    organization: '',
    role: '',
    lastContact: '',
    intent: '',
    cadenceDays: 0,
  });
  const [error, setError] = useState('');
  const [contactDate, setContactDate] = useState('');
  const brief = meetingBrief(person, memory);
  function keep(records: PrivateRecord[]) {
    try {
      update(parseMemory({ ...memory, records }));
      setError('');
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Check the relationship details.',
      );
      return false;
    }
  }
  const existingFollowup = memory.records.find(
    (r) =>
      r.kind === 'task' &&
      r.relatedPersonId === person.id &&
      r.origin === 'circle-followup',
  );
  const taskId = existingFollowup?.id;
  const taskExists = memory.records.some(
    (r) => r.id === taskId && !r.completed,
  );
  return (
    <div className="circle-details">
      <details>
        <summary>Meeting brief & relationship memory</summary>
        <div className="circle-brief">
          <span className="eyebrow gold">FROM YOUR RECORDED CONTEXT</span>
          <p>
            {brief.organization || 'Organization not recorded'}
            {brief.role && ` · ${brief.role}`}
          </p>
          <p>
            <strong>Last contact:</strong> {brief.lastContact || 'Not recorded'}
          </p>
          <p>
            <strong>Conversation intention:</strong>{' '}
            {brief.intent || 'Add what you hope to discuss.'}
          </p>
          <h3>Open commitments</h3>
          {brief.commitments.length ? (
            brief.commitments.map((t) => (
              <a href="#desk" key={t.id}>
                {t.title} · {t.date || 'No due date'}
              </a>
            ))
          ) : (
            <p>No linked open tasks.</p>
          )}
          <h3>Meetings in Voyage</h3>
          {brief.meetings.length ? (
            brief.meetings.map((m, i) => (
              <a href="#voyage" key={`${m.startAt}-${i}`}>
                {m.title} · {m.trip} ·{' '}
                {localTime(m.startAt, m.timeZone).replace('T', ' ')} (
                {m.timeZone})
              </a>
            ))
          ) : (
            <p>No linked trip meetings.</p>
          )}
          <div className="gent-actions">
            <button
              onClick={() => {
                setFields(
                  person.relationship ?? {
                    organization: '',
                    role: '',
                    lastContact: '',
                    intent: '',
                    cadenceDays: 0,
                  },
                );
                setEditing(true);
              }}
            >
              Edit relationship
            </button>
            <button
              disabled={!person.date || taskExists}
              onClick={() => {
                try {
                  const task = {
                    ...followUpTask(person, new Date().toISOString()),
                    ...(existingFollowup ? { id: existingFollowup.id } : {}),
                  };
                  keep(
                    memory.records.some((r) => r.id === task.id)
                      ? memory.records.map((r) =>
                          r.id === task.id
                            ? { ...task, createdAt: r.createdAt }
                            : r,
                        )
                      : [...memory.records, task],
                  );
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Set a follow-up date.',
                  );
                }
              }}
            >
              {taskExists ? 'Follow-up is in Desk' : 'Add follow-up to Desk'}
            </button>
          </div>
          <p className="small-note">
            Review a prompt containing this person’s name, context and your
            intention before sending it to Cassius.
          </p>
          <button
            className="outline-button"
            onClick={() =>
              ask(
                `Prepare a concise meeting brief with open questions and a thoughtful follow-up. These are member-provided notes, not verified facts. Do not invent relationship history or send anything.\n${JSON.stringify({ name: person.title, organization: brief.organization, role: brief.role, intent: brief.intent.slice(0, 200), notes: person.detail.slice(0, 550), lastContact: brief.lastContact }).slice(0, 1100)}`,
              )
            }
          >
            Review Cassius prompt
          </button>
          <form
            className="circle-contact"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const date = nextFollowUp(
                  contactDate,
                  person.relationship?.cadenceDays ?? 0,
                );
                keep(
                  memory.records.map((r) =>
                    r.id === person.id
                      ? {
                          ...r,
                          date,
                          completed: false,
                          relationship: {
                            organization: '',
                            role: '',
                            intent: '',
                            cadenceDays: 0,
                            ...r.relationship,
                            lastContact: contactDate,
                          },
                        }
                      : r.id === taskId
                        ? { ...r, completed: true }
                        : r,
                  ),
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Check the contact date.',
                );
              }
            }}
          >
            <label>
              We connected on
              <input
                type="date"
                required
                value={contactDate}
                onChange={(e) => setContactDate(e.target.value)}
              />
            </label>
            <button className="outline-button">Record contact</button>
            <p className="small-note">
              Completes the generated Desk follow-up and schedules the next date
              from your chosen rhythm. No notification is sent.
            </p>
          </form>
        </div>
      </details>
      {editing && (
        <form
          className="gent-editor"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              keep(
                memory.records.map((r) =>
                  r.id === person.id ? { ...r, relationship: fields } : r,
                ),
              )
            )
              setEditing(false);
          }}
        >
          <label>
            Organization
            <input
              maxLength={160}
              value={fields.organization}
              onChange={(e) =>
                setFields({ ...fields, organization: e.target.value })
              }
            />
          </label>
          <label>
            Role
            <input
              maxLength={160}
              value={fields.role}
              onChange={(e) => setFields({ ...fields, role: e.target.value })}
            />
          </label>
          <label>
            Next conversation intention
            <textarea
              maxLength={1000}
              value={fields.intent}
              onChange={(e) => setFields({ ...fields, intent: e.target.value })}
            />
          </label>
          <label>
            Last contact
            <input
              type="date"
              value={fields.lastContact}
              onChange={(e) =>
                setFields({ ...fields, lastContact: e.target.value })
              }
            />
          </label>
          <label>
            Follow-up rhythm
            <select
              value={fields.cadenceDays}
              onChange={(e) =>
                setFields({ ...fields, cadenceDays: Number(e.target.value) })
              }
            >
              <option value={0}>Manual</option>
              <option value={7}>Every week</option>
              <option value={14}>Every two weeks</option>
              <option value={30}>Every 30 days</option>
              <option value={90}>Every 90 days</option>
              <option value={365}>Every year</option>
            </select>
          </label>
          <div className="gent-actions">
            <button className="gold-button">Keep relationship details</button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <p role="alert">{error}</p>
    </div>
  );
}
