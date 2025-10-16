import React, { useState, useEffect, useRef } from 'react';
import {
  Pencil,
  Eraser,
  Circle,
  Square,
  Minus,
  Type,
  Move,
  Trash2,
  Download,
  Palette,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowRight,
  Triangle,
  Star,
  MessageCircle,
  Highlighter,
  PenTool,
  Image as ImageIcon,
  Undo,
  Redo
} from 'lucide-react';

interface WhiteboardNoteProps {
  initialData?: string;
  onChange: (data: string) => void;
}

interface DrawingElement {
  type: 'path' | 'circle' | 'rectangle' | 'line' | 'text' | 'arrow' | 'triangle' | 'star' | 'speech-bubble' | 'highlight';
  color: string;
  width: number;
  data: any;
  filled?: boolean;
}

const WhiteboardNote: React.FC<WhiteboardNoteProps> = ({ initialData, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'circle' | 'rectangle' | 'line' | 'text' | 'move' | 'arrow' | 'triangle' | 'star' | 'speech-bubble' | 'highlight'>('pen');
  const [color, setColor] = useState('#6366f1');
  const [lineWidth, setLineWidth] = useState(3);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 3000, height: 2000 });
  const [filled, setFilled] = useState(false);

  // Text input state
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputCanvasPos, setTextInputCanvasPos] = useState({ x: 0, y: 0 });

  const colors = [
    '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#ffffff', '#1e293b', '#f97316',
    '#14b8a6', '#eab308', '#a855f7', '#f43f5e', '#10b981'
  ];

  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setElements(parsed.elements || []);
        setHistory([parsed.elements || []]);
        setZoom(parsed.zoom || 1);
        setOffset(parsed.offset || { x: 0, y: 0 });
        setCanvasSize(parsed.canvasSize || { width: 3000, height: 2000 });
      } catch (e) {
        console.error('Error parsing whiteboard data:', e);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, []);

  useEffect(() => {
    redraw();
    onChange(JSON.stringify({ elements, zoom, offset, canvasSize }));
  }, [elements, zoom, offset]);

  const addToHistory = (newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setElements(history[historyStep - 1]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setElements(history[historyStep + 1]);
    }
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1 / zoom;
    const gridSize = 50;
    const startX = Math.floor(-offset.x / zoom / gridSize) * gridSize;
    const startY = Math.floor(-offset.y / zoom / gridSize) * gridSize;
    const endX = Math.ceil((canvas.width - offset.x) / zoom / gridSize) * gridSize;
    const endY = Math.ceil((canvas.height - offset.y) / zoom / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Draw elements
    elements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;
      ctx.lineWidth = element.width / zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (element.type) {
        case 'path':
          if (element.data.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.data[0].x, element.data[0].y);
            for (let i = 1; i < element.data.length; i++) {
              ctx.lineTo(element.data[i].x, element.data[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'highlight':
          ctx.globalAlpha = 0.3;
          if (element.data.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.data[0].x, element.data[0].y);
            for (let i = 1; i < element.data.length; i++) {
              ctx.lineTo(element.data[i].x, element.data[i].y);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
          break;

        case 'circle':
          const radius = Math.sqrt(
            Math.pow(element.data.endX - element.data.startX, 2) +
            Math.pow(element.data.endY - element.data.startY, 2)
          );
          ctx.beginPath();
          ctx.arc(element.data.startX, element.data.startY, radius, 0, 2 * Math.PI);
          if (element.filled) {
            ctx.fill();
          } else {
            ctx.stroke();
          }
          break;

        case 'rectangle':
          const width = element.data.endX - element.data.startX;
          const height = element.data.endY - element.data.startY;
          if (element.filled) {
            ctx.fillRect(element.data.startX, element.data.startY, width, height);
          } else {
            ctx.strokeRect(element.data.startX, element.data.startY, width, height);
          }
          break;

        case 'line':
          ctx.beginPath();
          ctx.moveTo(element.data.startX, element.data.startY);
          ctx.lineTo(element.data.endX, element.data.endY);
          ctx.stroke();
          break;

        case 'arrow':
          const dx = element.data.endX - element.data.startX;
          const dy = element.data.endY - element.data.startY;
          const angle = Math.atan2(dy, dx);
          const arrowLength = 20;

          ctx.beginPath();
          ctx.moveTo(element.data.startX, element.data.startY);
          ctx.lineTo(element.data.endX, element.data.endY);
          ctx.stroke();

          // Arrowhead
          ctx.beginPath();
          ctx.moveTo(element.data.endX, element.data.endY);
          ctx.lineTo(
            element.data.endX - arrowLength * Math.cos(angle - Math.PI / 6),
            element.data.endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(element.data.endX, element.data.endY);
          ctx.lineTo(
            element.data.endX - arrowLength * Math.cos(angle + Math.PI / 6),
            element.data.endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          break;

        case 'triangle':
          const tw = element.data.endX - element.data.startX;
          const th = element.data.endY - element.data.startY;
          ctx.beginPath();
          ctx.moveTo(element.data.startX + tw / 2, element.data.startY);
          ctx.lineTo(element.data.endX, element.data.endY);
          ctx.lineTo(element.data.startX, element.data.endY);
          ctx.closePath();
          if (element.filled) {
            ctx.fill();
          } else {
            ctx.stroke();
          }
          break;

        case 'star':
          const cx = (element.data.startX + element.data.endX) / 2;
          const cy = (element.data.startY + element.data.endY) / 2;
          const outerRadius = Math.abs(element.data.endX - element.data.startX) / 2;
          const innerRadius = outerRadius * 0.4;
          const spikes = 5;

          ctx.beginPath();
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = cx + Math.cos(angle - Math.PI / 2) * radius;
            const y = cy + Math.sin(angle - Math.PI / 2) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          if (element.filled) {
            ctx.fill();
          } else {
            ctx.stroke();
          }
          break;

        case 'speech-bubble':
          const bw = element.data.endX - element.data.startX;
          const bh = element.data.endY - element.data.startY;
          const cornerRadius = 10;

          ctx.beginPath();
          ctx.roundRect(element.data.startX, element.data.startY, bw, bh, cornerRadius);

          // Speech bubble tail
          const tailX = element.data.startX + bw / 4;
          const tailY = element.data.endY;
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(tailX - 10, tailY + 15);
          ctx.lineTo(tailX + 10, tailY);

          if (element.filled) {
            ctx.fill();
          } else {
            ctx.stroke();
          }
          break;

        case 'text':
          const fontSize = element.width * 8;
          ctx.font = `${fontSize}px Arial, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.direction = 'ltr';
          ctx.fillStyle = element.color;
          ctx.fillText(element.data.text, element.data.x, element.data.y);
          break;
      }
    });

    ctx.restore();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / zoom,
      y: (e.clientY - rect.top - offset.y) / zoom
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (tool === 'move') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (tool === 'text') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      setTextInputCanvasPos(pos);
      setTextInputPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setShowTextInput(true);
      setTextInputValue('');

      setTimeout(() => {
        textInputRef.current?.focus();
      }, 10);
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);

    if (tool === 'pen' || tool === 'eraser' || tool === 'highlight') {
      setCurrentPath([pos]);
    }
  };

  const handleTextInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInputValue.trim()) {
      const newElements = [...elements, {
        type: 'text' as const,
        color,
        width: lineWidth,
        data: { text: textInputValue, x: textInputCanvasPos.x, y: textInputCanvasPos.y }
      }];
      setElements(newElements);
      addToHistory(newElements);
      setShowTextInput(false);
      setTextInputValue('');

      // Expand canvas if needed
      const neededWidth = textInputCanvasPos.x + 500;
      const neededHeight = textInputCanvasPos.y + 100;
      if (neededWidth > canvasSize.width || neededHeight > canvasSize.height) {
        setCanvasSize({
          width: Math.max(canvasSize.width, neededWidth),
          height: Math.max(canvasSize.height, neededHeight)
        });
      }
    } else if (e.key === 'Escape') {
      setShowTextInput(false);
      setTextInputValue('');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing) return;

    const pos = getMousePos(e);

    if (tool === 'pen' || tool === 'eraser' || tool === 'highlight') {
      setCurrentPath(prev => [...prev, pos]);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      if (tool === 'highlight') {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = color;
        ctx.lineWidth = (lineWidth * 4) / zoom;
      } else {
        ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : color;
        ctx.lineWidth = (tool === 'eraser' ? lineWidth * 2 : lineWidth) / zoom;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentPath.length > 0) {
        const lastPoint = currentPath[currentPath.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      ctx.restore();

      // Auto-expand canvas
      const neededWidth = pos.x + 200;
      const neededHeight = pos.y + 200;
      if (neededWidth > canvasSize.width || neededHeight > canvasSize.height) {
        setCanvasSize({
          width: Math.max(canvasSize.width, neededWidth + 500),
          height: Math.max(canvasSize.height, neededHeight + 500)
        });
      }
    } else if (startPos) {
      redraw();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth / zoom;
      ctx.lineCap = 'round';

      // Preview shape
      if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) +
          Math.pow(pos.y - startPos.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        filled ? ctx.fill() : ctx.stroke();
      } else if (tool === 'rectangle' || tool === 'speech-bubble') {
        const width = pos.x - startPos.x;
        const height = pos.y - startPos.y;
        if (tool === 'speech-bubble') {
          ctx.beginPath();
          ctx.roundRect(startPos.x, startPos.y, width, height, 10);
          filled ? ctx.fill() : ctx.stroke();
        } else {
          filled ? ctx.fillRect(startPos.x, startPos.y, width, height) : ctx.strokeRect(startPos.x, startPos.y, width, height);
        }
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'arrow') {
        const dx = pos.x - startPos.x;
        const dy = pos.y - startPos.y;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 20;

        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
          pos.x - arrowLength * Math.cos(angle - Math.PI / 6),
          pos.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
          pos.x - arrowLength * Math.cos(angle + Math.PI / 6),
          pos.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else if (tool === 'triangle') {
        const width = pos.x - startPos.x;
        const height = pos.y - startPos.y;
        ctx.beginPath();
        ctx.moveTo(startPos.x + width / 2, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.lineTo(startPos.x, pos.y);
        ctx.closePath();
        filled ? ctx.fill() : ctx.stroke();
      } else if (tool === 'star') {
        const cx = (startPos.x + pos.x) / 2;
        const cy = (startPos.y + pos.y) / 2;
        const outerRadius = Math.abs(pos.x - startPos.x) / 2;
        const innerRadius = outerRadius * 0.4;
        const spikes = 5;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes;
          const x = cx + Math.cos(angle - Math.PI / 2) * radius;
          const y = cy + Math.sin(angle - Math.PI / 2) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        filled ? ctx.fill() : ctx.stroke();
      }

      ctx.restore();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;

    const pos = getMousePos(e);

    if (tool === 'pen' || tool === 'eraser' || tool === 'highlight') {
      if (currentPath.length > 0) {
        const newElements = [...elements, {
          type: tool === 'highlight' ? 'highlight' : 'path',
          color: tool === 'eraser' ? '#0f172a' : color,
          width: tool === 'eraser' ? lineWidth * 2 : tool === 'highlight' ? lineWidth * 4 : lineWidth,
          data: currentPath
        }];
        setElements(newElements);
        addToHistory(newElements);
      }
      setCurrentPath([]);
    } else if (startPos) {
      const newElement: DrawingElement = {
        type: tool as any,
        color,
        width: lineWidth,
        data: { startX: startPos.x, startY: startPos.y, endX: pos.x, endY: pos.y },
        filled
      };

      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);

      // Auto-expand canvas for shapes
      const maxX = Math.max(startPos.x, pos.x) + 100;
      const maxY = Math.max(startPos.y, pos.y) + 100;
      if (maxX > canvasSize.width || maxY > canvasSize.height) {
        setCanvasSize({
          width: Math.max(canvasSize.width, maxX + 500),
          height: Math.max(canvasSize.height, maxY + 500)
        });
      }
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const clearCanvas = () => {
    if (confirm('Vuoi cancellare tutto il contenuto della lavagna?')) {
      setElements([]);
      addToHistory([]);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCanvasSize({ width: 3000, height: 2000 });
    }
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/30 rounded-lg p-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-slate-800/50 rounded border border-purple-500/20">
        {/* Tools Row 1 */}
        <button
          onClick={() => setTool('move')}
          className={`p-1.5 rounded transition text-xs ${tool === 'move' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Sposta"
        >
          <Move className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('pen')}
          className={`p-1.5 rounded transition ${tool === 'pen' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Penna"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('highlight')}
          className={`p-1.5 rounded transition ${tool === 'highlight' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Evidenziatore"
        >
          <Highlighter className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-1.5 rounded transition ${tool === 'eraser' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Gomma"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-600" />

        {/* Shapes */}
        <button
          onClick={() => setTool('line')}
          className={`p-1.5 rounded transition ${tool === 'line' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Linea"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('arrow')}
          className={`p-1.5 rounded transition ${tool === 'arrow' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Freccia"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`p-1.5 rounded transition ${tool === 'circle' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Cerchio"
        >
          <Circle className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('rectangle')}
          className={`p-1.5 rounded transition ${tool === 'rectangle' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Rettangolo"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('triangle')}
          className={`p-1.5 rounded transition ${tool === 'triangle' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Triangolo"
        >
          <Triangle className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('star')}
          className={`p-1.5 rounded transition ${tool === 'star' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Stella"
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('speech-bubble')}
          className={`p-1.5 rounded transition ${tool === 'speech-bubble' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Fumetto"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('text')}
          className={`p-1.5 rounded transition ${tool === 'text' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
          title="Testo"
        >
          <Type className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-600" />

        {/* Fill toggle */}
        <button
          onClick={() => setFilled(!filled)}
          className={`px-2 py-1 rounded text-xs transition ${filled ? 'bg-purple-500 text-white' : 'bg-slate-700 text-gray-300'}`}
          title="Riempimento"
        >
          {filled ? 'Pieno' : 'Vuoto'}
        </button>

        <div className="w-px h-5 bg-slate-600" />

        {/* Line Width */}
        <div className="flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-16 h-1"
          />
          <span className="text-[10px] text-gray-400 w-5">{lineWidth}</span>
        </div>

        <div className="w-px h-5 bg-slate-600" />

        {/* Colors */}
        <div className="flex gap-1 flex-wrap max-w-md">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : 'border border-slate-600'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-slate-600" />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={historyStep === 0}
          className="p-1.5 hover:bg-slate-700 rounded text-gray-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
          title="Annulla"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={historyStep === history.length - 1}
          className="p-1.5 hover:bg-slate-700 rounded text-gray-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
          title="Ripeti"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-600" />

        {/* Zoom */}
        <button
          onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
          className="p-1.5 hover:bg-slate-700 rounded text-gray-300 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-gray-400 min-w-[35px] text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.max(zoom - 0.2, 0.3))}
          className="p-1.5 hover:bg-slate-700 rounded text-gray-300 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 hover:bg-slate-700 rounded text-gray-300 transition"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={downloadCanvas}
          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-1 text-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          PNG
        </button>
        <button
          onClick={clearCanvas}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1 text-xs transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Cancella
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-slate-950 rounded border border-purple-500/20 relative"
        style={{ minHeight: '500px' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDrawing(false);
            setIsPanning(false);
          }}
          className="w-full h-full"
          style={{
            cursor: tool === 'move' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair'
          }}
        />

        {/* Text Input Overlay */}
        {showTextInput && (
          <input
            ref={textInputRef}
            type="text"
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={handleTextInput}
            onBlur={() => {
              if (!textInputValue.trim()) {
                setShowTextInput(false);
              }
            }}
            className="absolute bg-transparent border-b-2 border-purple-500 text-white outline-none px-1"
            style={{
              left: `${textInputPos.x}px`,
              top: `${textInputPos.y}px`,
              fontSize: `${lineWidth * 8}px`,
              color: color,
              direction: 'ltr',
              textAlign: 'left',
              width: '300px'
            }}
            placeholder="Scrivi qui..."
          />
        )}

        <div className="absolute bottom-2 right-2 text-[10px] text-gray-600 bg-slate-900/80 px-2 py-1 rounded">
          Canvas: {canvasSize.width} × {canvasSize.height} px • Elements: {elements.length}
        </div>
      </div>
    </div>
  );
};

export default WhiteboardNote;
