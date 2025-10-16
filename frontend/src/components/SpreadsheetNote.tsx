import React, { useState, useEffect, useRef } from 'react';
import { Table, Download, Trash2, Copy } from 'lucide-react';

interface SpreadsheetData {
  cells: { [key: string]: string };
}

interface SpreadsheetNoteProps {
  initialData?: string;
  onChange: (data: string) => void;
}

const SpreadsheetNote: React.FC<SpreadsheetNoteProps> = ({ initialData, onChange }) => {
  const [data, setData] = useState<SpreadsheetData>(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        return { cells: parsed.cells || {} };
      } catch {
        return { cells: {} };
      }
    }
    return { cells: {} };
  });

  const [visibleRows, setVisibleRows] = useState(50);
  const [visibleCols, setVisibleCols] = useState(26);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: { row: number; col: number }; end: { row: number; col: number } } | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [clipboard, setClipboard] = useState<{ [key: string]: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChange(JSON.stringify(data));
  }, [data]);

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const getColumnLabel = (col: number): string => {
    let label = '';
    let num = col + 1;
    while (num > 0) {
      num--;
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26);
    }
    return label;
  };

  const getCellValue = (row: number, col: number): string => {
    return data.cells[getCellKey(row, col)] || '';
  };

  const setCellValue = (row: number, col: number, value: string) => {
    setData(prev => ({
      cells: {
        ...prev.cells,
        [getCellKey(row, col)]: value
      }
    }));
  };

  // Improved Excel formula evaluation
  const evaluateFormula = (formula: string, currentRow: number, currentCol: number, visited = new Set<string>()): string => {
    if (!formula.startsWith('=')) return formula;

    const cellKey = getCellKey(currentRow, currentCol);
    if (visited.has(cellKey)) return '#CIRCULAR!';
    visited.add(cellKey);

    try {
      let expression = formula.substring(1);

      // Convert to uppercase for function names but preserve case for strings
      const upperExpression = expression.toUpperCase();

      // Handle SUM
      if (upperExpression.includes('SUM(')) {
        expression = expression.replace(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/gi,
          (match, col1, row1, col2, row2) => {
            const startCol = getColIndex(col1);
            const endCol = getColIndex(col2);
            const startRow = parseInt(row1) - 1;
            const endRow = parseInt(row2) - 1;

            let sum = 0;
            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                const val = parseFloat(evaluateFormula(getCellValue(r, c), r, c, new Set(visited)));
                if (!isNaN(val)) sum += val;
              }
            }
            return sum.toString();
          }
        );
      }

      // Handle AVERAGE
      if (upperExpression.includes('AVERAGE(')) {
        expression = expression.replace(/AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/gi,
          (match, col1, row1, col2, row2) => {
            const startCol = getColIndex(col1);
            const endCol = getColIndex(col2);
            const startRow = parseInt(row1) - 1;
            const endRow = parseInt(row2) - 1;

            let sum = 0;
            let count = 0;
            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                const val = parseFloat(evaluateFormula(getCellValue(r, c), r, c, new Set(visited)));
                if (!isNaN(val)) {
                  sum += val;
                  count++;
                }
              }
            }
            return count > 0 ? (sum / count).toString() : '0';
          }
        );
      }

      // Handle MIN, MAX, COUNT
      ['MIN', 'MAX', 'COUNT'].forEach(func => {
        if (upperExpression.includes(func + '(')) {
          const regex = new RegExp(`${func}\\(([A-Z]+)(\\d+):([A-Z]+)(\\d+)\\)`, 'gi');
          expression = expression.replace(regex,
            (match, col1, row1, col2, row2) => {
              const startCol = getColIndex(col1);
              const endCol = getColIndex(col2);
              const startRow = parseInt(row1) - 1;
              const endRow = parseInt(row2) - 1;

              const values: number[] = [];
              for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                  const val = parseFloat(evaluateFormula(getCellValue(r, c), r, c, new Set(visited)));
                  if (!isNaN(val)) values.push(val);
                }
              }

              if (func === 'MIN') return values.length > 0 ? Math.min(...values).toString() : '0';
              if (func === 'MAX') return values.length > 0 ? Math.max(...values).toString() : '0';
              if (func === 'COUNT') return values.length.toString();
              return '0';
            }
          );
        }
      });

      // Handle single cell references (A1, B2, etc.) - MUST be after range functions
      expression = expression.replace(/\b([A-Z]+)(\d+)\b/g, (match, colStr, rowStr) => {
        const refCol = getColIndex(colStr);
        const refRow = parseInt(rowStr) - 1;
        const cellValue = evaluateFormula(getCellValue(refRow, refCol), refRow, refCol, new Set(visited));
        const num = parseFloat(cellValue);
        return isNaN(num) ? '0' : num.toString();
      });

      // Handle IF, ROUND, ABS, SQRT, POWER, MOD
      expression = expression.replace(/IF\(([^,]+),([^,]+),([^)]+)\)/gi, (match, cond, trueVal, falseVal) => {
        try {
          // eslint-disable-next-line no-eval
          return eval(cond) ? trueVal.trim() : falseVal.trim();
        } catch {
          return falseVal.trim();
        }
      });

      expression = expression.replace(/ROUND\(([^,]+),(\d+)\)/gi, (m, n, d) => {
        return parseFloat(n).toFixed(parseInt(d));
      });

      expression = expression.replace(/ABS\(([^)]+)\)/gi, (m, n) => Math.abs(parseFloat(n)).toString());
      expression = expression.replace(/SQRT\(([^)]+)\)/gi, (m, n) => Math.sqrt(parseFloat(n)).toString());
      expression = expression.replace(/POWER\(([^,]+),([^)]+)\)/gi, (m, b, e) => Math.pow(parseFloat(b), parseFloat(e)).toString());
      expression = expression.replace(/MOD\(([^,]+),([^)]+)\)/gi, (m, n, d) => (parseFloat(n) % parseFloat(d)).toString());

      // Handle RAND and RANDBETWEEN
      expression = expression.replace(/RAND\(\)/gi, () => Math.random().toString());
      expression = expression.replace(/RANDBETWEEN\(([^,]+),([^)]+)\)/gi, (m, min, max) => {
        return Math.floor(Math.random() * (parseFloat(max) - parseFloat(min) + 1) + parseFloat(min)).toString();
      });

      // Handle TODAY and NOW
      expression = expression.replace(/TODAY\(\)/gi, () => `"${new Date().toLocaleDateString()}"`);
      expression = expression.replace(/NOW\(\)/gi, () => `"${new Date().toLocaleString()}"`);

      // Evaluate final math expression
      // eslint-disable-next-line no-eval
      const result = eval(expression);
      return typeof result === 'number' ? result.toString() : String(result).replace(/^"|"$/g, '');
    } catch (error) {
      return '#ERROR!';
    }
  };

  const getColIndex = (colStr: string): number => {
    let result = 0;
    for (let i = 0; i < colStr.length; i++) {
      result = result * 26 + (colStr.charCodeAt(i) - 64);
    }
    return result - 1;
  };

  const handleCellClick = (row: number, col: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      // Range selection
      setSelectedRange({
        start: selectedCell,
        end: { row, col }
      });
    } else {
      setSelectedCell({ row, col });
      setSelectedRange(null);
      setEditingCell(null);
    }
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell(getCellKey(row, col));
  };

  const handleCellMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    setSelectedCell({ row, col });
    setSelectedRange({ start: { row, col }, end: { row, col } });
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && selectedRange) {
      setSelectedRange({ ...selectedRange, end: { row, col } });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFilling(true);
  };

  const handleFillHandleMouseUp = () => {
    if (isFilling && selectedRange) {
      const { start, end } = selectedRange;
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);

      // Auto-fill logic
      if (minRow === maxRow && maxCol - minCol > 0) {
        // Horizontal fill
        const firstVal = getCellValue(minRow, minCol);
        const num = parseFloat(firstVal);

        if (!isNaN(num) && firstVal.trim() !== '') {
          // Number sequence
          for (let c = minCol + 1; c <= maxCol; c++) {
            setCellValue(minRow, c, (num + (c - minCol)).toString());
          }
        } else {
          // Copy value
          for (let c = minCol + 1; c <= maxCol; c++) {
            setCellValue(minRow, c, firstVal);
          }
        }
      } else if (minCol === maxCol && maxRow - minRow > 0) {
        // Vertical fill
        const firstVal = getCellValue(minRow, minCol);
        const num = parseFloat(firstVal);

        if (!isNaN(num) && firstVal.trim() !== '') {
          // Number sequence
          for (let r = minRow + 1; r <= maxRow; r++) {
            setCellValue(r, minCol, (num + (r - minRow)).toString());
          }
        } else {
          // Copy value
          for (let r = minRow + 1; r <= maxRow; r++) {
            setCellValue(r, minCol, firstVal);
          }
        }
      }
    }
    setIsFilling(false);
  };

  const handleColumnHeaderClick = (col: number) => {
    setSelectedRange({ start: { row: 0, col }, end: { row: visibleRows - 1, col } });
    setSelectedCell(null);
  };

  const handleRowHeaderClick = (row: number) => {
    setSelectedRange({ start: { row, col: 0 }, end: { row, col: visibleCols - 1 } });
    setSelectedCell(null);
  };

  const isCellInRange = (row: number, col: number): boolean => {
    if (!selectedRange) return false;
    const { start, end } = selectedRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingCell(null);
      setSelectedCell({ row: row + 1, col });
      if (row + 1 >= visibleRows) setVisibleRows(prev => prev + 10);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setEditingCell(null);
      setSelectedCell({ row, col: col + 1 });
      if (col + 1 >= visibleCols) setVisibleCols(prev => prev + 5);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const exportToCSV = () => {
    const keys = Object.keys(data.cells);
    if (keys.length === 0) return;

    const maxRow = Math.max(...keys.map(k => parseInt(k.split('-')[0])));
    const maxCol = Math.max(...keys.map(k => parseInt(k.split('-')[1])));

    let csv = '';
    for (let row = 0; row <= maxRow; row++) {
      const rowData: string[] = [];
      for (let col = 0; col <= maxCol; col++) {
        const value = getCellValue(row, col);
        const displayValue = value.startsWith('=') ? evaluateFormula(value, row, col) : value;
        rowData.push(`"${displayValue.replace(/"/g, '""')}"`);
      }
      csv += rowData.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spreadsheet.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (confirm('Vuoi cancellare tutti i dati?')) {
      setData({ cells: {} });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/30 rounded-lg p-3" onMouseUp={handleMouseUp}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 p-2 bg-slate-800/50 rounded border border-emerald-500/20">
        <Table className="w-5 h-5 text-emerald-400" />
        <span className="text-white font-semibold text-sm">Foglio di Calcolo</span>
        <div className="flex-1" />
        <button
          onClick={exportToCSV}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-2 text-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2 text-xs transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Cancella
        </button>
      </div>

      {/* Formula Bar */}
      {selectedCell && (
        <div className="mb-2 p-2 bg-slate-800/50 rounded border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs font-bold min-w-[50px]">
              {getColumnLabel(selectedCell.col)}{selectedCell.row + 1}
            </span>
            <input
              type="text"
              value={getCellValue(selectedCell.row, selectedCell.col)}
              onChange={(e) => setCellValue(selectedCell.row, selectedCell.col, e.target.value)}
              className="flex-1 px-2 py-1 bg-slate-900 text-white rounded border border-slate-700 focus:border-emerald-500 outline-none text-xs font-mono"
              placeholder="=SUM(A1:A10)"
            />
          </div>
          <div className="mt-1 text-[10px] text-gray-500">
            <strong>Matematiche:</strong> SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS, SQRT, POWER, MOD
            • <strong>Altro:</strong> IF, RAND, RANDBETWEEN, TODAY, NOW
          </div>
        </div>
      )}

      {/* Spreadsheet Grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-900/50 rounded border border-emerald-500/20"
        style={{ maxHeight: '500px' }}
        onMouseUp={isFilling ? handleFillHandleMouseUp : undefined}
      >
        <table className="border-collapse w-full select-none">
          <thead className="sticky top-0 z-10 bg-slate-800">
            <tr>
              <th className="border border-slate-700 bg-slate-800 p-1 w-10 text-[10px] text-gray-500 sticky left-0 z-20">#</th>
              {Array.from({ length: visibleCols }, (_, col) => (
                <th
                  key={col}
                  onClick={() => handleColumnHeaderClick(col)}
                  className="border border-slate-700 bg-slate-800 p-1 min-w-[90px] text-xs font-bold text-emerald-400 cursor-pointer hover:bg-slate-700"
                >
                  {getColumnLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: visibleRows }, (_, row) => (
              <tr key={row}>
                <td
                  onClick={() => handleRowHeaderClick(row)}
                  className="border border-slate-700 bg-slate-800 p-1 text-center text-[10px] font-bold text-gray-500 sticky left-0 z-[5] cursor-pointer hover:bg-slate-700"
                >
                  {row + 1}
                </td>
                {Array.from({ length: visibleCols }, (_, col) => {
                  const key = getCellKey(row, col);
                  const rawValue = getCellValue(row, col);
                  const displayValue = rawValue.startsWith('=')
                    ? evaluateFormula(rawValue, row, col)
                    : rawValue;
                  const isEditing = editingCell === key;
                  const isSelected = selectedCell?.row === row && selectedCell?.col === col;
                  const inRange = isCellInRange(row, col);
                  const isRangeEnd = selectedRange && selectedRange.end.row === row && selectedRange.end.col === col;

                  return (
                    <td
                      key={col}
                      className={`border border-slate-700 p-0 relative ${
                        isSelected ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-900/20' :
                        inRange ? 'bg-emerald-900/10' : ''
                      }`}
                      onClick={(e) => handleCellClick(row, col, e)}
                      onDoubleClick={() => handleCellDoubleClick(row, col)}
                      onMouseDown={() => handleCellMouseDown(row, col)}
                      onMouseEnter={() => handleCellMouseEnter(row, col)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={rawValue}
                          onChange={(e) => setCellValue(row, col, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, row, col)}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="w-full px-2 py-1.5 bg-slate-900 text-white outline-none text-xs font-mono"
                          style={{ direction: 'ltr' }}
                        />
                      ) : (
                        <div
                          className="px-2 py-1.5 text-white text-xs min-h-[26px] cursor-cell hover:bg-slate-800/30 font-mono"
                          style={{ direction: 'ltr', textAlign: 'left' }}
                        >
                          {displayValue}
                        </div>
                      )}
                      {/* Fill Handle */}
                      {isRangeEnd && (
                        <div
                          className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 cursor-crosshair"
                          onMouseDown={handleFillHandleMouseDown}
                          style={{ transform: 'translate(50%, 50%)' }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[10px] text-gray-600 text-center">
        Celle: {visibleRows} righe × {visibleCols} colonne • Drag per selezionare • Shift+Click per range • Drag maniglia per riempire
      </div>
    </div>
  );
};

export default SpreadsheetNote;
