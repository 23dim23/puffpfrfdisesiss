import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Edit3,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { hapticImpact, hapticNotification } from '../services/telegram';

interface MassImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ParsedProductRow {
  id?: string;
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

  // Wizard Steps: 'input' -> 'review'
  const [currentStep, setCurrentStep] = useState<'input' | 'review'>('input');

  const [activeMode, setActiveMode] = useState<'table' | 'generator' | 'file'>('table');
  const [inputText, setInputText] = useState('');
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.slug || 'liquid');
  const [defaultBrand, setDefaultBrand] = useState(brands[0]?.name || 'Puff');
  const [defaultPrice, setDefaultPrice] = useState('25');
  const [defaultCostPrice, setDefaultCostPrice] = useState('10');
  const [defaultStrength, setDefaultStrength] = useState('20мг');
  const [flavorsList, setFlavorsList] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    count: number;
    addedCount?: number;
    updatedCount?: number;
    errors: string[];
  } | null>(null);

  // Editable review items list
  const [reviewItems, setReviewItems] = useState<ParsedProductRow[]>([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkStock, setBulkStock] = useState<string>('');

  // Helper to map category name or slug to valid slug
  const resolveCategorySlug = (catRaw: string): string => {
    if (!catRaw) return defaultCategory;
    const clean = catRaw.trim().toLowerCase();

    // Specific aliases
    if (clean.includes('жидк') || clean.includes('жиж') || clean === 'liquids' || clean === 'liquid') {
      return categories.find((c) => c.slug === 'liquid' || c.slug === 'liquids')?.slug || 'liquid';
    }
    if (clean.includes('pod') || clean.includes('под') || clean === 'pods' || clean === 'devices') {
      return categories.find((c) => c.slug === 'pods' || c.slug === 'devices')?.slug || 'pods';
    }
    if (clean.includes('однораз') || clean.includes('disposable') || clean === 'disposables') {
      return categories.find((c) => c.slug === 'disposable' || c.slug === 'disposables')?.slug || 'disposable';
    }
    if (clean.includes('картридж') || clean.includes('испарител') || clean.includes('расходник') || clean === 'consumables') {
      return categories.find((c) => c.slug === 'consumables' || c.slug === 'cartridges')?.slug || 'consumables';
    }
    if (clean.includes('снюс') || clean.includes('пауч') || clean === 'snus') {
      return categories.find((c) => c.slug === 'snus')?.slug || 'snus';
    }

    const matched = categories.find(
      (c) => c.slug.toLowerCase() === clean || c.name.toLowerCase() === clean
    );
    return matched?.slug || categories[0]?.slug || defaultCategory;
  };

  const getCategoryEmoji = (catSlug: string): string => {
    switch (catSlug) {
      case 'liquid':
      case 'liquids':
        return '🧪';
      case 'pods':
      case 'devices':
        return '🔋';
      case 'consumables':
      case 'cartridges':
        return '⚡';
      case 'disposable':
      case 'disposables':
        return '💨';
      case 'snus':
        return '❄️';
      default:
        return '📦';
    }
  };

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

      return flavors.map((flavor, idx) => ({
        id: `gen-${idx}-${Date.now()}`,
        name: `${defaultBrand} — ${flavor}`,
        price: priceNum,
        cost_price: costNum > 0 ? costNum : undefined,
        margin_profit: marginNum > 0 ? marginNum : undefined,
        category: defaultCategory,
        brand: defaultBrand,
        flavor,
        strength: defaultStrength,
        stock: 20,
        emoji: getCategoryEmoji(defaultCategory),
        isValid: priceNum > 0 && flavor.length > 0,
      }));
    }

    if (!inputText.trim()) return [];

    const lines = inputText.split('\n').filter((l) => l.trim().length > 0);
    const rows: ParsedProductRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip header lines
      if (
        i === 0 &&
        (line.toLowerCase().startsWith('название') ||
          line.toLowerCase().startsWith('name') ||
          line.toLowerCase().startsWith('товар'))
      ) {
        continue;
      }

      let parts: string[] = [];
      if (line.includes('|')) {
        parts = line.split('|').map((p) => p.trim());
      } else if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map((p) => p.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map((p) => p.trim());
      } else {
        parts = [line];
      }

      // Default values
      let name = parts[0] || '';
      let price = 0;
      let costPrice: number | undefined = undefined;
      let category = defaultCategory;
      let brand = '';
      let model = '';
      let flavor = '';
      let strength = '';
      let stock = 10;

      // Extract price from parts[1]
      if (parts[1]) {
        const cleanPrice = parts[1].replace(/[^\d.,]/g, '').replace(',', '.');
        price = parseFloat(cleanPrice) || 0;
      }

      // Format from AI Prompt (9 columns):
      // 0: Name | 1: Price | 2: Category | 3: Brand | 4: Model | 5: Flavor | 6: Strength | 7: Quantity | 8: CostPrice
      if (parts.length >= 8 && isNaN(parseFloat(parts[2].replace(',', '.')))) {
        category = resolveCategorySlug(parts[2]);
        brand = parts[3] || '';
        model = parts[4] !== '—' ? parts[4] || '' : '';
        flavor = parts[5] !== '—' ? parts[5] || '' : '';
        strength = parts[6] !== '—' ? parts[6] || '' : '';
        stock = parseInt(parts[7], 10) || 10;
        if (parts[8]) {
          const cleanCost = parts[8].replace(/[^\d.,]/g, '').replace(',', '.');
          const parsedC = parseFloat(cleanCost);
          if (!isNaN(parsedC) && parsedC > 0) costPrice = parsedC;
        }
      }
      // Standard Tab / Excel format (where parts[2] might be cost price or category)
      else if (parts[2]) {
        const potentialCost = parts[2].replace(/[^\d.,]/g, '').replace(',', '.');
        const parsedCost = parseFloat(potentialCost);
        if (!isNaN(parsedCost) && parsedCost > 0 && parsedCost < price) {
          costPrice = parsedCost;
          if (parts[3]) category = resolveCategorySlug(parts[3]);
          if (parts[4]) brand = parts[4];
          if (parts[5]) flavor = parts[5];
          if (parts[6]) strength = parts[6];
          if (parts[7]) stock = parseInt(parts[7], 10) || 10;
        } else {
          category = resolveCategorySlug(parts[2]);
          if (parts[3]) brand = parts[3];
          if (parts[4]) flavor = parts[4];
          if (parts[5]) strength = parts[5];
          if (parts[6]) stock = parseInt(parts[6], 10) || 10;
        }
      }

      const marginProfit = costPrice && price > costPrice ? price - costPrice : undefined;
      const isValid = Boolean(name && price > 0);

      rows.push({
        id: `row-${i}-${Date.now()}`,
        name,
        price,
        cost_price: costPrice,
        margin_profit: marginProfit,
        category,
        brand: brand || undefined,
        model: model || undefined,
        flavor: flavor || undefined,
        strength: strength || undefined,
        stock,
        emoji: getCategoryEmoji(category),
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
    isOpen,
  ]);

  // Proceed to Step 2: Review & Moderation
  const handleProceedToReview = () => {
    if (parsedRows.length === 0) {
      alert('Сначала введите или загрузите товары!');
      return;
    }
    setReviewItems(parsedRows);
    setCurrentStep('review');
    hapticNotification('success');
  };

  // Modify individual row in review
  const handleUpdateItem = (id: string | undefined, field: keyof ParsedProductRow, value: any) => {
    setReviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Recalculate validations and margins
        if (field === 'price' || field === 'cost_price') {
          const price = typeof updated.price === 'number' ? updated.price : parseFloat(updated.price) || 0;
          const cost = typeof updated.cost_price === 'number' ? updated.cost_price : parseFloat(updated.cost_price || '0') || 0;
          updated.price = price;
          updated.cost_price = cost > 0 ? cost : undefined;
          updated.margin_profit = cost > 0 && price > cost ? price - cost : undefined;
        }

        if (field === 'category') {
          updated.emoji = getCategoryEmoji(value);
        }

        updated.isValid = Boolean(updated.name && updated.price > 0);
        updated.error = !updated.name ? 'Отсутствует название' : updated.price <= 0 ? 'Не указана цена' : undefined;

        return updated;
      })
    );
  };

  // Delete item from review
  const handleDeleteItem = (id: string | undefined) => {
    hapticImpact('light');
    setReviewItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add empty new item to review
  const handleAddNewItem = () => {
    hapticImpact('medium');
    const newItem: ParsedProductRow = {
      id: `manual-${Date.now()}`,
      name: 'Новый товар',
      price: 25,
      cost_price: 12,
      margin_profit: 13,
      category: categories[0]?.slug || 'liquid',
      brand: defaultBrand || 'Puff',
      stock: 10,
      emoji: getCategoryEmoji(categories[0]?.slug || 'liquid'),
      isValid: true,
    };
    setReviewItems((prev) => [newItem, ...prev]);
  };

  // Bulk set category for all review items
  const handleApplyBulkCategory = () => {
    if (!bulkCategory) return;
    hapticNotification('success');
    setReviewItems((prev) =>
      prev.map((item) => ({
        ...item,
        category: bulkCategory,
        emoji: getCategoryEmoji(bulkCategory),
      }))
    );
  };

  // Bulk set stock for all review items
  const handleApplyBulkStock = () => {
    const stockVal = parseInt(bulkStock, 10);
    if (isNaN(stockVal) || stockVal < 0) return;
    hapticNotification('success');
    setReviewItems((prev) =>
      prev.map((item) => ({
        ...item,
        stock: stockVal,
      }))
    );
  };

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
Husky Mint Series — Juicy Grapes\t24.00\t10.00\tliquid\tHusky\tВиноградная мята\t20мг\t15
Podonki V2 — Sour Apple\t22.50\t9.00\tliquid\tPodonki\tКислое яблоко\t20мг\t20
Elf Bar BC10000 — Watermelon Ice\t38.00\t18.00\tdisposable\tElf Bar\tАрбузный лед\t50мг\t12
Vaporesso XROS 4 Mini\t75.00\t40.00\tpods\tVaporesso\tЧерный\t—\t8`;

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

  const handleExecuteFinalImport = async () => {
    const validItems = reviewItems.filter((r) => r.isValid);
    if (validItems.length === 0) {
      alert('Нет корректных товаров для импорта! Исправьте поля, выделенные красным.');
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
          stock: r.stock ?? 10,
          emoji: r.emoji,
        }))
      );

      setResultSummary({
        count: res.successCount,
        addedCount: (res as any).addedCount,
        updatedCount: (res as any).updatedCount,
        errors: res.errors || [],
      });
      hapticNotification('success');
    } catch (err: any) {
      alert(`Ошибка при импорте: ${err?.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered review list for search
  const filteredReviewItems = useMemo(() => {
    if (!reviewSearch.trim()) return reviewItems;
    const q = reviewSearch.toLowerCase();
    return reviewItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.flavor && item.flavor.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [reviewItems, reviewSearch]);

  const validReviewCount = reviewItems.filter((r) => r.isValid).length;
  const invalidReviewCount = reviewItems.length - validReviewCount;

  const totalRetailSum = reviewItems
    .filter((r) => r.isValid)
    .reduce((sum, r) => sum + r.price * (r.stock || 1), 0);

  const totalCostSum = reviewItems
    .filter((r) => r.isValid && r.cost_price)
    .reduce((sum, r) => sum + (r.cost_price || 0) * (r.stock || 1), 0);

  const totalMarginSum = totalRetailSum - totalCostSum;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#141221] border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header with Steps */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white leading-tight">Импорт и модерация товаров</h3>
                {/* Step indicator badge */}
                {!resultSummary && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Шаг {currentStep === 'input' ? '1 из 2: Ввод данных' : '2 из 2: Проверка и правка'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                {currentStep === 'input'
                  ? 'Вставьте ответ нейросети, скопированные ячейки Excel или сгенерируйте по вкусам'
                  : 'Проверьте распознанные поля, исправьте цены и категории перед добавлением в каталог'}
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

        {/* STEP 1: INPUT MODES */}
        {currentStep === 'input' && !resultSummary && (
          <>
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
                <FileText className="w-3.5 h-3.5" />
                <span>Ответ ИИ / Таблица</span>
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

            {/* Input Content Area */}
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-0.5">
              {/* MODE 1: AI / TABLE TEXT INPUT */}
              {activeMode === 'table' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">
                      Вставьте ответ нейросети (с разделителем "|") или ячейки из Excel:
                    </span>
                    <button
                      onClick={handleDownloadSample}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      <span>Скачать образец TSV</span>
                    </button>
                  </div>

                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="HQD Cuvie Plus 1200 - Черника | 22.00 | Одноразовые ЭС | HQD | Cuvie Plus 1200 | Черника | 20 мг | 15 | 12.50&#10;Lost Mary BM5000 - Клубника Банан | 35.00 | Одноразовые ЭС | Lost Mary | BM5000 | Клубника Банан | 20 мг Hard | 10 | 19.00&#10;Жидкость Brusko Salt 30ml - Ягодный микс | 18.00 | Жидкости | Brusko | Salt 30ml | Ягодный микс | 20 мг | 20 | 9.00"
                    rows={8}
                    className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono resize-none leading-relaxed"
                  />

                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-zinc-300 flex items-center justify-between gap-2">
                    <div>
                      💡 Поддерживает разделители <code className="text-purple-300 font-mono font-bold">|</code>, табуляцию (Excel), точку с запятой <code className="text-purple-300 font-mono">;</code> и запятую.
                    </div>
                    {inputText.length === 0 && (
                      <button
                        onClick={() => {
                          setInputText(
                            `HQD Cuvie Plus 1200 - Черника | 22.00 | Одноразовые ЭС | HQD | Cuvie Plus 1200 | Черника | 20 мг | 15 | 12.50\nLost Mary BM5000 - Клубника Банан | 35.00 | Одноразовые ЭС | Lost Mary | BM5000 | Клубника Банан | 20 мг Hard | 10 | 19.00\nVaporesso XROS 3 Mini Kit Space Grey | 75.00 | POD-системы | Vaporesso | XROS 3 Mini | — | — | 5 | 45.00\nКартридж Vaporesso XROS 0.8 Ом | 12.00 | Расходники | Vaporesso | XROS Series | — | — | 30 | 6.50\nЖидкость Brusko Salt 30ml - Ягодный микс | 18.00 | Жидкости | Brusko | Salt 30ml | Ягодный микс | 20 мг | 20 | 9.00`
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[10px] font-bold shrink-0 border border-purple-500/40"
                      >
                        Вставить демо-пример
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: FLAVOR GENERATOR */}
              {activeMode === 'generator' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300 leading-relaxed">
                    💡 <b>Быстрый генератор:</b> Задайте бренд, категорию и цены, затем вставьте список вкусов с новой строки — карточки сформируются автоматически для модерации.
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
                      />
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
                      rows={6}
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

              {/* Mini Quick Preview Counter */}
              {parsedRows.length > 0 && (
                <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">
                      Распознано строк: <b className="text-purple-300">{parsedRows.length} шт.</b>
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Нажмите «Перейти к проверке», чтобы отредактировать поля
                  </span>
                </div>
              )}
            </div>

            {/* Step 1 Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  hapticImpact('light');
                  onClose();
                }}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
              >
                Отмена
              </button>

              <button
                onClick={handleProceedToReview}
                disabled={parsedRows.length === 0}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  parsedRows.length > 0
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <span>Перейти к проверке ({parsedRows.length} поз.)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* STEP 2: MODERATION & REVIEW TABLE */}
        {currentStep === 'review' && !resultSummary && (
          <>
            {/* Moderation Toolbar */}
            <div className="space-y-2.5 my-2 shrink-0">
              {/* Stats Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                  <div className="text-[10px] text-zinc-400 font-semibold uppercase">Товаров к импорту</div>
                  <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <span>{validReviewCount}</span>
                    {invalidReviewCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                        {invalidReviewCount} с ошибкой
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                  <div className="text-[10px] text-zinc-400 font-semibold uppercase">Сумма розницы</div>
                  <div className="text-sm font-extrabold text-purple-300">{totalRetailSum.toFixed(2)} BYN</div>
                </div>

                {isAdmin && (
                  <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase">Себестоимость партии</div>
                    <div className="text-sm font-extrabold text-zinc-300">{totalCostSum.toFixed(2)} BYN</div>
                  </div>
                )}

                {isAdmin && (
                  <div className="p-2.5 rounded-2xl bg-black/40 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 font-semibold uppercase">Ожидаемая маржа</div>
                    <div className="text-sm font-extrabold text-emerald-400">+{totalMarginSum.toFixed(2)} BYN</div>
                  </div>
                )}
              </div>

              {/* Action Toolbar: Search + Bulk Actions + Add Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-black/40 rounded-2xl border border-white/5">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Поиск по названию, бренду, вкусу..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Bulk Category Assign */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="">Категория для всех...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {bulkCategory && (
                    <button
                      onClick={handleApplyBulkCategory}
                      title="Применить ко всем товарам в списке"
                      className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bulk Stock */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    placeholder="Остаток всем..."
                    className="w-24 p-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                  />
                  {bulkStock && (
                    <button
                      onClick={handleApplyBulkStock}
                      title="Установить остаток всем товарам"
                      className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Add Manual Item */}
                <button
                  onClick={handleAddNewItem}
                  className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-purple-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить строку</span>
                </button>
              </div>
            </div>

            {/* Interactive Review Table */}
            <div className="flex-1 overflow-y-auto border border-white/10 rounded-2xl bg-black/60 no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#171526] text-zinc-400 border-b border-white/10 text-[10px] uppercase z-10">
                  <tr>
                    <th className="p-2 w-8 text-center">№</th>
                    <th className="p-2 min-w-[200px]">Название товара</th>
                    <th className="p-2 min-w-[130px]">Категория</th>
                    <th className="p-2 min-w-[100px]">Бренд / Вкус</th>
                    <th className="p-2 w-20 text-right">Розница</th>
                    {isAdmin && <th className="p-2 w-20 text-right text-emerald-400">Себест.</th>}
                    <th className="p-2 w-16 text-right">Остаток</th>
                    <th className="p-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReviewItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">
                        Ничего не найдено по вашему запросу
                      </td>
                    </tr>
                  ) : (
                    filteredReviewItems.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={`transition-colors ${
                          !item.isValid
                            ? 'bg-red-500/10 hover:bg-red-500/15'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Number & Status */}
                        <td className="p-2 text-center text-[10px] text-zinc-500">
                          {item.isValid ? (
                            <span>{idx + 1}</span>
                          ) : (
                            <span title={item.error} className="text-red-400 font-bold">⚠️</span>
                          )}
                        </td>

                        {/* Name Input */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            placeholder="Название товара..."
                            className={`w-full p-1.5 rounded-lg bg-black/40 border text-xs text-white focus:outline-none ${
                              !item.name ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-purple-500'
                            }`}
                          />
                        </td>

                        {/* Category Select */}
                        <td className="p-2">
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                            className="w-full p-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.slug}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Brand & Flavor */}
                        <td className="p-2">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={item.brand || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'brand', e.target.value)}
                              placeholder="Бренд"
                              className="w-1/2 p-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-zinc-200 focus:outline-none focus:border-purple-500"
                            />
                            <input
                              type="text"
                              value={item.flavor || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'flavor', e.target.value)}
                              placeholder="Вкус"
                              className="w-1/2 p-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-zinc-200 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </td>

                        {/* Retail Price */}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.1"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                            className={`w-full p-1.5 text-right font-bold rounded-lg bg-black/40 border text-xs text-white focus:outline-none ${
                              item.price <= 0 ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-purple-500'
                            }`}
                          />
                        </td>

                        {/* Cost Price */}
                        {isAdmin && (
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.1"
                              value={item.cost_price ?? ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateItem(item.id, 'cost_price', e.target.value)}
                              className="w-full p-1.5 text-right rounded-lg bg-black/40 border border-emerald-500/20 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                        )}

                        {/* Stock */}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={item.stock ?? 10}
                            onChange={(e) => handleUpdateItem(item.id, 'stock', parseInt(e.target.value, 10) || 0)}
                            className="w-full p-1.5 text-right rounded-lg bg-black/40 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                          />
                        </td>

                        {/* Delete Action */}
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            title="Удалить позицию"
                            className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Step 2 Footer: Back + Confirm Import */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => {
                  hapticImpact('light');
                  setCurrentStep('input');
                }}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад к вводу</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    hapticImpact('light');
                    onClose();
                  }}
                  className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-bold transition-all"
                >
                  Отмена
                </button>

                <button
                  onClick={handleExecuteFinalImport}
                  disabled={validReviewCount === 0 || isProcessing}
                  className={`py-3 px-6 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    validReviewCount > 0 && !isProcessing
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Загрузка...' : `Загрузить в каталог (${validReviewCount} шт.)`}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* STEP 3: RESULT SUMMARY */}
        {resultSummary && (
          <div className="p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 text-3xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Импорт и пополнение успешно завершены!</h4>
            <div className="space-y-1 text-xs text-zinc-300">
              <p>
                Всего обработано позиций: <b className="text-emerald-400">{resultSummary.count} шт.</b>
              </p>
              <div className="flex justify-center gap-4 pt-1">
                {resultSummary.addedCount !== undefined && (
                  <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold">
                    ✨ Новых карточек: <b>{resultSummary.addedCount}</b>
                  </span>
                )}
                {resultSummary.updatedCount !== undefined && resultSummary.updatedCount > 0 && (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                    📦 Пополнен остаток (стак): <b>{resultSummary.updatedCount}</b>
                  </span>
                )}
              </div>
            </div>
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
                setCurrentStep('input');
                setInputText('');
                setFlavorsList('');
                setReviewItems([]);
                onClose();
              }}
              className="py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
            >
              Вернуться в каталог
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
