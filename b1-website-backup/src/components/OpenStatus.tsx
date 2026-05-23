export default function OpenStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isWeekend = day === 0 || day === 6;

  let isOpen = false;
  if (isWeekend) {
    isOpen = hour >= 7 && hour < (day === 0 ? 13 : 14);
  } else {
    isOpen = hour >= 6 && hour < 15;
  }

  if (isOpen) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 py-2.5 px-4" style={{ background: '#B85450' }}>
      <div className="content-container text-center">
        <span className="font-data" style={{ color: '#F3F2EE', letterSpacing: '0.08em' }}>
          WE'RE CURRENTLY CLOSED — OPEN MON-FRI 6AM-3PM, SAT 7AM-2PM, SUN 7AM-1PM
        </span>
      </div>
    </div>
  );
}
