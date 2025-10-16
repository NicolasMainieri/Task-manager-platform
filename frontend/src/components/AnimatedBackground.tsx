import { useEffect, useRef } from 'react';
import './AnimatedBackground.css';

interface AnimatedBackgroundProps {
  colors?: string[];
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedBackground({
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  className = '',
  style = {}
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    // Set CSS variables for colors
    container.style.setProperty('--color-1', colors[0] || '#5227FF');
    container.style.setProperty('--color-2', colors[1] || '#FF9FFC');
    container.style.setProperty('--color-3', colors[2] || '#B19EEF');
  }, [colors]);

  return (
    <div
      ref={canvasRef}
      className={`animated-background ${className}`}
      style={style}
    />
  );
}
