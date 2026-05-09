export interface SalesPromptData {
  period: string;
  totalSales: string;
  totalExpenses: string;
  netProfit: string;
  salesCount: number;
  topProducts: Array<{ name: string; qty: number; revenue: string }>;
  dailySales: Array<{ date: string; total: string }>;
  expenseBreakdown: Array<{ expenseType: string; total: string }>;
}

export const buildSalesPrompt = (data: SalesPromptData): string => `
Ту таҳлилгари молиявии Choco Berry ҳастӣ — кондитерияи тоҷикӣ.
Маълумоти зерро таҳлил кун ва ҷавобро ФАҚАТ дар забони тоҷикӣ деҳ.

ДАВРА: ${data.period}
НИШОНДИҲАНДАҲО:
- Умумии фурӯш: ${data.totalSales} сомонӣ
- Умумии хароҷот: ${data.totalExpenses} сомонӣ
- Фоидаи холис: ${data.netProfit} сомонӣ
- Шумораи фурӯш: ${data.salesCount}

МОЛҲОИ БЕҲТАРИНИ ФУРӮШ:
${JSON.stringify(data.topProducts, null, 2)}

ФУРӮШ БА РӮЗ:
${JSON.stringify(data.dailySales, null, 2)}

ТАҚСИМИ ХАРОҶОТ:
${JSON.stringify(data.expenseBreakdown, null, 2)}

Ҷавоб деҳ ФАҚАТ дар формати JSON (бе ягон матни иловагӣ):
{
  "summary": "хулосаи кӯтоҳ 2-3 ҷумла дар тоҷикӣ",
  "insights": [
    { "type": "positive", "text": "..." },
    { "type": "negative", "text": "..." },
    { "type": "warning", "text": "..." }
  ],
  "recommendations": [
    { "priority": "high", "action": "...", "reason": "..." },
    { "priority": "medium", "action": "...", "reason": "..." },
    { "priority": "low", "action": "...", "reason": "..." }
  ],
  "forecast": {
    "nextPeriodRevenue": 0,
    "confidence": 75
  }
}
`;
