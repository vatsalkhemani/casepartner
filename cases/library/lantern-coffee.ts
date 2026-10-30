import { CasePack } from "../../src/lib/case/schema";

// Original case written for this product. Not taken from any casebook.
// Numbers reconcile: revenue $46.3M -> $50.0M (+8%), costs $40.3M -> $46.0M,
// operating profit $6.0M -> $4.0M.

export const lanternCoffee = CasePack.parse({
  id: "lantern-coffee",
  title: "Lantern Coffee",
  version: 1,
  source: { kind: "original" },
  meta: {
    formats: ["candidate_led", "interviewer_led"],
    type: "Profitability",
    industry: "Restaurants and cafés",
    difficulty: 1,
    stretchArea: "Exhibit analysis",
    minutes: 25,
  },
  client: "Lantern Coffee",
  prompt: {
    readAloud:
      "Your client is Lantern Coffee, a chain of 40 cafés across the Pacific Northwest. Last year revenue grew 8 percent, to 50 million dollars, but operating profit fell from 6 million to 4 million. The CEO, Maya Ortiz, wants to understand why profit fell, and what Lantern should do to get it back.",
    objective: "Explain the profit decline and recommend how to return to $6M operating profit.",
  },
  clarifyingFacts: [
    {
      id: "goal",
      topic: "Objective and timeline",
      keywords: ["goal", "objective", "success", "target", "timeline", "timeframe", "how long", "by when"],
      answer: "Maya wants operating profit back to 6 million dollars within two years, without shrinking the business.",
    },
    {
      id: "model",
      topic: "Business model",
      keywords: ["business model", "make money", "revenue streams", "sell", "products", "drinks", "food", "mix"],
      answer: "Lantern sells drinks and food. Drinks are about 70 percent of revenue and food about 30 percent. The average ticket is around 9 dollars.",
    },
    {
      id: "geo",
      topic: "Geography and footprint",
      keywords: ["where", "geography", "locations", "cities", "stores", "cafés", "cafes", "footprint", "new cafés", "new stores", "opened"],
      answer: "All 40 cafés are in Seattle and Portland. No cafés opened or closed in the last two years.",
    },
    {
      id: "revenue",
      topic: "Revenue drivers",
      keywords: ["revenue", "price", "pricing", "volume", "transactions", "customers", "traffic", "sales growth"],
      answer: "Prices went up about 3 percent at the start of last year, and transactions grew about 5 percent. Food revenue grew faster than drinks, roughly 20 percent, after a menu expansion.",
    },
    {
      id: "market",
      topic: "Market and competition",
      keywords: ["market", "competition", "competitor", "competitors", "industry", "starbucks"],
      answer: "The specialty coffee market in the region grew about 3 percent. No major new competitors opened near Lantern's cafés.",
    },
  ],
  opening: { expectedClarifiers: ["objective or target", "business model or revenue mix", "geography or footprint"] },
  sampleFramework: {
    buckets: [
      "Did revenue fall short? Price, volume and mix by drinks and food",
      "Did costs rise faster than revenue? Variable costs (ingredients, waste, labour) and fixed costs (rent, admin)",
      "Is it the market? Demand and competition in Seattle and Portland",
      "What would get profit back to $6M, and what are the risks?",
    ],
    hypothesis: "Revenue grew, so costs most likely grew faster, probably tied to the menu expansion.",
  },
  parts: [
    {
      id: "costs",
      kind: "exhibit",
      question: "Our team pulled together Lantern's operating costs for the last two years. Take a look. What stands out to you?",
      unlockKeywords: ["cost", "costs", "expense", "expenses", "p&l", "spend", "cost breakdown", "cost structure", "margin"],
      exhibits: ["A"],
      facts: [],
      expected: {
        insights: [
          "Labour is the biggest increase, up $2.6M or about 19%, more than twice the 8% revenue growth",
          "Food ingredients and food waste together grew about 39%, roughly double food revenue growth",
          "Food waste more than doubled, from $0.5M to $1.2M",
          "Rent and marketing are roughly flat, so this is a variable-cost story, not fixed costs",
        ],
        numeric: [],
      },
      checks: [
        "States what the exhibit shows before interpreting it",
        "Identifies labour as the largest increase",
        "Compares cost growth to revenue growth rather than reading raw numbers",
        "Notices food waste more than doubled",
        "Gives a so-what and a next step",
      ],
      nudges: {
        l1: "What jumps out when you compare those increases to how much revenue grew?",
        l2: "Which lines grew faster than revenue, and which barely moved?",
        l3: "Look at labour in particular. How fast did it grow compared with the 8 percent revenue growth?",
        l4: "Labour grew about 19 percent, more than twice as fast as revenue, and food waste more than doubled. Let's dig into labour.",
      },
      commonMistakes: [
        { pattern: "Reads numbers back without comparing them to revenue growth", probe: "And how does that compare with revenue?" },
        { pattern: "Focuses on rent or marketing", probe: "How much did those actually change year over year?" },
      ],
    },
    {
      id: "labour-math",
      kind: "math",
      question: "Let's size it. If labour costs had grown in line with revenue, at 8 percent, what would operating profit have been last year?",
      unlockKeywords: ["labour", "labor", "size", "how much", "quantify", "impact of labour"],
      exhibits: [],
      facts: [],
      expected: {
        insights: ["Labour growing faster than revenue explains roughly three quarters of the $2M profit drop"],
        numeric: [
          {
            id: "labour-gap",
            label: "Excess labour cost versus 8% growth",
            value: 1.48,
            unit: "$M",
            tolerancePct: 12, // rounding 14 x 1.08 to 15 gives 1.6, which a caser accepts
            steps: ["Labour at 8% growth: 14.0 x 1.08 = 15.12", "Actual labour: 16.6", "Gap: 16.6 - 15.12 = 1.48"],
          },
          {
            id: "profit-if-labour-8",
            label: "Operating profit if labour grew 8%",
            value: 5.48,
            unit: "$M",
            tolerancePct: 4,
            steps: ["4.0 + 1.48 = 5.48, about 5.5 million"],
          },
        ],
      },
      checks: [
        "States the approach before calculating",
        "Gets about $1.5M of excess labour or about $5.5M of profit",
        "Says what it means: labour explains roughly three quarters of the drop",
      ],
      nudges: {
        l1: "How would you set that up before you calculate?",
        l2: "Start with what labour would have cost at 8 percent growth.",
        l3: "Labour was 14.0 million the year before. What is 14.0 grown by 8 percent?",
        l4: "At 8 percent growth labour would have been about 15.1 million, so the extra 1.5 million brings profit to about 5.5 million. That's roughly three quarters of the drop.",
      },
      commonMistakes: [
        { pattern: "Applies 8% to the wrong year's labour figure", probe: "Which year's labour are you growing from?" },
        { pattern: "Stops at the labour number without the profit impact", probe: "And what does that mean for profit?" },
      ],
    },
    {
      id: "operations",
      kind: "exhibit",
      question: "Our operations team sent over some data on how the cafés run day to day. What does it tell you about why labour and waste went up?",
      unlockKeywords: ["why", "staff", "staffing", "hours", "scheduling", "operations", "menu", "waste", "productivity", "prep"],
      exhibits: ["B"],
      facts: [
        {
          id: "menu-why",
          topic: "Why the menu expanded",
          keywords: ["why menu", "why did they", "expansion reason", "reason"],
          answer: "The menu was expanded to grow food sales and compete with bakery cafés. Most new items are made fresh in each café every morning.",
          volunteerUpfront: false,
        },
      ],
      expected: {
        insights: [
          "The menu went from 12 to 30 food items, and most new items are prepared in-café, which adds prep labour",
          "Staff hours rose about 16% while transactions rose about 5%, so productivity fell",
          "The top 10 items still make most food sales, so the long tail adds cost and waste without much revenue",
        ],
        numeric: [],
      },
      checks: [
        "Links the menu expansion to both labour and waste",
        "Uses productivity (transactions per labour hour) rather than raw hours",
        "Notices the top items still drive most food sales",
      ],
      nudges: {
        l1: "What changed in how the cafés operate between the two years?",
        l2: "How do the staff hours compare with how many transactions they served?",
        l3: "Look at the number of menu items and how much of food sales the top 10 items still make.",
        l4: "The menu more than doubled, but the top 10 items still drive about three quarters of food sales. The extra items add prep labour and waste without much revenue.",
      },
      commonMistakes: [{ pattern: "Treats more staff hours as a good sign of growth", probe: "Did transactions grow as fast as hours?" }],
    },
    {
      id: "ideas",
      kind: "brainstorm",
      question: "Maya doesn't want to hurt sales. What could Lantern do to get profit back to 6 million?",
      unlockKeywords: ["ideas", "options", "levers", "what could", "how to fix", "recommend", "solutions"],
      exhibits: [],
      facts: [],
      expected: {
        insights: [],
        numeric: [],
        ideas: {
          examples: [
            "Cut the menu back to the best sellers",
            "Move prep of slow items to a central kitchen",
            "Schedule staff to demand by hour",
            "Bake to demand forecasts to cut waste",
            "Discount food late in the day",
            "Make some items to order instead of in advance",
            "Renegotiate dairy and ingredient contracts",
            "Raise prices on low-margin items",
            "Push higher-margin drink add-ons",
          ],
          min: 4,
          standout: 7,
        },
      },
      checks: [
        "Gives at least four ideas",
        "Groups ideas into buckets with a short overview first",
        "Ties ideas to labour and waste found earlier",
        "Respects the constraint of not hurting sales",
      ],
      nudges: {
        l1: "Anything else?",
        l2: "What about the labour side specifically?",
        l3: "Think about the menu itself, and how food is prepared.",
        l4: "Good ideas here would be trimming the menu, scheduling staff to demand, and baking to forecast to cut waste.",
      },
      commonMistakes: [{ pattern: "Suggests closing cafés or cutting staff broadly", probe: "How would that affect sales, given Maya's constraint?" }],
    },
  ],
  synthesis: {
    question: "Maya is about to walk in. What do you tell her?",
    recommendation:
      "Cut the expanded menu back toward its best sellers and schedule staff to demand. That brings labour back in line with revenue, about 1.5 million, and waste back to its old level, about 0.6 million, which returns profit to roughly 6 million.",
    reasons: [
      "Labour grew about 19% against 8% revenue growth, about $1.5M of the $2M drop",
      "Food waste more than doubled after the menu went from 12 to 30 items",
    ],
    risks: ["Regulars who like the new items", "Execution risk in changing schedules across 40 cafés"],
    nextSteps: ["Pilot the trimmed menu and demand-based scheduling in five cafés for four weeks", "Track sales, labour per transaction and waste weekly"],
  },
  exhibits: [
    {
      id: "A",
      label: "Exhibit A",
      title: "Lantern Coffee operating costs",
      table: {
        columns: ["Cost line", "Two years ago", "Last year"],
        unit: "$ millions",
        rows: [
          ["Drink ingredients (coffee, dairy)", 8.0, 9.2],
          ["Food ingredients", 4.4, 5.4],
          ["Food waste written off", 0.5, 1.2],
          ["Labour", 14.0, 16.6],
          ["Rent and occupancy", 8.4, 8.6],
          ["Marketing and admin", 5.0, 5.0],
          ["Total operating costs", 40.3, 46.0],
        ],
        note: "Revenue: $46.3M two years ago, $50.0M last year.",
      },
      source: "Lantern Coffee finance team",
    },
    {
      id: "B",
      label: "Exhibit B",
      title: "How the cafés run",
      table: {
        columns: ["Measure", "Two years ago", "Last year"],
        rows: [
          ["Food items on the menu", 12, 30],
          ["Staff hours per café per week", 560, 650],
          ["Transactions per labour hour", 14.0, 12.5],
          ["Food waste, % of food revenue", "4%", "8%"],
          ["Share of food sales from top 10 items", "91%", "76%"],
        ],
      },
      source: "Lantern Coffee operations team",
    },
  ],
  interviewerNotes: [
    "Candidate-led: let the candidate ask for cost data before showing Exhibit A.",
    "If the structure skips costs entirely, probe once: anything on the cost side?",
    "Push for at least four ideas in the brainstorm. Top candidates give seven or eight.",
    "A strong recommendation closes the math: 4.0 + 1.5 + 0.6 is about 6 million.",
  ],
});
