import Link from "next/link";
import type { NextAction } from "../../packages/learning";

const KIND_LABEL: Record<NextAction["kind"], string> = {
  prayer: "NEXT UP",
  goal: "TODAY'S GOAL",
  weak_point: "WORTH A LOOK",
  memorization: "REVIEW DUE",
  habit: "QUICK WIN",
  reentry: "WELCOME BACK",
  done: "ALL CAUGHT UP",
};

export function NextActionCard({ action }: { action: NextAction }) {
  return (
    <article className="next-action-card glass-card">
      <p className="eyebrow">{KIND_LABEL[action.kind]}</p>
      <div className="next-action-body">
        <div>
          <h2>{action.title}</h2>
          <p className="muted">{action.detail}</p>
        </div>
        <Link className="primary-button" href={action.href}>
          {action.cta} <span>→</span>
        </Link>
      </div>
      {action.etaMinutes > 0 ? <p className="next-action-eta">~{action.etaMinutes} min</p> : null}
    </article>
  );
}
