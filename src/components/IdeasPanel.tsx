import type { IdeasSource, PersonalisedIdeas } from '@/lib/domain/types';

interface IdeasPanelProps {
  readonly ideas: PersonalisedIdeas;
  readonly source: IdeasSource;
}

interface IdeaListProps {
  readonly id: string;
  readonly title: string;
  readonly items: readonly string[];
}

function IdeaList({ id, title, items }: IdeaListProps) {
  return (
    <section aria-labelledby={id} className="card">
      <h4 id={id}>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function IdeasPanel({ ideas, source }: IdeasPanelProps) {
  return (
    <section id="ideas" aria-labelledby="ideas-heading">
      <h3 id="ideas-heading">Personalised ideas</h3>
      <p className="hint">
        {source === 'gemini'
          ? 'Written for you by Gemini, an AI model. Treat these as inspiration and check the details.'
          : 'Built-in suggestions chosen from your answers.'}
      </p>
      <p className="headline">{ideas.headline}</p>

      <div className="idea-grid">
        <section aria-labelledby="ideas-themes" className="card">
          <h4 id="ideas-themes">Theme ideas</h4>
          <ul>
            {ideas.themeIdeas.map((theme) => (
              <li key={theme.name}>
                <strong>{theme.name}.</strong> {theme.description}
              </li>
            ))}
          </ul>
        </section>
        <IdeaList id="ideas-menu" title="Menu" items={ideas.menuSuggestions} />
        <IdeaList id="ideas-activities" title="Activities" items={ideas.activityIdeas} />
        <IdeaList id="ideas-decor" title="Decor" items={ideas.decorTips} />
        <IdeaList id="ideas-savings" title="Ways to save" items={ideas.budgetSavingTips} />
        <IdeaList id="ideas-touches" title="Personal touches" items={ideas.personalTouches} />
      </div>
    </section>
  );
}
