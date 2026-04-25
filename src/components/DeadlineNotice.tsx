'use client';

interface Props {
  isAfterDeadline: boolean;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
}

export default function DeadlineNotice({ isAfterDeadline, acknowledged, onAcknowledge }: Props) {
  return (
    <section className="section-card" aria-labelledby="deadline-heading">
      <div className="section-header">
        <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border-2 border-amber-500 text-amber-600 text-[10px] font-bold">
          期限
        </span>
        <div>
          <h3 id="deadline-heading" className="text-base font-bold text-slate-900">
            注文期限　<span className="text-blue-700">2026年6月15日（月）</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">期限を過ぎた場合は以下をご確認ください</p>
        </div>
      </div>
      <div className="section-body">
        <div className="rounded-lg bg-white border-2 border-blue-800 p-4">
          <p className="text-xs uppercase tracking-wider text-blue-700 font-bold mb-2">
            6月15日を過ぎた場合
          </p>
          <ul className="space-y-1.5 pl-4 list-disc marker:text-blue-500 text-sm text-slate-700 leading-relaxed">
            <li>
              6/15以降も受付は可能ですが、<span className="text-slate-900 font-semibold">7/10までの申請に間に合わない可能性</span>があります。
            </li>
            <li>
              7/10を過ぎた場合、即刻の罰則はありませんが<span className="text-slate-900 font-semibold">違反状態</span>となります。常識の範囲を超えると罰則の可能性があります。
            </li>
            <li>
              <span className="text-slate-900 font-semibold">7/10を過ぎてからのご注文は本料金（9,900円/項目）では承れません</span>。別途お見積もりとなります。
            </li>
          </ul>
        </div>
        {isAfterDeadline && (
          <label className="mt-5 flex items-start gap-3 p-4 rounded-lg bg-white border-2 border-blue-800 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => onAcknowledge(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-blue-800"
              aria-required="true"
            />
            <span className="text-sm text-slate-900 font-medium">
              注文期限（6/15）を過ぎていることを理解し、上記3点に同意します
            </span>
          </label>
        )}
      </div>
    </section>
  );
}
