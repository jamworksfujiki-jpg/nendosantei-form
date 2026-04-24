'use client';

interface Props {
  isAfterDeadline: boolean;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
}

export default function DeadlineNotice({ isAfterDeadline, acknowledged, onAcknowledge }: Props) {
  return (
    <section className="my-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="deadline-heading">
      <div className="flex items-baseline gap-2">
        <h3 id="deadline-heading" className="text-base font-semibold text-slate-900">
          注文期限
        </h3>
        <span className="text-base font-medium text-slate-900">2026年6月15日（月）</span>
      </div>
      <div className="mt-4 space-y-2.5 text-sm text-slate-600 leading-relaxed">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
          6月15日を過ぎた場合
        </p>
        <ul className="space-y-1.5 pl-4 list-disc marker:text-slate-300">
          <li>
            6/15以降も受付は可能ですが、<span className="text-slate-900 font-medium">7/10までの申請に間に合わない可能性</span>があります。
          </li>
          <li>
            7/10を過ぎた場合、即刻の罰則はありませんが<span className="text-slate-900 font-medium">違反状態</span>となります。常識の範囲を超えると罰則の可能性があります。
          </li>
          <li>
            <span className="text-slate-900 font-medium">7/10を過ぎてからのご注文は本料金（9,900円）では承れません</span>。別途お見積もりとなります。
          </li>
        </ul>
      </div>
      {isAfterDeadline && (
        <label className="mt-5 flex items-start gap-3 p-3.5 rounded-md bg-amber-50 border border-amber-200 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledge(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-slate-900"
            aria-required="true"
          />
          <span className="text-sm text-amber-900">
            注文期限（6/15）を過ぎていることを理解し、上記3点に同意します
          </span>
        </label>
      )}
    </section>
  );
}
