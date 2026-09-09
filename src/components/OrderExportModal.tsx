import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Order } from '../types';
import { parseDate } from '../utils/date';
import {
  X,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Calendar,
  Filter,
  Layers,
} from 'lucide-react';
import { hapticImpact, hapticNotification } from '../services/telegram';

interface OrderExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderExportModal: React.FC<OrderExportModalProps> = ({ isOpen, onClose }) => {
  const { orders, isAdmin } = useStore();

  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const filteredOrders = useMemo(() => {
    if (!isOpen) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return orders.filter((o) => {
      const orderTime = o.created_at ? parseDate(o.created_at).getTime() : now.getTime();

      if (period === 'today' && orderTime < startOfToday) return false;
      if (period === 'week' && orderTime < sevenDaysAgo) return false;
      if (period === 'month' && orderTime < thirtyDaysAgo) return false;

      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      return true;
    });
  }, [orders, period, statusFilter]);

  const generateExportData = () => {
    return filteredOrders.map((o) => {
      const itemsList = o.items_json
        .map((i) => `${i.brand_name ? `[${i.brand_name}] ` : ''}${i.name} (x${i.quantity}) — ${i.price} BYN`)
        .join('; ');

      const totalMargin = o.total_margin ?? (o.total * 0.6);

      return {
        id: o.id,
        created_at: o.created_at || '',
        status: o.status,
        username: o.username ? `@${o.username}` : '',
        user_id: o.user_id,
        phone: o.phone || '',
        delivery_type: o.delivery_type === 'pickup' ? 'Самовывоз (Встреча)' : 'Доставка курьером',
        delivery_address: o.delivery_type === 'pickup' ? (o.pickup_point_name || 'Точка') : (o.delivery_address || ''),
        items: itemsList,
        subtotal: o.subtotal,
        discount: o.discount_amount || 0,
        delivery_cost: o.delivery_price || 0,
        total: o.total,
        margin: totalMargin,
        comment: o.comment || '',
      };
    });
  };

  const handleExportCSV = () => {
    const data = generateExportData();
    let csv = '\uFEFF'; // UTF-8 BOM for Excel

    const headers = [
      'ID Заказа',
      'Дата и время',
      'Статус',
      'Клиент (Username)',
      'Telegram ID',
      'Телефон',
      'Способ получения',
      'Адрес / Точка',
      'Состав заказа',
      'Сумма товаров (BYN)',
      'Скидка (BYN)',
      'Доставка (BYN)',
      'Итого (BYN)',
    ];

    if (isAdmin) {
      headers.push('Чистая прибыль (BYN)');
    }
    headers.push('Комментарий');

    csv += headers.join(';') + '\n';

    for (const r of data) {
      const row = [
        r.id,
        `"${r.created_at}"`,
        r.status,
        `"${r.username}"`,
        r.user_id,
        `"${r.phone}"`,
        `"${r.delivery_type}"`,
        `"${r.delivery_address.replace(/"/g, '""')}"`,
        `"${r.items.replace(/"/g, '""')}"`,
        r.subtotal.toFixed(2),
        r.discount.toFixed(2),
        r.delivery_cost.toFixed(2),
        r.total.toFixed(2),
      ];

      if (isAdmin) {
        row.push(r.margin.toFixed(2));
      }
      row.push(`"${r.comment.replace(/"/g, '""')}"`);

      csv += row.join(';') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `puff_orders_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hapticNotification('success');
  };

  const handleExportExcel = () => {
    const data = generateExportData();

    let html = `<html><head><meta charset="utf-8"><style>
      table { border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
      th { background-color: #7c3aed; color: #ffffff; padding: 8px; border: 1px solid #ddd; }
      td { padding: 6px 8px; border: 1px solid #ddd; }
      .num { text-align: right; }
      .profit { color: #059669; font-weight: bold; }
    </style></head><body>`;

    html += `<h3>Отчет по заказам Puff Shop Mogilev (${new Date().toLocaleDateString('ru-RU')})</h3>`;
    html += `<table><thead><tr>
      <th>#</th>
      <th>Дата</th>
      <th>Статус</th>
      <th>Клиент</th>
      <th>TG ID</th>
      <th>Способ доставки</th>
      <th>Адрес / Точка</th>
      <th>Товары</th>
      <th>Товары (BYN)</th>
      <th>Скидка</th>
      <th>Доставка</th>
      <th>Итого (BYN)</th>`;

    if (isAdmin) {
      html += `<th>Прибыль (BYN)</th>`;
    }
    html += `<th>Комментарий</th></tr></thead><tbody>`;

    for (const r of data) {
      html += `<tr>
        <td>${r.id}</td>
        <td>${r.created_at}</td>
        <td>${r.status}</td>
        <td>${r.username}</td>
        <td>${r.user_id}</td>
        <td>${r.delivery_type}</td>
        <td>${r.delivery_address}</td>
        <td>${r.items}</td>
        <td class="num">${r.subtotal.toFixed(2)}</td>
        <td class="num">${r.discount.toFixed(2)}</td>
        <td class="num">${r.delivery_cost.toFixed(2)}</td>
        <td class="num"><b>${r.total.toFixed(2)}</b></td>`;

      if (isAdmin) {
        html += `<td class="num profit">+${r.margin.toFixed(2)}</td>`;
      }
      html += `<td>${r.comment}</td></tr>`;
    }

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `puff_orders_table_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hapticNotification('success');
  };

  const handleCopyClipboard = () => {
    const data = generateExportData();
    let text = 'ID\tДата\tСтатус\tКлиент\tТелефон\tСпособ\tАдрес\tТовары\tИтого';
    if (isAdmin) text += '\tМаржа';
    text += '\n';

    for (const r of data) {
      text += `${r.id}\t${r.created_at}\t${r.status}\t${r.username}\t${r.phone}\t${r.delivery_type}\t${r.delivery_address}\t${r.items}\t${r.total.toFixed(2)}`;
      if (isAdmin) text += `\t${r.margin.toFixed(2)}`;
      text += '\n';
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    hapticNotification('success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#141221] border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Экспорт заказов и отчетов</h3>
              <p className="text-[11px] text-zinc-400">
                Выгрузка базы заказов в Excel, CSV или копирование в буфер
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

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Период</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
            >
              <option value="all">За все время</option>
              <option value="today">Только сегодня</option>
              <option value="week">За последние 7 дней</option>
              <option value="month">За последние 30 дней</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Статус заказов</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Новые (в обработке)</option>
              <option value="confirmed">Подтвержденные</option>
              <option value="completed">Только выполненные</option>
              <option value="cancelled">Отмененные</option>
            </select>
          </div>
        </div>

        {/* Summary Card */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Найдено заказов:</span>
            <span className="font-bold text-white">{filteredOrders.length}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Сумма выручки:</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
              {filteredOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)} BYN
            </span>
          </div>
          {isAdmin && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-400 font-semibold">Чистая прибыль:</span>
              <span className="font-bold text-emerald-300">
                +{filteredOrders.reduce((sum, o) => sum + (o.total_margin ?? o.total * 0.6), 0).toFixed(2)} BYN
              </span>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleExportExcel}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Скачать таблицу Excel (.xls)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Скачать файл CSV (UTF-8)</span>
          </button>

          <button
            onClick={handleCopyClipboard}
            className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Скопировано в буфер!' : 'Скопировать для Google Sheets'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-white/10">
          <button
            onClick={() => {
              hapticImpact('light');
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
