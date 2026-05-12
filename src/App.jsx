import { useState } from 'react';
import UploadZone from './components/UploadZone.jsx';
import Dashboard from './components/Dashboard.jsx';
import { loadSources } from './lib/zipLoader.js';
import { compare } from './lib/comparator.js';

export default function App() {
  const [phase, setPhase] = useState('upload');
  const [result, setResult] = useState(null);
  const [names, setNames] = useState({ nameA: '', nameB: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(null); // { label, pct? }

  async function handleCompare(sources) {
    setPhase('loading');
    setErrorMsg('');
    setProgress({ label: 'Starting…' });
    try {
      const { sideA, sideB, nameA, nameB } = await loadSources(sources, p => setProgress(p));
      setProgress({ label: 'Comparing…' });
      const compareResult = compare(sideA, sideB);
      setNames({ nameA, nameB });
      setResult(compareResult);
      setPhase('done');
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
      setPhase('error');
    } finally {
      setProgress(null);
    }
  }

  function handleReset() {
    setPhase('upload');
    setResult(null);
    setNames({ nameA: '', nameB: '' });
  }

  if (phase === 'done' && result) {
    return <Dashboard result={result} nameA={names.nameA} nameB={names.nameB} onReset={handleReset} />;
  }

  return (
    <div className="app-shell">
      <UploadZone onCompare={handleCompare} loading={phase === 'loading'} progress={progress} />
      {phase === 'error' && (
        <div className="error-toast">
          <span>⚠ {errorMsg}</span>
          <button onClick={() => setPhase('upload')}>✕</button>
        </div>
      )}
    </div>
  );
}
