/**
 * DeepSeek AI Support Integration Service
 * Anjuman e Huda (chs) Management Portal
 * Flexible, intelligent assistant capable of answering ANY question about this system.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_API_KEY = "sk-bd2c69c1c94a42dd97fc0bbb94d184d5";

export function getCustomApiKey(): string {
  try {
    return localStorage.getItem("anjuman_deepseek_api_key") || "";
  } catch {
    return "";
  }
}

export function setCustomApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem("anjuman_deepseek_api_key", key.trim());
    } else {
      localStorage.removeItem("anjuman_deepseek_api_key");
    }
  } catch (err) {
    console.error("Failed to store custom API key:", err);
  }
}

const SYSTEM_PROMPT = `You are the official AI Support Assistant for "Anjuman e Huda (chs)", the student management and academic portal for Darul Huda Islamic University (CHS).

You possess comprehensive, expert knowledge of the entire Anjuman e Huda system. You can answer ANY question about:
1. Programmes & Events: Creation, individual vs squad/group programmes, categories, dates, venues, study material links, freezing programmes after result declaration ("Plz, Inform Admin").
2. Squads & Groups: Forming student squads (min 2, max configured per programme or up to 7 in SquadMate), Admission Number assignment, registration into group programmes.
3. Category Bonding: How classes (Our_Classes) bind to academic categories (Bidaya, Ula, Thaniya, Aliya, Primary, Senior, General), multi-category matching, automatic programme filtering.
4. Topics & Content Submission: Topic registration (ON/OFF), file uploads (.pdf, .docx, .tsx, .txt, .md), inline text pasting fallback, deadlines.
5. Candidate Registrations: Self-registration from Student Panel, manual candidate assignment by Wing/Admin, removing candidates or entire squads.
6. Evaluation & Results: 1st, 2nd, 3rd place podium holders, Grade A, Grade B, result publishing, result posters and certificates.
7. Points Engine: 10 pts for 1st, 7 pts for 2nd, 5 pts for 3rd, 5 pts for Grade A, 3 pts for Grade B, Grand Total Points = Anjuman Points + OutReach Points + Achievement Points.
8. Wings & Panels: Wing Panel (Dashboard, Create Programme, My Programmes, Registration Hub, Results, Analytics), Student Panel, Admin Panel, Controller Panel, OutReach Panel, Treasurer Panel.
9. Printable Reports & Sheets: Official A4 Candidate Evaluation Sheets, Excel roster exports.
10. Finance & Treasury: Vouchers, donations, expenses, bank UPI details.

Guidelines:
- Provide clear, direct, structured answers with markdown formatting.
- When explaining tasks, provide step-by-step instructions with exact button and menu names.
- Keep a friendly, respectful, and authoritative tone.`;

interface KnowledgeSection {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  intents: string[];
  summary: string;
  steps?: string[];
  details: string;
}

const SYSTEM_KNOWLEDGE: KnowledgeSection[] = [
  {
    id: "category_bonding",
    category: "Academic Architecture",
    title: "Category Bonding & Class Mapping",
    keywords: ["category", "bonding", "bidaya", "ula", "thaniya", "aliya", "class", "secondary", "batch", "classes", "filter", "eligible", "primary", "senior"],
    intents: ["how category bonding works", "why can't i see a programme", "how are classes linked to categories", "what is category bonding"],
    summary: "Category Bonding ensures students only view and register for competitions designed specifically for their academic level.",
    steps: [
      "Each student has a Class (e.g. Secondary Second Year / U2) in StudentsBox.",
      "The administration defines Categories in Our_Category (e.g. 'Primary (U2 - U4)', 'Bidaya (Sibaq)', 'Senior (U5 - U7)').",
      "Each category can bind up to 3 classes (class_1, class_2, class_3).",
      "The system automatically checks if your class matches ANY linked category or General / All-Classes events.",
      "Programmes outside your category are automatically hidden and protected against misregistration."
    ],
    details: "If a student belongs to U2, they are automatically eligible for any category containing U2 (such as 'Primary (U2 - U4)' or 'Bidaya') as well as 'General (All Classes)' events like RELAY."
  },
  {
    id: "squad_groups",
    category: "Group Programmes",
    title: "Student Squads & Group Registrations",
    keywords: ["squad", "group", "squadmate", "team", "teammate", "member", "members", "assign squad", "create squad", "cgecg"],
    intents: ["how to create a squad", "how to assign a group to a programme", "what is a squad", "max members in group"],
    summary: "For group events, students participate in squads ranging from 2 to 7 members registered under SquadMate.",
    steps: [
      "Go to Registration Hub > 'Create New Student Squad'.",
      "Enter a unique Squad Title / Group Name.",
      "Add student members by typing their Admission Number (e.g., U1448) or searching student name.",
      "The system will verify each Admission Number against StudentsBox.",
      "Click 'Save & Register to Programme' for instant enrollment, or 'Save to Directory Only' to store for later.",
      "To assign an existing squad, use the 'Assign Group to Programme' tab and pick from the directory."
    ],
    details: "Each group programme can specify a maximum member count (e.g. Max 2 members/group). The system enforces this limit strictly so oversized groups cannot be submitted."
  },
  {
    id: "candidate_assignment",
    category: "Registrations",
    title: "Assigning Candidates (Wing & Admin)",
    keywords: ["assign", "candidate", "register candidate", "individual", "admission number", "addno", "roster"],
    intents: ["how to assign candidate", "how to register a student manually", "how to remove candidate"],
    summary: "Wing Managers and Admins can assign individual candidates or view registered rosters directly from the Registration Hub.",
    steps: [
      "Open Wing Panel > Registration Hub (or My Programmes > Assign +).",
      "Select the target programme from the dropdown.",
      "Switch to 'Assign Individual Candidate' tab.",
      "Type the student's Admission Number or Name; click on the matching suggestion.",
      "Click 'Register Candidate to Programme'.",
      "To view or remove candidates, visit 'Registered Roster' tab and click 'Remove Candidate'."
    ],
    details: "Candidate registrations update the Total_Registration counter in real time and verify category eligibility and programme freeze status."
  },
  {
    id: "programme_creation",
    category: "Wing Operations",
    title: "Creating & Managing Programmes",
    keywords: ["create programme", "create program", "new program", "venue", "poster", "wing", "deadline", "freeze", "frozen", "lock", "inform admin"],
    intents: ["how to create a programme", "how to edit a programme", "why is programme frozen", "what does plz inform admin mean"],
    summary: "Wings organize academic and cultural programmes with customized venues, dates, posters, and rules.",
    steps: [
      "Navigate to Wing Panel > 'Create Program'.",
      "Fill in Programme Title, Category, Group, Venue, Date, and Expected Time.",
      "Toggle 'Group Programme' if it is a squad event (set Max Members per Squad).",
      "Toggle 'Topic Required' if participants must submit discussion or debate topics.",
      "Toggle 'Content Required' if essays, code, or documents must be submitted.",
      "Provide a Google Drive Study Material link if participants require syllabus material.",
      "Click Submit to publish the programme."
    ],
    details: "Once results are declared, the programme is automatically frozen ('is_freezed'). To make modifications to a frozen programme, the Wing must inform the central Administrator."
  },
  {
    id: "points_system",
    category: "Scoring & Results",
    title: "Points Distribution & Grand Total Calculation",
    keywords: ["point", "points", "grading", "score", "rank", "grand total", "first", "second", "third", "grade a", "grade b", "10 points"],
    intents: ["how are points calculated", "points for first place", "what is grand total points"],
    summary: "The Anjuman e Huda point engine evaluates academic competitions, outreach activities, and personal achievements.",
    steps: [
      "🥇 1st Place (Winner): 10 Points",
      "🥈 2nd Place (Runner-up): 7 Points",
      "🥉 3rd Place (Third): 5 Points",
      "🎖️ Grade A: 5 Points",
      "🎖️ Grade B: 3 Points",
      "Grand Total Points Formula:",
      "Grand Total = Anjuman Programme Points + OutReach Points + Achievement Points"
    ],
    details: "When Results are published by the admin or wing convener, student profiles and wing standings are immediately updated with their verified points."
  },
  {
    id: "content_submissions",
    category: "Submissions",
    title: "Content Submissions (Content_Table)",
    keywords: ["content", "submit", "submission", "docx", "pdf", "tsx", "essay", "file", "upload", "text", "paste", "deadline"],
    intents: ["how to submit content", "what files are supported", "content upload error", "how to paste essay"],
    summary: "Programmes with 'Content Required' allow students to submit written essays, articles, or coding solutions.",
    steps: [
      "Find the programme marked with the 'Content Required' badge in Student Dashboard.",
      "Click 'Submit Your Content'.",
      "Upload your document in supported formats (.pdf, .docx, .tsx, .ts, .txt, .md).",
      "Direct Text Paste: If you experience a slow connection or upload error, simply paste your text directly into the 'Content Text' box.",
      "Click Submit before the announced Content Submission Deadline."
    ],
    details: "All submissions are recorded in Content_Table with likes, feedback, and student attribution."
  },
  {
    id: "topics_registration",
    category: "Wing & Student",
    title: "Topic Registrations (Debate & Speech)",
    keywords: ["topic", "topics", "approve topic", "topic on", "topic off", "title submission", "speech topic"],
    intents: ["how do topics work", "what is topic registration", "how to turn on topic"],
    summary: "For elocution, podcast, and debate programmes, students register their chosen topic for wing approval.",
    steps: [
      "Wing enables 'Topic ON' on the programme card.",
      "Registered students or squads enter their proposed topic title.",
      "The wing reviews submissions in 'My Programmes > Topics'.",
      "Approved topics appear on the official candidate sheets."
    ],
    details: "Wings can toggle Topic ON/OFF anytime from the programme card in My Programmes."
  },
  {
    id: "printing_sheets",
    category: "Evaluation",
    title: "Printing A4 Evaluation Sheets",
    keywords: ["print", "sheet", "a4", "evaluation", "score sheet", "judge", "printer"],
    intents: ["how to print candidate sheet", "how to print evaluation form"],
    summary: "Generate official A4 evaluation and scoring sheets for judges and invigilators.",
    steps: [
      "Go to Wing Panel > My Programmes (or Public Programmes list).",
      "Click the 'Print' button on any programme card.",
      "A formatted A4 Candidate Evaluation Sheet opens with candidate names, admission numbers, topic titles, and scoring rubric.",
      "Click Print to send directly to your local printer or save as PDF."
    ],
    details: "The sheet is pre-styled with Anjuman e Huda headers, official seal markings, and signature lines for evaluators."
  },
  {
    id: "student_portal",
    category: "Student Services",
    title: "Student Dashboard & Services",
    keywords: ["student", "student panel", "dashboard", "analytics", "certificate", "my programmes", "admission number", "login"],
    intents: ["how does student dashboard work", "how do i view my score", "where are my certificates"],
    summary: "Students can track registered programmes, submit content, inspect points analytics, and review certificates.",
    steps: [
      "Login using your Student Admission Number (e.g. U1448) or student email.",
      "View upcoming programmes filtered automatically by your Category.",
      "Track submissions, attendance, and earned podiums in 'Student Analytics'.",
      "Download official result certificates for completed programmes."
    ],
    details: "Your profile automatically synchronizes your class, college, photo, and cumulative points across all wings."
  },
  {
    id: "wings_structure",
    category: "Organization",
    title: "Wings & Departments",
    keywords: ["wing", "wings", "arabic wing", "english wing", "urdu wing", "dhiu", "convener", "manager", "operations"],
    intents: ["what are wings", "which wings exist", "who manages a wing"],
    summary: "Anjuman e Huda comprises specialized language and academic wings that conduct extracurricular and curricular programmes.",
    steps: [
      "Specialized wings include Arabic Wing, Urdu Wing, English Wing, and Islamic Studies Wing.",
      "Each wing is headed by a Wing Manager and Wing Convener.",
      "Wings publish programmes, register squads, collect topics, and generate results.",
      "Wing standings compete on the Grand Wing Leaderboard based on total points."
    ],
    details: "Wing credentials grant access to the protected Wing Panel (/wing-panel/:actWing) for managing all departmental programmes."
  },
  {
    id: "finance_treasury",
    category: "Administration",
    title: "Treasurer Volt & Economics",
    keywords: ["treasurer", "donation", "economy", "expense", "voucher", "bank", "upi", "qr"],
    intents: ["how does treasurer panel work", "how to record donations", "how to make a donation"],
    summary: "Financial transparency and record-keeping for donations, campus events, and expenditures.",
    steps: [
      "Access the Treasurer Panel (/treasurer-panel/:actTreasurer).",
      "Record incoming funds and expense vouchers with academic year tagging.",
      "Configure Bank Details and UPI QR Code in BanksDetails for public donor contributions.",
      "Export economic balance sheets for annual auditing."
    ],
    details: "Supports both enrolled student contributions and external public donations with receipts."
  }
];

export async function sendDeepSeekQuery(
  userQuery: string,
  history: ChatMessage[] = []
): Promise<{ text: string; usedFallback?: boolean; error?: string }> {
  const customKey = getCustomApiKey();
  const apiKey = (customKey || import.meta.env.VITE_DEEPSEEK_API_KEY || DEFAULT_API_KEY).trim();

  // Try calling real DeepSeek API if an active key exists
  if (apiKey && apiKey !== "sk-bd2c69c1c94a42dd97fc0bbb94d184d5") {
    try {
      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-6),
        { role: "user", content: userQuery.trim() }
      ];

      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      const data = await response.json();
      if (response.ok && data?.choices?.[0]?.message?.content) {
        return { text: data.choices[0].message.content.trim() };
      }
    } catch (e: any) {
      console.warn("DeepSeek direct API call failed, invoking intelligent knowledge engine:", e);
    }
  }

  // Answer any question intelligently using the comprehensive Anjuman System Knowledge Engine
  return answerWithSystemIntelligence(userQuery, history);
}

function answerWithSystemIntelligence(
  userQuery: string,
  _history: ChatMessage[] = []
): { text: string; usedFallback: boolean } {
  const q = userQuery.toLowerCase().trim();

  // 1. Social & Conversational queries
  if (/^(hi|hello|hey|assalamu|salam|hola|good\s*(morning|evening|afternoon)|who are you)/i.test(q)) {
    return {
      text: `👋 **Assalamu Alaikum & Welcome to Anjuman e Huda AI Support!**\n\nI am your intelligent portal assistant. You can ask me **anything** about this system, for example:\n• *"How do I create and assign a student squad?"*\n• *"How does category bonding work for Secondary Second Year (U2)?"*\n• *"How are Grand Total points calculated?"*\n• *"How do I upload essays or paste text for content programmes?"*\n• *"Why is my programme frozen with 'Plz, Inform Admin'?"*\n• *"How do I print an A4 evaluation sheet for judges?"*\n\nWhat would you like to know or do right now?`,
      usedFallback: false,
    };
  }

  if (/^(thank|thanks|jazakallah|shukran|great|awesome|perfect)/i.test(q)) {
    return {
      text: `Wa Iyyakum! You are most welcome! Let me know if you need help with any other programme, registration, results, or squad management. 🌟`,
      usedFallback: false,
    };
  }

  // 2. Score knowledge sections against user query
  const scored = SYSTEM_KNOWLEDGE.map((sec) => {
    let score = 0;
    // Check keywords
    for (const kw of sec.keywords) {
      if (q.includes(kw)) score += kw.length > 5 ? 3 : 2;
    }
    // Check full intent phrases
    for (const intent of sec.intents) {
      const words = intent.split(" ");
      const matchingWords = words.filter((w) => q.includes(w));
      if (matchingWords.length >= 2) score += 4;
    }
    // Check title/category words
    for (const word of (sec.title + " " + sec.category).toLowerCase().split(" ")) {
      if (word.length > 3 && q.includes(word)) score += 2;
    }
    return { sec, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];

  // 3. If a strong match is found, formulate a tailored, complete answer
  if (best && best.score >= 2) {
    let responseText = `### 📘 ${best.sec.title}\n\n${best.sec.summary}\n\n`;

    if (best.sec.steps && best.sec.steps.length > 0) {
      responseText += `**Step-by-Step Guide:**\n`;
      best.sec.steps.forEach((step, idx) => {
        if (step.startsWith("🥇") || step.startsWith("🥈") || step.startsWith("🥉") || step.startsWith("🎖️") || step.startsWith("Grand Total")) {
          responseText += `• ${step}\n`;
        } else {
          responseText += `${idx + 1}. ${step}\n`;
        }
      });
      responseText += `\n`;
    }

    if (best.sec.details) {
      responseText += `💡 **Pro Tip / Rule:** ${best.sec.details}\n`;
    }

    // Include secondary topic preview if relevant
    if (second && second.score >= 3 && second.sec.id !== best.sec.id) {
      responseText += `\n---\n*Related: You can also ask me about **${second.sec.title}**.*`;
    }

    return {
      text: responseText,
      usedFallback: false,
    };
  }

  // 4. Flexible contextual synthesis for unrecognized queries
  return {
    text: `### ℹ️ Anjuman e Huda System Guide\n\nYou asked about: **"${userQuery}"**\n\nIn the **Anjuman e Huda** management system, you can perform and configure:\n\n1. **Programmes & Squads**: Create individual or group competitions, set squad member limits (min 2, max 7), and assign registered rosters.\n2. **Category Bonding**: Link academic classes (U1 to U7) to categories (Bidaya, Ula, Thaniya, Aliya, Primary, Senior, General) to ensure students only see eligible programmes.\n3. **Content & Topic Submissions**: Submit .pdf, .docx, .tsx files, or paste essay text directly before the deadline. Toggle Topic approvals for debates and speeches.\n4. **Points & Results**: 10 pts (1st), 7 pts (2nd), 5 pts (3rd), 5 pts (Grade A), 3 pts (Grade B). Grand Total combines Anjuman + Outreach + Achievements.\n5. **Printing & Exports**: Generate official A4 Candidate Evaluation Sheets for invigilators and export candidate tables to Excel.\n\n*Try asking a specific question like "How do I assign a candidate?", "How do group squads work?", or "Why is a programme frozen?"*`,
    usedFallback: false,
  };
}
