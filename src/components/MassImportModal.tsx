import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { hapticImpact, hapticNotification } from '../services/telegram';

interface MassImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedProductRow {
  name: string;
  price: number;
  cost_price?: number;
  margin_profit?: number;
  category: string;
  brand?: string;
  model?: string;
  flavor?: string;
  strength?: string;
  stock?: number;
  emoji?: string;
  isValid: boolean;
  error?: string;
}

export const MassImportModal: React.FC<MassImportModalProps> = ({ isOpen, onClose }) => {
  const { categories, brands, importProducts, isAdmin } = useStore();

  const [activeMode, setActiveMode] = useState<'table' | 'text' | 'generator' | 'file'>('table');
  const [inputText, setInputText] = useState('');
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.slug || 'liquids');
  const [defaultBrand, setDefaultBrand] = useState(brands[0]?.name || 'Puff');
  const [defaultPrice, setDefaultPrice] = useState('25');
  const [defaultCostPrice, setDefaultCostPrice] = useState('10');
  const [defaultStrength, setDefaultStrength] = useState('20мг');
  const [flavorsList, setFlavorsList] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ count: number; errors: string[] } | null>(null);

  // Parse raw text into structured rows
  const parsedRows: ParsedProductRow[] = useMemo(() => {
    if (!isOpen) return [];
    if (activeMode === 'generator') {
      const flavors = flavorsList
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const priceNum = parseFloat(defaultPrice) || 0;
      const costNum = parseFloat(defaultCostPrice) || 0;
      const marginNum = Math.max(0, priceNum - costNum);

      return flavors.map((flavor) => ({
        name: `${defaultBrand} — ${flavor}`,
        price: priceNum,
        cost_price: costNum > 0 ? costNum : undefined,
        margin_profit: marginNum > 0 ? marginNum : undefined,
        category: defaultCategory,
        brand: defaultBrand,
        flavor,
        strength: defaultStrength,
        stock: 20,
        emoji: defaultCategory === 'liquids' ? '💧' : defaultCategory === 'disposables' ? '🔋' : '📦',
        isValid: priceNum > 0 && flavor.length > 0,
      }));
    }

    if (!inputText.trim()) return [];

    const lines = inputText.split('\n').filter((l) => l.trim().length > 0);
    const rows: ParsedProductRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip possible header lines
      if (
        i === 0 &&
        (line.toLowerCase().startsWith('название') ||
          line.toLowerCase().startsWith('name') ||
          line.toLowerCase().startsWith('товар'))
      ) {
        continue;
      }

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map((p) => p.trim());
      } else if (line.includes('|')) {
        parts = line.split('|').map((p) => p.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map((p) => p.trim());
      } else {
        parts = [line];
      }

      // Column ordering expectation:
      // 0: Name
      // 1: Price (retail)
      // 2: Cost price (optional) OR Category
      // 3: Category / Brand
      // 4: Flavor / Strength
      // 5: Stock
      const name = parts[0] || '';
      let price = 0;
      let costPrice: number | undefined = undefined;
      let category = defaultCategory;
      let brand = '';
      let flavor = '';
      let strength = '';
      let stock = 10;

      // Extract price
      if (parts[1]) {
        const cleanPrice = parts[1].replace(/[^\d.,]/g, '').replace(',', '.');
        price = parseFloat(cleanPrice) || 0;
      }

      // Check if parts[2] is cost price or category
      if (parts[2]) {
        const potentialCost = parts[2].replace(/[^\d.,]/g, '').replace(',', '.');
        const parsedCost = parseFloat(potentialCost);
        if (!isNaN(parsedCost) && parsedCost > 0 && parsedCost < price) {
          costPrice = parsedCost;
          if (parts[3]) category = parts[3].toLowerCase();
          if (parts[4]) brand = parts[4];
          if (parts[5]) flavor = parts[5];
          if (parts[6]) strength = parts[6];
          if (parts[7]) stock = parseInt(parts[7], 10) || 10;
        } else {
          category = parts[2].toLowerCase() || defaultCategory;
          if (parts[3]) brand = parts[3];
          if (parts[4]) flavor = parts[4];
          if (parts[5]) strength = parts[5];
          if (parts[6]) stock = parseInt(parts[6], 10) || 10;
        }
      }

      // Validate category slug
      const validCategory = categories.find(
        (c) => c.slug.toLowerCase() === category.toLowerCase() || c.name.toLowerCase() === category.toLowerCase()
      )?.slug || defaultCategory;

      const marginProfit = costPrice && price > costPrice ? price - costPrice : undefined;

      const isValid = Boolean(name && price > 0);
      rows.push({
        name,
        price,
        cost_price: costPrice,
        margin_profit: marginProfit,
        category: validCategory,
        brand: brand || undefined,
        flavor: flavor || undefined,
        strength: strength || undefined,
        stock,
        emoji: validCategory === 'liquids' ? '💧' : validCategory === 'disposables' ? '🔋' : '📦',
        isValid,
        error: !name ? 'Отсутствует название' : price <= 0 ? 'Не указана цена' : undefined,
      });
    }

    return rows;
  }, [
    inputText,
    activeMode,
    defaultCategory,
    defaultBrand,
    defaultPrice,
    defaultCostPrice,
    defaultStrength,
    flavorsList,
    categories,
  ]);

  const validRowsCount = parsedRows.filter((r) => r.isValid).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputText(text);
        setActiveMode('table');
        hapticNotification('success');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sample = `Название\tЦена\tСебестоимость\tКатегория\tБренд\tВкус\tКрепость\tОстаток
Husky Mint Series — Juicy Grapes\t24.00\t10.00\tliquids\tHusky\tВиноградная мята\t20мг\t15
Podonki V2 — Sour Apple\t22.50\t9.00\tliquids\tPodonki\tКислое яблоко\t20мг\t20
Elf Bar BC10000 — Watermelon Ice\t38.00\t18.00\tdisposables\tElf Bar\tАрбузный лед\t50мг\t12
Vaporesso XROS 4 Mini\t75.00\t40.00\tdevices\tVaporesso\tЧерный\t\t8`;

    const blob = new Blob([sample], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'puff_sample_import.tsv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hapticNotification('success');
  };

  const handleExecuteImport = async () => {
    const validItems = parsedRows.filter((r) => r.isValid);
    if (validItems.length === 0) {
      alert('Нет валидных товаров для импорта!');
      return;
    }

    setIsProcessing(true);
    hapticImpact('medium');

    try {
      const res = await importProducts(
        validItems.map((r) => ({
          name: r.name,
          price: r.price,
          cost_price: r.cost_price,
          margin_profit: r.margin_profit,
          category: r.category,
          brand: r.brand,
          flavor: r.flavor,
          strength: r.strength,
          stock: r.stock,
          emoji: r.emoji,
        }))
      );

      setResultSummary({
        count: res.successCount,
        errors: res.errors || [],
      });
      hapticNotification('success');
    } catch (err: any) {
      alert(`Ошибка при импорте: ${err?.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#141221] border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Массовый импорт товаров</h3>
              <p className="text-[11px] text-zinc-400">
                Быстрое добавление прайсов из Excel, таблиц или генератора
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              hapticImpact('light');
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Import Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/5 my-3 shrink-0">
          <button
            onClick={() => {
              hapticImpact('light');
              setActiveMode('table');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'table'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel / Таблица</span>
          </button>

          <button
            onClick={() => {
              hapticImpact('light');
              setActiveMode('generator');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'generator'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Генератор вкусов</span>
          </button>

          <button
            onClick={() => {
              hapticImpact('light');
              setActiveMode('file');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'file'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Файл (.csv / .tsv)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-0.5">
          {resultSummary ? (
            <div className="p-6 text-center space-y-4 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 text-3xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">Импорт успешно завершен!</h4>
              <p className="text-xs text-zinc-300">
                В базу данных добавлено <b className="text-emerald-400">{resultSummary.count}</b> товаров с расчетом
                себестоимости и маржи.
              </p>
              {resultSummary.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-left max-h-28 overflow-y-auto">
                  <div className="font-bold mb-1">Замечания:</div>
                  {resultSummary.errors.map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  setResultSummary(null);
                  setInputText('');
                  setFlavorsList('');
                  onClose();
                }}
                className="py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
              >
                Вернуться к управлению
              </button>
            </div>
          ) : (
            <>
              {/* MODE 1: EXCEL / SPREADSHEET PASTE */}
              {activeMode === 'table' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">
                      Вставьте скопированные ячейки из Excel или Google Sheets:
                    </span>
                    <button
                      onClick={handleDownloadSample}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      <span>Скачать образец</span>
                    </button>
                  </div>

                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Название	Цена	Себестоимость	Категория	Бренд	Вкус	Крепость	Остаток&#10;Husky Mint — Juicy Grapes	24.00	10.00	liquids	Husky	Виноград	20мг	15"
                    rows={5}
                    className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* MODE 2: FLAVOR GENERATOR */}
              {activeMode === 'generator' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300 leading-relaxed">
                    💡 <b>Быстрый генератор:</b> Выберите категорию, бренд и цены один раз, затем вставьте список вкусов
                    по одному на строку — карточки товаров создадутся автоматически!
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Категория</label>
                      <select
                        value={defaultCategory}
                        onChange={(e) => setDefaultCategory(e.target.value)}
                        className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Бренд</label>
                      <input
                        type="text"
                        value={defaultBrand}
                        onChange={(e) => setDefaultBrand(e.target.value)}
                        placeholder="Husky / Podonki"
                        className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Цена розница (BYN)</label>
                      <input
                        type="number"
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(e.target.value)}
                        className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-emerald-400 font-semibold block mb-1">
                        Себестоимость (BYN)
                      </label>
                      <input
                        type="number"
                        value={defaultCostPrice}
                        onChange={(e) => setDefaultCostPrice(e.target.value)}
                        className="w-full p-2 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-emerald-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      Список вкусов (каждый вкус с новой строки):
                    </label>
                    <textarea
                      value={flavorsList}
                      onChange={(e) => setFlavorsList(e.target.value)}
                      placeholder="Кислое зеленое яблоко&#10;Мятная черника со льдом&#10;Тропический манго-маракуйя&#10;Лесные ягоды с хвоей"
                      rows={5}
                      className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* MODE 3: FILE UPLOAD */}
              {activeMode === 'file' && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-purple-500/30 rounded-3xl p-6 text-center space-y-3 bg-purple-500/[0.02]">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto text-xl">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Выберите файл .csv или .tsv</span>
                      <span className="text-[11px] text-zinc-400">Разделители: табуляция, запятая или точка с запятой</span>
                    </div>
                    <label className="inline-block py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer">
                      <span>Обзор файлов</span>
                      <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleDownloadSample}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Скачать готовый файл-шаблон с колонками</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PREVIEW TABLE OF PARSED PRODUCTS */}
              {parsedRows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Предпросмотр ({validRowsCount} из {parsedRows.length} готово к импорту)
                    </span>
                    <span className="text-[11px] text-purple-300 font-semibold">
                      Потенц. маржа: +
                      {parsedRows
                        .filter((r) => r.isValid)
                        .reduce((sum, r) => sum + (r.margin_profit || r.price * 0.6) * (r.stock || 1), 0)
                        .toFixed(1)}{' '}
                      BYN
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-white/10 rounded-2xl bg-black/50 no-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-zinc-400 border-b border-white/10 text-[10px] uppercase">
                          <th className="p-2.5">Товар</th>
                          <th className="p-2.5">Категория</th>
                          <th className="p-2.5 text-right">Розница</th>
                          {isAdmin && <th className="p-2.5 text-right text-emerald-400">Себест.</th>}
                          {isAdmin && <th className="p-2.5 text-right text-emerald-400">Маржа</th>}
                          <th className="p-2.5 text-right">Остаток</th>
                          <th className="p-2.5 text-center">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-white/[0.02]' : 'bg-red-500/10'}>
                            <td className="p-2.5">
                              <span className="font-semibold text-white truncate max-w-[160px] block">
                                {row.emoji} {row.name}
                              </span>
                              {row.flavor && (
                                <span className="text-[10px] text-zinc-400">Вкус: {row.flavor}</span>
                              )}
                            </td>
                            <td className="p-2.5 text-zinc-300 text-[11px]">{row.category}</td>
                            <td className="p-2.5 text-right font-bold text-white">{row.price.toFixed(2)}</td>
                            {isAdmin && (
                              <td className="p-2.5 text-right text-emerald-400 font-mono text-[11px]">
                                {row.cost_price ? row.cost_price.toFixed(2) : '—'}
                              </td>
                            )}
                            {isAdmin && (
                              <td className="p-2.5 text-right text-emerald-400 font-mono text-[11px]">
                                {row.margin_profit ? `+${row.margin_profit.toFixed(2)}` : '—'}
                              </td>
                            )}
                            <td className="p-2.5 text-right text-zinc-300">{row.stock} шт.</td>
                            <td className="p-2.5 text-center">
                              {row.isValid ? (
                                <span className="text-emerald-400 font-bold text-xs">✓</span>
                              ) : (
                                <span className="text-red-400 text-[10px]">{row.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!resultSummary && (
          <div className="pt-3 border-t border-white/10 flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                hapticImpact('light');
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
            >
              Отмена
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={validRowsCount === 0 || isProcessing}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                validRowsCount > 0 && !isProcessing
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isProcessing ? 'Импорт...' : `Импортировать (${validRowsCount})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
