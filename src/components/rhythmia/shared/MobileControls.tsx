'use client';

type ControlAction = 'hold' | 'rotateCCW' | 'rotateCW' | 'drop' | 'left' | 'down' | 'right';

interface MobileControlsProps {
  onControl: (action: ControlAction) => void;
  extraRows?: React.ReactNode;
  styles: {
    controls: string;
    controlRow: string;
    ctrlBtn: string;
    dropBtn?: string;
  };
}

export default function MobileControls({ onControl, extraRows, styles }: MobileControlsProps) {
  const handleTouch = (action: ControlAction) => (e: React.TouchEvent) => {
    e.preventDefault();
    onControl(action);
  };

  return (
    <div className={styles.controls}>
      <div className={styles.controlRow}>
        <button className={styles.ctrlBtn} onTouchEnd={handleTouch('hold')} onClick={() => onControl('hold')}>H</button>
        <button className={styles.ctrlBtn} onTouchEnd={handleTouch('rotateCCW')} onClick={() => onControl('rotateCCW')}>&#x21BA;</button>
        <button className={styles.ctrlBtn} onTouchEnd={handleTouch('rotateCW')} onClick={() => onControl('rotateCW')}>&#x21BB;</button>
        <button className={`${styles.ctrlBtn} ${styles.dropBtn ?? ''}`} onTouchEnd={handleTouch('drop')} onClick={() => onControl('drop')}>&#x2B07;</button>
      </div>
      <div className={styles.controlRow}>
        <button className={styles.ctrlBtn} onTouchEnd={handleTouch('left')} onClick={() => onControl('left')}>&#x2190;</button>
        <button className={styles.ctrlBtn} onTouchEnd={handleTouch('down')} onClick={() => onControl('down')}>&#x2193;</button>
        <button className={styles.ctrlBtn} onTouchEnd={handleTouch('right')} onClick={() => onControl('right')}>&#x2192;</button>
      </div>
      {extraRows}
    </div>
  );
}
