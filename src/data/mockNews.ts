export type Topic =
  | "Politics" | "Economics" | "Sports" | "World" | "Tech"
  | "Lifestyle" | "Health" | "Entertainment" | "Editorial" | "Academia";

export const TOPICS: Topic[] = [
  "Politics", "Economics", "Sports", "World", "Tech",
  "Lifestyle", "Health", "Entertainment", "Editorial", "Academia",
];
export type Bias = "Left" | "Lean Left" | "Center" | "Lean Right" | "Right";
export type RelationType = "causal" | "temporal" | "thematic";

export interface NewsEvent {
  id: string;
  title: string;
  summary: string;
  topic: Topic;
  timestamp: string; // ISO
  articleIds: string[];
}

export interface Article {
  id: string;
  eventId: string;
  headline: string;
  source: string;
  sourceBias: Bias;
  url: string;
  framingNote: string;
}

export interface Relation {
  fromEventId: string;
  toEventId: string;
  type: RelationType;
  strength: number; // 0..1
}

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

export const events: NewsEvent[] = [
  { id: "e1", title: "Fed raises rates 0.25%", summary: "FOMC lifts the federal funds rate by a quarter point, citing sticky core inflation.", topic: "Economics", timestamp: hoursAgo(2), articleIds: ["a1","a2","a3","a4"] },
  { id: "e2", title: "Powell signals 'higher for longer'", summary: "Chair Powell's press conference emphasizes prolonged restrictive policy.", topic: "Economics", timestamp: hoursAgo(1.5), articleIds: ["a5","a6","a7"] },
  { id: "e3", title: "S&P 500 falls 1.8%", summary: "U.S. equities slide as traders reprice rate-cut expectations.", topic: "Economics", timestamp: hoursAgo(1), articleIds: ["a8","a9","a10"] },
  { id: "e4", title: "10-year Treasury yield hits 4.7%", summary: "Long-end yields surge to a new cycle high.", topic: "Economics", timestamp: hoursAgo(0.8), articleIds: ["a11","a12"] },
  { id: "e5", title: "Dollar index jumps to 106", summary: "DXY rallies on widening rate differentials.", topic: "Economics", timestamp: hoursAgo(0.7), articleIds: ["a13","a14"] },
  { id: "e6", title: "Regional bank stocks tumble", summary: "KRE drops 4% as deposit-cost fears resurface.", topic: "Economics", timestamp: hoursAgo(0.6), articleIds: ["a15","a16","a17"] },
  { id: "e7", title: "Mortgage rates cross 8%", summary: "30-year fixed hits a 23-year high, pressuring housing demand.", topic: "Economics", timestamp: hoursAgo(20), articleIds: ["a18","a19"] },
  { id: "e8", title: "Tech megacaps lead market down", summary: "Nasdaq drags as duration-sensitive growth names sell off.", topic: "Tech", timestamp: hoursAgo(0.9), articleIds: ["a20","a21","a22"] },
  { id: "e9", title: "Nvidia drops 3.4% on rate fears", summary: "Chip leader pulls back after a record run.", topic: "Tech", timestamp: hoursAgo(0.85), articleIds: ["a23","a24"] },
  { id: "e10", title: "Crypto slides: BTC under $60k", summary: "Risk-off flows hit digital assets after Fed.", topic: "Tech", timestamp: hoursAgo(0.5), articleIds: ["a25","a26"] },
  { id: "e11", title: "White House defends economic record", summary: "Administration touts wage growth amid rate backlash.", topic: "Politics", timestamp: hoursAgo(0.4), articleIds: ["a27","a28","a29"] },
  { id: "e12", title: "GOP blames Biden for inflation", summary: "House Republicans call hearing on Fed and fiscal policy.", topic: "Politics", timestamp: hoursAgo(0.3), articleIds: ["a30","a31","a32"] },
  { id: "e13", title: "Senate hearing on bank stability", summary: "Banking committee questions regulators on regional bank risk.", topic: "Politics", timestamp: hoursAgo(5), articleIds: ["a33","a34"] },
  { id: "e14", title: "ECB holds rates, hints at cuts", summary: "Lagarde diverges from Fed, opening door to easing.", topic: "World", timestamp: hoursAgo(8), articleIds: ["a35","a36","a37"] },
  { id: "e15", title: "Yen hits 152, BoJ intervention watch", summary: "Japanese officials warn against 'excessive' FX moves.", topic: "World", timestamp: hoursAgo(6), articleIds: ["a38","a39"] },
  { id: "e16", title: "Oil rises on geopolitical risk", summary: "Brent climbs as Middle East tensions add risk premium.", topic: "World", timestamp: hoursAgo(10), articleIds: ["a40","a41"] },
  { id: "e17", title: "Layoffs spread in fintech", summary: "Several lenders announce headcount cuts as funding tightens.", topic: "Tech", timestamp: hoursAgo(30), articleIds: ["a42","a43"] },
  { id: "e18", title: "Consumer sentiment drops", summary: "U-Mich index falls as households feel rate squeeze.", topic: "Economics", timestamp: hoursAgo(48), articleIds: ["a44","a45"] },
  { id: "e19", title: "Swing-state polls tighten", summary: "Economy named top voter issue in new battleground survey.", topic: "Politics", timestamp: hoursAgo(60), articleIds: ["a46","a47"] },
  { id: "e20", title: "IMF warns on global growth", summary: "Fund trims 2025 forecast, citing tight financial conditions.", topic: "World", timestamp: hoursAgo(72), articleIds: ["a48","a49","a50"] },

  // Sports
  { id: "e21", title: "Champions League final set for Wembley", summary: "Two European powerhouses to meet in London after dramatic semifinal wins.", topic: "Sports", timestamp: hoursAgo(4), articleIds: ["a57","a58","a59"] },
  { id: "e22", title: "NBA MVP race tightens after 60-point night", summary: "A guard's record-breaking performance reshapes the league's award conversation.", topic: "Sports", timestamp: hoursAgo(12), articleIds: ["a60","a61","a62"] },
  // Lifestyle
  { id: "e23", title: "Slow-living trend reshapes urban cafés", summary: "Cafés in major cities ban laptops on weekends, prompting backlash and praise.", topic: "Lifestyle", timestamp: hoursAgo(18), articleIds: ["a63","a64","a65"] },
  { id: "e24", title: "Fast-fashion brand pulls record collection", summary: "Retailer withdraws a launch after viral criticism of garment quality.", topic: "Lifestyle", timestamp: hoursAgo(26), articleIds: ["a66","a67"] },
  // Health
  { id: "e25", title: "WHO flags rising drug-resistant infections", summary: "Annual report warns global antibiotic resistance is outpacing new drug development.", topic: "Health", timestamp: hoursAgo(9), articleIds: ["a68","a69","a70"] },
  { id: "e26", title: "Weekly GLP-1 supply normalizes", summary: "Manufacturers confirm production catching up with demand after a year of shortages.", topic: "Health", timestamp: hoursAgo(22), articleIds: ["a71","a72","a73"] },
  // Entertainment
  { id: "e27", title: "Streamer's prestige drama breaks viewing record", summary: "Limited series tops the platform's first-week chart, sparking awards buzz.", topic: "Entertainment", timestamp: hoursAgo(14), articleIds: ["a74","a75","a76"] },
  { id: "e28", title: "Veteran director announces final film", summary: "Filmmaker says next project will be a farewell to feature directing.", topic: "Entertainment", timestamp: hoursAgo(40), articleIds: ["a77","a78"] },
  // Editorial
  { id: "e29", title: "Editorial: Press freedom under quiet siege", summary: "Op-ed pages across the spectrum weigh in on local-news collapse.", topic: "Editorial", timestamp: hoursAgo(7), articleIds: ["a79","a80","a81"] },
  { id: "e30", title: "Opinion: The case for a four-day school week", summary: "Columnists debate evidence as more districts adopt the schedule.", topic: "Editorial", timestamp: hoursAgo(28), articleIds: ["a82","a83"] },
  // Academia (default category)
  { id: "e31", title: "Replication study challenges famous psych result", summary: "A large multi-lab effort fails to reproduce a foundational cognitive bias finding.", topic: "Academia", timestamp: hoursAgo(5), articleIds: ["a84","a85","a86"] },
  { id: "e32", title: "Open-access mandate expands across EU funders", summary: "Major European research councils tighten requirements for publishing publicly funded work.", topic: "Academia", timestamp: hoursAgo(16), articleIds: ["a87","a88","a89"] },
  { id: "e33", title: "Preprint claims room-temperature quantum coherence", summary: "Physics community reacts cautiously to bold superconductivity-adjacent claim.", topic: "Academia", timestamp: hoursAgo(11), articleIds: ["a90","a91","a92"] },
  { id: "e34", title: "AI tools reshape university grading debate", summary: "Faculty senates draft policies as detection software proves unreliable.", topic: "Academia", timestamp: hoursAgo(34), articleIds: ["a93","a94","a95","a96"] },
];

// Helper to build an article quickly
const A = (
  id: string, eventId: string, source: string, sourceBias: Bias,
  headline: string, framingNote: string
): Article => ({
  id, eventId, source, sourceBias, headline, framingNote,
  url: `https://example.com/${id}`,
});

export const articles: Article[] = [
  // e1 — Fed raises rates
  A("a1","e1","The New York Times","Lean Left","Fed Raises Rates Again, Citing Stubborn Inflation","Frames hike as cautious stewardship of a fragile recovery."),
  A("a2","e1","The Wall Street Journal","Center","Fed Lifts Rates a Quarter Point","Treats the move as widely expected; emphasizes data dependence."),
  A("a3","e1","Fox News","Right","Fed Hikes Again as Biden Economy Falters","Ties the hike to administration policy failures."),
  A("a4","e1","MSNBC","Left","Fed Acts to Cool Prices Hurting Working Families","Centers worker impact and corporate price-setting."),
  // e2 — Powell signals
  A("a5","e2","Reuters","Center","Powell: Rates to Stay Restrictive 'For Some Time'","Neutral readout of presser; quotes-driven."),
  A("a6","e2","Bloomberg","Center","Powell Pushes Back on Imminent Cuts","Markets-first framing with curve reaction."),
  A("a7","e2","HuffPost","Left","Powell Doubles Down Despite Worker Pain","Argues policy is unnecessarily harsh on labor."),
  // e3 — S&P falls
  A("a8","e3","CNBC","Center","Stocks Slide as Fed Dashes Cut Hopes","Markets framing; positioning and flows."),
  A("a9","e3","Breitbart","Right","Markets Tank After Bidenflation Forces Fed's Hand","Attributes selloff to administration."),
  A("a10","e3","The Guardian","Lean Left","Wall Street Falls as Investors Fear Prolonged Squeeze","Highlights pension and consumer effects."),
  // e4 — 10Y yield
  A("a11","e4","Financial Times","Center","10-Year Yield Tops 4.7% on Hawkish Fed","Global rates context; foreign demand angle."),
  A("a12","e4","Yahoo Finance","Center","Treasury Yields Surge to Cycle Highs","Charts-and-levels framing."),
  // e5 — Dollar
  A("a13","e5","Reuters","Center","Dollar Hits 106 as Yields Climb","FX-desk readout."),
  A("a14","e5","The Economist","Lean Left","King Dollar Returns, Squeezing Emerging Markets","Focuses on global spillovers."),
  // e6 — Regional banks
  A("a15","e6","Bloomberg","Center","Regional Banks Drop 4% on Funding Fears","Quotes analysts on NIM pressure."),
  A("a16","e6","Fox Business","Lean Right","Bank Stocks Slide as Regulators Eye New Rules","Emphasizes regulatory overreach."),
  A("a17","e6","Vox","Left","Why Higher Rates Could Trigger Another Bank Scare","Explainer on systemic risk."),
  // e7 — Mortgages
  A("a18","e7","The Washington Post","Lean Left","Mortgage Rates Cross 8%, Locking Out Buyers","Centers first-time buyer hardship."),
  A("a19","e7","New York Post","Lean Right","Mortgage Rates Hit 8% — Thanks, Washington","Op-ed style; assigns political blame."),
  // e8 — Tech megacaps
  A("a20","e8","The Verge","Lean Left","Tech Giants Lead Market Lower as Rates Bite","Industry impact angle."),
  A("a21","e8","Bloomberg","Center","Nasdaq Slumps as Megacaps Reprice","Flows and factor framing."),
  A("a22","e8","Wall Street Journal","Center","Growth Stocks Hit as Yields Surge","Duration narrative."),
  // e9 — Nvidia
  A("a23","e9","CNBC","Center","Nvidia Slides 3.4% as Rate Worries Hit Chips","Stock-mover framing."),
  A("a24","e9","TechCrunch","Lean Left","Nvidia Pulls Back After Historic AI-Driven Rally","Industry-cycle framing."),
  // e10 — Crypto
  A("a25","e10","CoinDesk","Center","Bitcoin Slips Below $60K After Fed Decision","Crypto-native readout."),
  A("a26","e10","Wall Street Journal","Center","Crypto Joins Risk-Off Trade","Cross-asset framing."),
  // e11 — White House
  A("a27","e11","CNN","Lean Left","White House Highlights Wage Gains Amid Rate Backlash","Sympathetic readout of admin talking points."),
  A("a28","e11","Associated Press","Center","Biden Aides Defend Economic Record","Neutral wire summary."),
  A("a29","e11","Daily Wire","Right","White House Spins as Americans Feel the Pinch","Skeptical of admin framing."),
  // e12 — GOP blames Biden
  A("a30","e12","Fox News","Right","Republicans Pin Inflation on Biden Spending","Amplifies GOP argument."),
  A("a31","e12","Politico","Center","House GOP Plans Inflation Hearing","Process-and-strategy framing."),
  A("a32","e12","Mother Jones","Left","GOP Attacks on Inflation Ignore Corporate Pricing","Counter-frames the GOP argument."),
  // e13 — Senate hearing
  A("a33","e13","Reuters","Center","Senators Press Regulators on Bank Risk","Neutral hearing readout."),
  A("a34","e13","The Hill","Center","Banking Panel Probes Regional Lender Stress","Beltway process framing."),
  // e14 — ECB
  A("a35","e14","Financial Times","Center","ECB Holds, Signals Easing Path","Policy-divergence angle."),
  A("a36","e14","Deutsche Welle","Center","Lagarde Opens Door to Rate Cuts","Quotes-driven readout."),
  A("a37","e14","The Guardian","Lean Left","Europe Eyes Relief as Fed Stays Tough","Frames Europe as more pro-growth."),
  // e15 — Yen
  A("a38","e15","Nikkei Asia","Center","Yen at 152 Puts Tokyo on Intervention Watch","Domestic policy framing."),
  A("a39","e15","Bloomberg","Center","BoJ Officials Warn Against 'Excessive' FX Moves","Market-reaction framing."),
  // e16 — Oil
  A("a40","e16","Reuters","Center","Brent Rises on Middle East Risk Premium","Neutral commodities readout."),
  A("a41","e16","Al Jazeera","Lean Left","Oil Climbs as Regional Tensions Mount","Geopolitics-first framing."),
  // e17 — Fintech layoffs
  A("a42","e17","TechCrunch","Lean Left","Fintech Layoffs Spread as Funding Dries Up","Industry-cycle framing."),
  A("a43","e17","Forbes","Lean Right","Fintech Resets After Years of Easy Money","Frames cuts as overdue discipline."),
  // e18 — Sentiment
  A("a44","e18","Associated Press","Center","Consumer Sentiment Drops in October","Neutral data summary."),
  A("a45","e18","New York Post","Lean Right","Americans Sour on Economy as Rates Bite","Voter-mood angle."),
  // e19 — Polls
  A("a46","e19","Politico","Center","Battleground Polls Tighten on Economic Anxiety","Horse-race framing."),
  A("a47","e19","The Atlantic","Lean Left","Why Voters Still Distrust the Recovery","Long-form sociological framing."),
  // e20 — IMF
  A("a48","e20","Reuters","Center","IMF Cuts 2025 Global Growth Forecast","Wire summary."),
  A("a49","e20","The Economist","Lean Left","A Tighter World: IMF Warns on Conditions","Frames as warning to policymakers."),
  A("a50","e20","Wall Street Journal","Center","IMF Trims Outlook, Cites Financial Tightening","Markets-first framing."),
  // BBC additions
  A("a51","e1","BBC","Center","US Federal Reserve raises rates again","Even-handed wire-style readout, global context."),
  A("a52","e2","BBC","Center","Powell says US rates will stay high","Quotes-driven; emphasises uncertainty."),
  A("a53","e14","BBC","Center","ECB holds eurozone interest rates","European perspective; contrast with US Fed."),
  A("a54","e16","BBC","Center","Oil prices climb as Middle East tensions rise","Foreign-desk geopolitics framing."),
  A("a55","e20","BBC","Center","IMF cuts global growth forecast for 2025","Multilateral-institution lens."),
  A("a56","e11","BBC","Center","White House defends US economic record","Reports both sides; reserved tone."),

  // Sports
  A("a57","e21","BBC","Center","Wembley to host all-English Champions League final","Straight match-report tone, focus on logistics."),
  A("a58","e21","Al Jazeera","Lean Left","European elite return to Wembley as fan groups protest ticket prices","Centers supporter & access angle."),
  A("a59","e21","Fox News","Right","English clubs dominate as Champions League final returns to London","Patriotic, league-pride framing."),
  A("a60","e22","CNBC","Center","60-point night reshapes MVP odds and sportsbook lines","Markets-and-betting framing."),
  A("a61","e22","The Guardian","Lean Left","A 60-point masterclass and the politics of basketball greatness","Cultural / legacy long-read framing."),
  A("a62","e22","New York Post","Lean Right","Superstar drops 60 — and the MVP race is over","Tabloid, outcome-declarative tone."),

  // Lifestyle
  A("a63","e23","The New York Times","Lean Left","The slow-café movement comes for your laptop","Trend-piece, sympathetic to the shift."),
  A("a64","e23","The Wall Street Journal","Center","Cafés bet weekend bans on laptops will lift food sales","Business-of-hospitality angle."),
  A("a65","e23","BBC","Center","Cafés crack down on laptop loiterers — owners and remote workers react","Even-handed two-sides readout."),
  A("a66","e24","The Guardian","Lean Left","Fast-fashion giant pulls launch after viral quality backlash","Consumer & labor-rights framing."),
  A("a67","e24","Forbes","Lean Right","Retailer's recall is a stock-price problem, not a values one","Markets-first investor framing."),

  // Health
  A("a68","e25","Reuters","Center","WHO: antimicrobial resistance outpacing new drug pipeline","Neutral wire summary of report."),
  A("a69","e25","The Washington Post","Lean Left","Superbugs gain ground as public funding for new antibiotics stalls","Centers underinvestment & policy failure."),
  A("a70","e25","Fox News","Right","WHO warns of superbug surge — critics question agency's credibility","Skeptical of WHO framing."),
  A("a71","e26","CNBC","Center","Novo and Lilly say GLP-1 supply now meeting weekly demand","Markets-and-earnings framing."),
  A("a72","e26","The New York Times","Lean Left","With GLP-1 shortages easing, attention turns to who can afford them","Access-and-equity framing."),
  A("a73","e26","BBC","Center","Weight-loss drug shortages ending, makers say","Plain-English health-desk readout."),

  // Entertainment
  A("a74","e27","The Verge","Lean Left","Streamer's new drama is the biggest first-week launch of the year","Industry-impact angle."),
  A("a75","e27","The Atlantic","Lean Left","Why this prestige series is also a quiet political argument","Cultural-criticism long-form."),
  A("a76","e27","New York Post","Lean Right","Streamer's record-breaking drama is also its most controversial","Tabloid controversy-first framing."),
  A("a77","e28","The Guardian","Lean Left","Veteran auteur announces farewell film — a career in five frames","Film-culture retrospective."),
  A("a78","e28","Bloomberg","Center","Director's exit raises questions for studio's prestige pipeline","Business-of-Hollywood lens."),

  // Editorial
  A("a79","e29","The New York Times","Lean Left","Editorial: The quiet collapse of local news is a democracy problem","Reform-minded editorial line."),
  A("a80","e29","The Wall Street Journal","Center","Opinion: Government must not be the cure for the local-news crisis","Skeptical of public-funding fixes."),
  A("a81","e29","The Guardian","Lean Left","Comment: A free press is infrastructure, and it is crumbling","Public-good infrastructure framing."),
  A("a82","e30","The Atlantic","Lean Left","Opinion: The four-day school week is a workaround, not a reform","Skeptical from the left."),
  A("a83","e30","Forbes","Lean Right","Opinion: Districts that cut a day of school are choosing parents over kids","Critical from the right."),

  // Academia
  A("a84","e31","Reuters","Center","Large multi-lab study fails to replicate famous cognitive-bias finding","Neutral science-wire summary."),
  A("a85","e31","The Economist","Lean Left","Another tile falls off psychology's replication wall","Long-tradition skeptical analysis."),
  A("a86","e31","BBC","Center","Scientists struggle to reproduce well-known psychology result","Accessible explainer."),
  A("a87","e32","Financial Times","Center","EU funders tighten open-access rules for publicly backed research","Policy & publishing-industry angle."),
  A("a88","e32","Deutsche Welle","Center","Europe pushes open access as default for state-funded science","European-institutional perspective."),
  A("a89","e32","The Guardian","Lean Left","Open-access push hailed as win for public-good research","Sympathetic to open-knowledge movement."),
  A("a90","e33","Nature News","Center","Preprint claims room-temperature quantum coherence — experts urge caution","Specialist science-desk readout."),
  A("a91","e33","TechCrunch","Lean Left","Bold quantum preprint sets the internet alight — again","Hype-cycle framing."),
  A("a92","e33","The Wall Street Journal","Center","Quantum claim sends speculative stocks sharply higher","Markets-reaction framing."),
  A("a93","e34","The New York Times","Lean Left","Faculty rewrite grading rules as AI outpaces detection tools","Pedagogy-and-policy framing."),
  A("a94","e34","The Atlantic","Lean Left","The grading crisis is really a trust crisis","Cultural long-form."),
  A("a95","e34","Forbes","Lean Right","Universities should stop pretending AI is the enemy","Pro-adoption opinion-leaning report."),
  A("a96","e34","BBC","Center","Universities rethink grading as AI tools spread","Even-handed education-desk readout."),
];

// Outlet meta — the 6 outlets surfaced in the constellation view.
export interface OutletMeta {
  id: string;          // canonical source name in articles[]
  label: string;       // short display label
  bias: Bias;
  color: string;       // CSS var
  blurb: string;
}

export const OUTLETS: OutletMeta[] = [
  { id: "BBC",                  label: "BBC",         bias: "Center",     color: "var(--bias-center)",     blurb: "UK public broadcaster" },
  { id: "The Washington Post",  label: "WaPo",        bias: "Lean Left",  color: "var(--bias-lean-left)",  blurb: "Beltway daily, Bezos-owned" },
  { id: "The Guardian",         label: "Guardian",    bias: "Lean Left",  color: "var(--bias-lean-left)",  blurb: "Scott Trust, reader-funded" },
  { id: "Al Jazeera",           label: "Al Jazeera",  bias: "Lean Left",  color: "var(--bias-lean-left)",  blurb: "Qatari state broadcaster" },
  { id: "Fox News",             label: "Fox News",    bias: "Right",      color: "var(--bias-right)",      blurb: "Murdoch cable network" },
  { id: "CNBC",                 label: "CNBC",        bias: "Center",     color: "var(--bias-center)",     blurb: "NBCUniversal markets desk" },
];

export const relations: Relation[] = [
  // Causal chain from Fed
  { fromEventId: "e1", toEventId: "e2", type: "temporal", strength: 0.9 },
  { fromEventId: "e2", toEventId: "e3", type: "causal", strength: 0.9 },
  { fromEventId: "e2", toEventId: "e4", type: "causal", strength: 0.85 },
  { fromEventId: "e4", toEventId: "e5", type: "causal", strength: 0.8 },
  { fromEventId: "e4", toEventId: "e7", type: "causal", strength: 0.75 },
  { fromEventId: "e3", toEventId: "e8", type: "causal", strength: 0.8 },
  { fromEventId: "e8", toEventId: "e9", type: "causal", strength: 0.9 },
  { fromEventId: "e3", toEventId: "e10", type: "causal", strength: 0.7 },
  { fromEventId: "e4", toEventId: "e6", type: "causal", strength: 0.75 },
  { fromEventId: "e6", toEventId: "e13", type: "causal", strength: 0.7 },
  // Political reactions
  { fromEventId: "e1", toEventId: "e11", type: "causal", strength: 0.6 },
  { fromEventId: "e1", toEventId: "e12", type: "causal", strength: 0.7 },
  { fromEventId: "e11", toEventId: "e12", type: "thematic", strength: 0.8 },
  { fromEventId: "e12", toEventId: "e19", type: "thematic", strength: 0.6 },
  { fromEventId: "e7", toEventId: "e18", type: "causal", strength: 0.7 },
  { fromEventId: "e18", toEventId: "e19", type: "causal", strength: 0.6 },
  // World linkages
  { fromEventId: "e2", toEventId: "e14", type: "thematic", strength: 0.7 },
  { fromEventId: "e5", toEventId: "e15", type: "causal", strength: 0.7 },
  { fromEventId: "e14", toEventId: "e20", type: "thematic", strength: 0.5 },
  { fromEventId: "e16", toEventId: "e20", type: "thematic", strength: 0.5 },
  { fromEventId: "e5", toEventId: "e20", type: "causal", strength: 0.55 },
  // Tech sector
  { fromEventId: "e10", toEventId: "e17", type: "thematic", strength: 0.5 },
  { fromEventId: "e9", toEventId: "e17", type: "thematic", strength: 0.4 },
  { fromEventId: "e8", toEventId: "e10", type: "thematic", strength: 0.5 },
];

export const TOPIC_COLORS: Record<Topic, string> = {
  Politics: "var(--topic-politics)",
  Economics: "var(--topic-economics)",
  Sports: "var(--topic-sports)",
  World: "var(--topic-world)",
  Tech: "var(--topic-tech)",
  Lifestyle: "var(--topic-lifestyle)",
  Health: "var(--topic-health)",
  Entertainment: "var(--topic-entertainment)",
  Editorial: "var(--topic-editorial)",
  Academia: "var(--topic-academia)",
};

export const BIAS_ORDER: Bias[] = ["Left","Lean Left","Center","Lean Right","Right"];

export const BIAS_TOKEN: Record<Bias, string> = {
  "Left": "bias-left",
  "Lean Left": "bias-lean-left",
  "Center": "bias-center",
  "Lean Right": "bias-lean-right",
  "Right": "bias-right",
};

export const REL_TOKEN: Record<RelationType, string> = {
  causal: "rel-causal",
  temporal: "rel-temporal",
  thematic: "rel-thematic",
};

// ============= Source linkages (bias drivers) =============
export interface SourceLinkage {
  owner: string;                 // Parent company / controlling entity
  majorFunders: string[];        // Advertisers, donors, sponsors
  affiliations: string[];        // Political / ideological ties
  note: string;                  // One-line context on how it shapes coverage
}

export const SOURCE_LINKAGES: Record<string, SourceLinkage> = {
  "The New York Times": { owner: "The New York Times Company (Sulzberger family trust)", majorFunders: ["Subscription revenue", "Luxury & finance advertisers"], affiliations: ["Urban professional readership"], note: "Reader-revenue model nudges coverage toward college-educated, urban-progressive sensibilities." },
  "The Wall Street Journal": { owner: "News Corp (Murdoch family)", majorFunders: ["Financial-services advertisers", "Enterprise subscriptions"], affiliations: ["News Corp opinion network"], note: "Newsroom is centrist-finance; opinion page is Murdoch-aligned conservative." },
  "Fox News": { owner: "Fox Corporation (Murdoch family)", majorFunders: ["Cable carriage fees", "Pharma & retail advertisers"], affiliations: ["Republican political ecosystem"], note: "Primetime lineup is openly aligned with the GOP base." },
  "Fox Business": { owner: "Fox Corporation (Murdoch family)", majorFunders: ["Financial-services advertisers"], affiliations: ["Pro-deregulation business lobby"], note: "Frames regulation as a drag on markets by default." },
  "MSNBC": { owner: "NBCUniversal / Comcast", majorFunders: ["Pharma advertisers", "Cable carriage fees"], affiliations: ["Democratic political ecosystem"], note: "Primetime opinion lineup aligned with progressive Democrats." },
  "CNN": { owner: "Warner Bros. Discovery", majorFunders: ["Cable carriage fees", "Travel & auto advertisers"], affiliations: ["Establishment Democratic-leaning"], note: "Center-left framing on social issues, market-friendly on economics." },
  "CNBC": { owner: "NBCUniversal / Comcast", majorFunders: ["Asset managers", "Brokerages", "Crypto exchanges"], affiliations: ["Wall Street buy-side"], note: "Investor-first lens; bullish bias when ad spend is high." },
  "Bloomberg": { owner: "Bloomberg L.P. (Michael Bloomberg)", majorFunders: ["Terminal subscriptions ($24k+/yr)"], affiliations: ["Institutional finance"], note: "Optimized for traders; owner's politics rarely surface in markets desk." },
  "Reuters": { owner: "Thomson Reuters", majorFunders: ["Wire-service licensing", "Terminal subscriptions"], affiliations: ["Trust principles (chartered neutrality)"], note: "Style guide enforces neutrality; framing usually quotes-driven." },
  "Associated Press": { owner: "Nonprofit cooperative of member outlets", majorFunders: ["Member dues", "Licensing"], affiliations: ["Cooperative governance"], note: "Wire neutrality is structural — member outlets need shared baseline." },
  "Financial Times": { owner: "Nikkei Inc.", majorFunders: ["Subscriptions", "Luxury & banking advertisers"], affiliations: ["City of London finance"], note: "Pro-market, pro-EU center; skeptical of populism left and right." },
  "The Economist": { owner: "The Economist Group (Agnelli/Rothschild stakes)", majorFunders: ["Subscriptions", "Luxury advertisers"], affiliations: ["Classical liberal editorial line"], note: "Free-market, socially liberal house view — explicit, not hidden." },
  "The Washington Post": { owner: "Nash Holdings (Jeff Bezos)", majorFunders: ["Subscriptions", "Tech & defense advertisers"], affiliations: ["Beltway establishment"], note: "Owner's Amazon/Blue Origin interests overlap with tech & space coverage." },
  "The Guardian": { owner: "Scott Trust Limited", majorFunders: ["Reader donations", "Foundation grants (Gates, Rockefeller)"], affiliations: ["Center-left UK editorial tradition"], note: "Donor-funded model frees it from ad pressure but ties it to NGO worldview." },
  "The Atlantic": { owner: "Emerson Collective (Laurene Powell Jobs)", majorFunders: ["Subscriptions", "Education & climate advertisers"], affiliations: ["Center-left philanthropy network"], note: "Owner's policy interests (climate, immigration, education) get sympathetic long-form." },
  "Vox": { owner: "Vox Media", majorFunders: ["Venture capital", "Tech advertisers"], affiliations: ["Explainer-progressive"], note: "Wonky-progressive framing aimed at college-educated millennials." },
  "HuffPost": { owner: "BuzzFeed Inc.", majorFunders: ["Display advertising"], affiliations: ["Progressive activist readership"], note: "Headlines optimized for social shares from a left audience." },
  "Mother Jones": { owner: "Foundation for National Progress (nonprofit)", majorFunders: ["Reader donations", "Progressive foundations"], affiliations: ["Investigative-left tradition"], note: "Explicitly adversarial toward corporate and conservative power." },
  "The Hill": { owner: "Nexstar Media Group", majorFunders: ["Lobbying & trade-association advertisers"], affiliations: ["Beltway process coverage"], note: "Even-handed by design — sells access to both parties' staffers." },
  "Politico": { owner: "Axel Springer SE", majorFunders: ["Lobbyist subscriptions (Politico Pro)", "Trade-association ads"], affiliations: ["Insider process journalism"], note: "Owner requires support for transatlantic alliance & free markets." },
  "Breitbart": { owner: "Breitbart News Network LLC", majorFunders: ["Mercer family (historic)", "Direct-response advertisers"], affiliations: ["Populist-right movement"], note: "Built as a counter-establishment outlet on the populist right." },
  "New York Post": { owner: "News Corp (Murdoch family)", majorFunders: ["Tabloid advertising", "Subscriptions"], affiliations: ["NYC conservative tabloid tradition"], note: "Headlines lean op-ed even in news sections." },
  "Daily Wire": { owner: "Bentkey Ventures (Shapiro/Boreing)", majorFunders: ["Subscriptions", "Wilks brothers (founding capital)"], affiliations: ["Conservative movement media"], note: "Explicitly conservative; subscription-funded by ideological audience." },
  "Forbes": { owner: "Integrated Whale Media Investments", majorFunders: ["Luxury advertisers", "Contributor network"], affiliations: ["Pro-business establishment"], note: "Pro-capital framing baked into the brand." },
  "TechCrunch": { owner: "Regent L.P.", majorFunders: ["Tech & VC advertisers", "Event sponsorships"], affiliations: ["Silicon Valley startup ecosystem"], note: "Coverage incentives align with the VCs and founders it depends on." },
  "The Verge": { owner: "Vox Media", majorFunders: ["Consumer-tech advertisers"], affiliations: ["Progressive tech-criticism"], note: "Sympathetic to tech-worker and consumer-rights framings." },
  "Yahoo Finance": { owner: "Apollo Global Management", majorFunders: ["Brokerage & ETF advertisers"], affiliations: ["Retail-investor audience"], note: "Retail-trader lens; engagement-driven headlines." },
  "CoinDesk": { owner: "Bullish Group", majorFunders: ["Crypto exchanges", "Token projects"], affiliations: ["Crypto industry"], note: "Owner is itself a crypto exchange — structural pro-industry bias." },
  "Deutsche Welle": { owner: "German federal government (public broadcaster)", majorFunders: ["German taxpayers"], affiliations: ["German foreign-policy interests"], note: "State-funded; reflects German/EU institutional perspective." },
  "Nikkei Asia": { owner: "Nikkei Inc.", majorFunders: ["Subscriptions", "Japanese corporate advertisers"], affiliations: ["Japanese business establishment"], note: "Japan-Inc lens on Asian markets and policy." },
  "Al Jazeera": { owner: "Qatar Media Corporation (Qatari government)", majorFunders: ["Qatari state budget"], affiliations: ["Qatari foreign-policy interests"], note: "Coverage of Gulf rivals and Western policy reflects state ownership." },
  "Nature News": { owner: "Springer Nature (Holtzbrinck Publishing Group)", majorFunders: ["Institutional subscriptions", "APC fees from authors"], affiliations: ["Mainstream academic publishing"], note: "Coverage tilts toward results in its own journals; cautious on outsider/preprint claims." },
  "BBC":     { owner: "BBC (UK public corporation, royal charter)", majorFunders: ["UK licence fee", "Commercial arm BBC Studios"], affiliations: ["UK public-service remit"], note: "Charter requires impartiality; framing tends to British institutional consensus." },
};

export interface BiasQuizOption {
  label: string;
  isReal: boolean;
  explanation: string;
}

// Build a 4-option quiz for a given source: 1 real linkage + 3 plausible decoys
export function buildBiasQuiz(source: string): { question: string; options: BiasQuizOption[] } | null {
  const link = SOURCE_LINKAGES[source];
  if (!link) return null;

  const real = {
    label: link.owner,
    isReal: true,
    explanation: link.note,
  };

  // Pull owners from other sources as decoys
  const decoyPool = Object.entries(SOURCE_LINKAGES)
    .filter(([s]) => s !== source)
    .map(([, l]) => l.owner);

  const decoys: BiasQuizOption[] = [];
  const used = new Set<string>([link.owner]);
  while (decoys.length < 3 && decoyPool.length) {
    const i = Math.floor(Math.random() * decoyPool.length);
    const pick = decoyPool.splice(i, 1)[0];
    if (used.has(pick)) continue;
    used.add(pick);
    decoys.push({ label: pick, isReal: false, explanation: "Not the actual owner of this outlet." });
  }

  const options = [real, ...decoys].sort(() => Math.random() - 0.5);
  return {
    question: `Who actually owns or controls ${source}?`,
    options,
  };
}

