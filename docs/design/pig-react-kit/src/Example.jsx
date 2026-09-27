import React, { useState } from 'react';
import { PigMain, PigFace, PigBudgetBar } from './PigStatus.jsx';
import { budgetPercent } from './pig-state.mjs';

export default function Example() {
  const [mainState, setMainState] = useState('hungry');
  const [usedPercent, setUsedPercent] = useState(77);
  return (
    <main style={{ maxWidth: 390, margin: '32px auto', padding: 20, fontFamily: 'sans-serif', color: '#302a29' }}>
      <h1 style={{ fontSize: 22 }}>우리 둘 가계부</h1>
      <section style={{ borderRadius: 24, background: '#ffda3c', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <p style={{ fontSize: 12 }}>이번 달 함께 모은 돈</p>
            <strong style={{ fontSize: 'clamp(19px, 5.5vw, 27px)', whiteSpace: 'nowrap' }}>₩3,522,600</strong>
          </div>
          <PigMain state={mainState} size={80} />
        </div>
        <label>시안 상태{' '}
          <select value={mainState} onChange={event => setMainState(event.target.value)}>
            <option value="wealthy">부유함</option>
            <option value="normal">보통</option>
            <option value="hungry">배고픔</option>
          </select>
        </label>
      </section>
      <section style={{ padding: '28px 0' }}>
        <PigBudgetBar usedPercent={usedPercent} label="9월 예산 ₩3,000,000" />
        <label>미리보기 사용률{' '}
          <input type="range" min="0" max="120" value={usedPercent} onChange={event => setUsedPercent(Number(event.target.value))} />
        </label>
        <p style={{ fontSize: 12 }}>실제 지출 예시: {budgetPercent(2317400, 3000000).toFixed(1)}%</p>
      </section>
      <div style={{ display: 'flex', gap: 18 }}>
        {['happy', 'concerned', 'crying'].map(state => <PigFace key={state} state={state} decorative={false} />)}
      </div>
    </main>
  );
}
