export interface InventoryPromptData {
  daysAhead: number;
  currentStock: Array<{
    name: string;
    currentStock: string;
    minStockLevel: string;
    unit: string;
    avgCost: string;
    daysRemaining: number | null;
  }>;
  topUsedItems: Array<{ name: string; totalUsed: string; unit: string }>;
}

export const buildInventoryPrompt = (data: InventoryPromptData): string => `
Ту мутахассиси идоракунии анбор барои кондитерияи "Choco Berry" ҳастӣ.
Ҷавобро ФАҚАТ дар забони тоҷикӣ деҳ.

ҲОЛАТИ КУНУНИИ АНБОР:
${JSON.stringify(data.currentStock, null, 2)}

МОЛҲОИ ЗИЁДТАР ИСТИФОДАШАВАНДА (30 рӯзи охир):
${JSON.stringify(data.topUsedItems, null, 2)}

Пешгӯӣ кун барои ${data.daysAhead} рӯзи оянда.
Ҷавоб деҳ ФАҚАТ дар формати JSON (бе матни иловагӣ):
{
  "criticalItems": [
    {
      "name": "...",
      "currentStock": "...",
      "willRunOutIn": "X рӯз",
      "orderNow": 0,
      "unit": "...",
      "urgency": "critical"
    }
  ],
  "orderList": [
    {
      "name": "...",
      "amount": 0,
      "unit": "...",
      "estimatedCost": 0,
      "urgency": "critical"
    }
  ],
  "totalOrderCost": 0,
  "notes": "маслиҳати умумӣ..."
}
`;
