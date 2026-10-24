import { PHASES, type TimelineTask } from '@/lib/domain/types';
import { describeDaysFromToday, formatDate } from '@/lib/format';

import { STATUS_LABEL } from './labels';

interface TimelineListProps {
  readonly tasks: readonly TimelineTask[];
  readonly notice: string | null;
}

export function TimelineList({ tasks, notice }: TimelineListProps) {
  const groups = PHASES.map((phase) => ({
    phase,
    tasks: tasks.filter((task) => task.phase === phase),
  })).filter((group) => group.tasks.length > 0);

  return (
    <section id="timeline" aria-labelledby="timeline-heading">
      <h3 id="timeline-heading">Timeline</h3>
      {notice ? (
        <p className="notice" role="note">
          {notice}
        </p>
      ) : null}
      {groups.map((group) => (
        <div key={group.phase} className="phase">
          <h4>{group.phase}</h4>
          <ol className="task-list">
            {group.tasks.map((task) => (
              <li key={task.id} className="task">
                <p className="task-when">
                  <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time>{' '}
                  <span className="muted">({describeDaysFromToday(task.daysFromToday)})</span>
                </p>
                <p className="task-title">
                  {task.title}
                  {task.status !== 'on_track' ? (
                    <span className={`badge badge-${task.status}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  ) : null}
                  {task.critical ? <span className="badge badge-critical">Critical</span> : null}
                </p>
                <p className="task-desc">{task.description}</p>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
