import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const STATUS_COLORS = {
  added:     { bg: '#22c55e', border: '#16a34a' },
  removed:   { bg: '#ef4444', border: '#dc2626' },
  modified:  { bg: '#f59e0b', border: '#d97706' },
  identical: { bg: '#d1d5db', border: '#9ca3af' },
};

export default function ChartSection({ summary, byType, onSegmentClick }) {
  const doughnutData = {
    labels: ['Added', 'Removed', 'Modified', 'Identical'],
    datasets: [{
      data: [summary.added, summary.removed, summary.modified, summary.identical],
      backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#d1d5db'],
      borderColor: ['#16a34a', '#dc2626', '#d97706', '#9ca3af'],
      borderWidth: 2,
    }],
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#6b7280', padding: 12, font: { size: 12 } } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } },
    },
    cutout: '68%',
  };

  const typeLabels = Object.keys(byType).sort();
  const barData = {
    labels: typeLabels,
    datasets: [
      { label: 'Added',    data: typeLabels.map(t => byType[t].added),    backgroundColor: '#22c55e' },
      { label: 'Removed',  data: typeLabels.map(t => byType[t].removed),  backgroundColor: '#ef4444' },
      { label: 'Modified', data: typeLabels.map(t => byType[t].modified), backgroundColor: '#f59e0b' },
      { label: 'Identical',data: typeLabels.map(t => byType[t].identical),backgroundColor: '#d1d5db' },
    ],
  };

  const STATUS_ORDER = ['added', 'removed', 'modified', 'identical'];

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#6b7280', padding: 10, font: { size: 11 } } },
      title: { display: false },
    },
    scales: {
      x: { stacked: true, ticks: { color: '#6b7280' }, grid: { color: '#e5e7eb' } },
      y: { stacked: true, ticks: { color: '#6b7280', precision: 0 }, grid: { color: '#e5e7eb' } },
    },
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
    },
    onClick: (_event, elements) => {
      if (!elements.length || !onSegmentClick) return;
      const { datasetIndex, index } = elements[0];
      const status = STATUS_ORDER[datasetIndex];
      const type   = typeLabels[index];
      if (status && type) onSegmentClick({ status, type });
    },
  };

  return (
    <div className="charts-row">
      <div className="chart-card">
        <h3 className="chart-title">Changes by Status</h3>
        <div className="chart-wrap doughnut-wrap">
          <Doughnut data={doughnutData} options={doughnutOpts} />
        </div>
      </div>
      <div className="chart-card chart-card-wide">
        <h3 className="chart-title">Changes by File Type</h3>
        <div className="chart-wrap bar-wrap">
          <Bar data={barData} options={barOpts} />
        </div>
      </div>
    </div>
  );
}
