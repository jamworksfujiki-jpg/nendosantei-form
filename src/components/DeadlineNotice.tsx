'use client';

interface Props {
  isAfterDeadline: boolean;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
}

export default function DeadlineNotice({ isAfterDeadline, acknowledged, onAcknowledge }: Props) {
  return (
    <section className="my-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6" aria-labelledby="deadline-heading">
      <h3 id="deadline-heading" className="text-base sm:text-lg font-bold text-amber-900 flex items-center gap-2">
        <span aria-hidden>⏰</span>
        注文期限：2026年6月15日（月）
      </h3>
      <div className="mt-3 space-y-2 text-sm text-amber-900 leading-relaxed">
        <p>
          ▼ <strong>6月15日を過ぎた場合のご注意</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>
            6/15以降も受付は可能ですが、<strong>7/10までの申請に間に合わない可能性があります</strong>。
            その点をご了承の上でお申込みください。
          </li>
          <li>
            7/10を過ぎた場合、実務上即刻の罰則はありませんが<strong>違反状態</strong>となります。
            常識の範囲を超えて遅れた場合、罰則が発生する可能性があります。
          </li>
          <li>
            <strong>7/10を過ぎてからのご注文は本料金（9,900円）では承れません</strong>。
            別途お見積もりとなります。
          </li>
        </ul>
      </div>
      {isAfterDeadline && (
        <label className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-white border border-amber-400 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledge(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[#298ef2]"
            aria-required="true"
          />
          <span className="text-sm text-amber-900 font-medium">
            注文期限（6/15）を過ぎていることを理解し、上記3点に同意します
          </span>
        </label>
      )}
    </section>
  );
}
