import { formatDate, formatMinutes } from '@/lib/attendance-format';
import styles from './attendance-charts.module.css';

const COLOR_PRESENT = 'var(--chart-present)';
const COLOR_ABSENT = 'var(--chart-absent)';
const COLOR_LATE = 'var(--chart-late)';
const COLOR_EARLY = 'var(--chart-early)';
const COLOR_PRIMARY = 'var(--chart-primary)';

export interface DailyPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  earlyCheckout: number;
  overtimeMinutes: number;
}

const CHART_HEIGHT = 120;
const BAR_GAP = 4;

function scaleFn(max: number) {
  const safeMax = max > 0 ? max : 1;
  return (v: number) => (v / safeMax) * CHART_HEIGHT;
}

function GroupedBarChart({
  title,
  daily,
  keyA,
  keyB,
  colorA,
  colorB,
  labelA,
  labelB,
}: {
  title: string;
  daily: DailyPoint[];
  keyA: keyof DailyPoint;
  keyB: keyof DailyPoint;
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
}) {
  const max = Math.max(1, ...daily.map((d) => Math.max(Number(d[keyA]), Number(d[keyB]))));
  const scale = scaleFn(max);
  const showLabels = daily.length <= 14;
  const groupWidth = 26;
  const barWidth = 9;
  const width = Math.max(daily.length * groupWidth, groupWidth);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <p className={styles.chartTitle}>{title}</p>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: colorA }} /> {labelA}
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: colorB }} /> {labelB}
          </span>
        </div>
      </div>
      <div className={styles.scrollArea}>
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT + 26}`}
          width={width}
          height={CHART_HEIGHT + 26}
          role="img"
          aria-label={title}
        >
          <line x1={0} y1={CHART_HEIGHT} x2={width} y2={CHART_HEIGHT} stroke="var(--color-border)" strokeWidth={1} />
          {daily.map((d, i) => {
            const valA = Number(d[keyA]);
            const valB = Number(d[keyB]);
            const hA = scale(valA);
            const hB = scale(valB);
            const groupX = i * groupWidth;
            return (
              <g key={d.date}>
                <rect
                  x={groupX + 1}
                  y={CHART_HEIGHT - hA}
                  width={barWidth}
                  height={Math.max(hA, valA > 0 ? 2 : 0)}
                  rx={2}
                  fill={colorA}
                />
                <rect
                  x={groupX + 1 + barWidth + BAR_GAP}
                  y={CHART_HEIGHT - hB}
                  width={barWidth}
                  height={Math.max(hB, valB > 0 ? 2 : 0)}
                  rx={2}
                  fill={colorB}
                />
                {showLabels && valA > 0 && (
                  <text x={groupX + 1 + barWidth / 2} y={CHART_HEIGHT - hA - 4} textAnchor="middle" className={styles.barLabel}>
                    {valA}
                  </text>
                )}
                {showLabels && valB > 0 && (
                  <text x={groupX + 1 + barWidth + BAR_GAP + barWidth / 2} y={CHART_HEIGHT - hB - 4} textAnchor="middle" className={styles.barLabel}>
                    {valB}
                  </text>
                )}
                <text x={groupX + groupWidth / 2} y={CHART_HEIGHT + 16} textAnchor="middle" className={styles.axisLabel}>
                  {formatDate(d.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SingleBarChart({
  title,
  daily,
  dataKey,
  color,
  formatValue,
}: {
  title: string;
  daily: DailyPoint[];
  dataKey: keyof DailyPoint;
  color: string;
  formatValue: (v: number) => string;
}) {
  const max = Math.max(1, ...daily.map((d) => Number(d[dataKey])));
  const scale = scaleFn(max);
  const showLabels = daily.length <= 14;
  const groupWidth = 26;
  const barWidth = 16;
  const width = Math.max(daily.length * groupWidth, groupWidth);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <p className={styles.chartTitle}>{title}</p>
      </div>
      <div className={styles.scrollArea}>
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT + 26}`}
          width={width}
          height={CHART_HEIGHT + 26}
          role="img"
          aria-label={title}
        >
          <line x1={0} y1={CHART_HEIGHT} x2={width} y2={CHART_HEIGHT} stroke="var(--color-border)" strokeWidth={1} />
          {daily.map((d, i) => {
            const val = Number(d[dataKey]);
            const h = scale(val);
            const groupX = i * groupWidth;
            return (
              <g key={d.date}>
                <rect
                  x={groupX + (groupWidth - barWidth) / 2}
                  y={CHART_HEIGHT - h}
                  width={barWidth}
                  height={Math.max(h, val > 0 ? 2 : 0)}
                  rx={2}
                  fill={color}
                />
                {showLabels && val > 0 && (
                  <text x={groupX + groupWidth / 2} y={CHART_HEIGHT - h - 4} textAnchor="middle" className={styles.barLabel}>
                    {formatValue(val)}
                  </text>
                )}
                <text x={groupX + groupWidth / 2} y={CHART_HEIGHT + 16} textAnchor="middle" className={styles.axisLabel}>
                  {formatDate(d.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function EmployeePercentageChart({
  employeeAttendance,
}: {
  employeeAttendance: Array<{ userId: string; fullName: string; percentage: number }>;
}) {
  const sorted = [...employeeAttendance].sort((a, b) => b.percentage - a.percentage);
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <p className={styles.chartTitle}>Employee attendance percentage</p>
      </div>
      <div className={styles.hbarList}>
        {sorted.map((e) => (
          <div key={e.userId} className={styles.hbarRow}>
            <span className={styles.hbarName}>{e.fullName}</span>
            <div className={styles.hbarTrack}>
              <div
                className={styles.hbarFill}
                style={{ width: `${Math.min(e.percentage, 100)}%`, background: COLOR_PRIMARY }}
              />
            </div>
            <span className={styles.hbarValue}>{e.percentage}%</span>
          </div>
        ))}
        {sorted.length === 0 && <p className="py-6 text-sm text-muted">No data for this period.</p>}
      </div>
    </div>
  );
}

export function AttendanceAnalytics({
  daily,
  employeeAttendance,
}: {
  daily: DailyPoint[];
  employeeAttendance: Array<{ userId: string; fullName: string; percentage: number }>;
}) {
  if (daily.length === 0) {
    return (
      <div className="rounded-md border border-border p-4">
        <p className="text-sm text-muted">No attendance data in this period yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.chartsGrid}>
      <GroupedBarChart
        title="Daily attendance"
        daily={daily}
        keyA="present"
        keyB="absent"
        colorA={COLOR_PRESENT}
        colorB={COLOR_ABSENT}
        labelA="Present"
        labelB="Absent"
      />
      <GroupedBarChart
        title="Late arrivals vs. early checkouts"
        daily={daily}
        keyA="late"
        keyB="earlyCheckout"
        colorA={COLOR_LATE}
        colorB={COLOR_EARLY}
        labelA="Late"
        labelB="Early checkout"
      />
      <SingleBarChart
        title="Overtime"
        daily={daily}
        dataKey="overtimeMinutes"
        color={COLOR_PRIMARY}
        formatValue={formatMinutes}
      />
      <EmployeePercentageChart employeeAttendance={employeeAttendance} />
    </div>
  );
}
