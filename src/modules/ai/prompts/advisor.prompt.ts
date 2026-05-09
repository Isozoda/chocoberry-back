export interface AdvisorPromptData {
  monthlySales: string;
  monthlyExpenses: string;
  netProfit: string;
  topProducts: Array<{ name: string; revenue: string }>;
  lowProducts: Array<{ name: string; revenue: string }>;
  inventory: Array<{ name: string; currentStock: string; unit: string; daysRemaining: number | null }>;
  fixedExpenses: Array<{ name: string; amount: string; period: string }>;
  question?: string;
}

export const buildAdvisorPrompt = (data: AdvisorPromptData): string => `
Ту маслиҳатчии тиҷоратии "Choco Berry" ҳастӣ — кондитерияи тоҷикӣ.
Маълумоти пурраи тиҷоратро таҳлил карда маслиҳат деҳ. Ҷавоб ФАҚАТ тоҷикӣ.

МАЪЛУМОТИ ТИҶОРАТ (30 рӯзи охир):
- Фурӯши умумӣ: ${data.monthlySales} сомонӣ
- Хароҷоти умумӣ: ${data.monthlyExpenses} сомонӣ
- Фоидаи холис: ${data.netProfit} сомонӣ

МОЛҲОИ СЕРФУРӮШ:
${JSON.stringify(data.topProducts, null, 2)}

МОЛҲОИ КАМФУРӮШ:
${JSON.stringify(data.lowProducts, null, 2)}

ҲОЛАТИ АНБОР:
${JSON.stringify(data.inventory, null, 2)}

ХАРОҶОТҲОИ ДОИМӢ:
${JSON.stringify(data.fixedExpenses, null, 2)}

${data.question ? `САВОЛ АЗ СОҲИБ: ${data.question}` : 'Маслиҳати ҳафтагӣ деҳ.'}

Ҷавоб деҳ ФАҚАТ дар формати JSON:
{
  "weeklyAdvice": "...",
  "answerToQuestion": "...",
  "actions": [
    {
      "type": "UPDATE_INVENTORY | CREATE_EXPENSE | PROCESS_DAILY_REPORT",
      "params": {
        // Барои PROCESS_DAILY_REPORT:
        "sales": [ { "location": "...", "amount": 0 } ],
        "fixedExpenses": [ { "name": "...", "monthlyAmount": 0 } ],
        "dailyExpenses": [ { "name": "...", "amount": 0 } ],
        
        // Барои дигарон:
        "itemName": "...", "quantity": 0, "type": "IN|OUT",
        "amount": 0, "category": "...", "note": "..."
      }
    }
  ]
}

ЭЗОҲИ МУҲИМ БАРОИ "PROCESS_DAILY_REPORT":
1. Агар корбар фурӯши якрӯзаро барои чанд нуқта диҳад, аз ин амал истифода бар.
2. Агар корбар дар бораи иҷора (аренда) ё дигар хароҷоти моҳона гӯяд, онҳоро дар "fixedExpenses" дохил кун. Система худаш онро ба 30 тақсим карда, ҳиссаи якрӯзаро мебарорад.
3. Агар корбар хароҷоти мушаххаси имрӯзаро (масалан: "барои клубника 500см додам") гӯяд, онҳоро дар "dailyExpenses" дохил кун.

`;
