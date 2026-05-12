import { useState, useRef } from 'react';
import SummaryCards from './SummaryCards.jsx';
import ChartSection from './ChartSection.jsx';
import ContentBreakdown from './ContentBreakdown.jsx';
import FileTree from './FileTree.jsx';
import DiffViewer from './DiffViewer.jsx';

export default function Dashboard({ result, nameA, nameB, onReset }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jumpFilter, setJumpFilter]     = useState(null); // { status, type }
  const splitRef = useRef(null);

  function handleSegmentClick(filter) {
    setJumpFilter(filter);
    setSelectedFile(null);
    // Smooth-scroll down to the file tree
    setTimeout(() => splitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  return (
    <div className="dashboard">
      <div className="dash-topbar">
        <div className="dash-title">
          <img src="suslogo.svg" alt="Surgical Science" className="sus-logo-sm" />
          <span className="dash-title-sep">|</span>
          Content Compare
        </div>
        <button className="reset-btn" onClick={onReset}>← New Comparison</button>
      </div>

      <div className="dash-content">
        <SummaryCards summary={result.summary} nameA={nameA} nameB={nameB} />
        <ChartSection
          summary={result.summary}
          byType={result.byType}
          onSegmentClick={handleSegmentClick}
        />
        <ContentBreakdown summary={result.summary} byType={result.byType} nameA={nameA} nameB={nameB} />

        <div className="split-panel" ref={splitRef}>
          <FileTree
            files={result.files}
            selectedPath={selectedFile?.path}
            onSelect={setSelectedFile}
            jumpFilter={jumpFilter}
            onClearJump={() => setJumpFilter(null)}
          />
          <DiffViewer file={selectedFile} nameA={nameA} nameB={nameB} />
        </div>
      </div>
    </div>
  );
}
