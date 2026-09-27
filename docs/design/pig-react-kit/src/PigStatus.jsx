import React from 'react';
import { budgetView, DEFAULT_THRESHOLDS } from './pig-state.mjs';
import './pig-status.css';

const MAIN = {
  wealthy: { file: 'main-wealthy.png', label: '부유한 돼지' },
  normal: { file: 'main-normal.png', label: '보통 돼지' },
  hungry: { file: 'main-hungry.png', label: '배고픈 돼지' },
};
const FACE = {
  happy: { file: 'face-happy.png', label: '웃는 돼지' },
  concerned: { file: 'face-concerned.png', label: '살짝 걱정하는 돼지' },
  crying: { file: 'face-crying.png', label: '우는 돼지' },
};

function PigImage({ item, size, assetBase, decorative, className }) {
  return (
    <img
      className={`pig-asset ${className || ''}`}
      src={`${assetBase.replace(/\/$/, '')}/${item.file}`}
      alt={decorative ? '' : item.label}
      aria-hidden={decorative ? true : undefined}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable={false}
      decoding="async"
    />
  );
}

// state comes from the app's own savings/budget policy; do not infer it from a won amount.
export function PigMain({ state = 'normal', size = 96, assetBase = '/pig-assets', decorative = true, className }) {
  return <PigImage item={MAIN[state] || MAIN.normal} {...{ size, assetBase, decorative, className }} />;
}

export function PigFace({ state = 'happy', size = 28, assetBase = '/pig-assets', decorative = true, className }) {
  return <PigImage item={FACE[state] || FACE.concerned} {...{ size, assetBase, decorative, className }} />;
}

/**
 * Read-only indicator, not an input slider. usedPercent can exceed 100.
 * state overrides example thresholds when the app uses a date-aware policy.
 * Pass null for unknown usage: it shows no face instead of implying a good state.
 */
export function PigBudgetBar({
  usedPercent = null,
  state,
  thresholds = DEFAULT_THRESHOLDS,
  markerSize = 28,
  assetBase = '/pig-assets',
  label = '이번 달 예산',
  className = '',
}) {
  const view = budgetView(usedPercent, thresholds);
  const known = view.raw !== null;
  const mood = FACE[state] ? state : view.state;
  const percentText = known
    ? `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(view.raw)}% 사용`
    : '사용률 미정';
  const statusText = mood ? FACE[mood].label : '상태 미정';

  return (
    <div className={`pig-budget ${className}`} data-state={mood || 'unknown'}>
      <div className="pig-budget__heading">
        <span>{label}</span><strong>{percentText}</strong>
      </div>
      <div
        className="pig-budget__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? view.position : undefined}
        aria-valuetext={`${percentText}, ${statusText}`}
        style={{ '--pig-position': `${view.position}%`, '--pig-marker-size': `${markerSize}px` }}
      >
        <div className="pig-budget__fill" />
        {known && mood && (
          <span className="pig-budget__marker">
            <PigFace state={mood} size={markerSize} assetBase={assetBase} />
          </span>
        )}
      </div>
    </div>
  );
}
