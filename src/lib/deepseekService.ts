/**
 * DeepSeek AI Support Integration Service
 * Anjuman e Huda (chs) Management Portal
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_API_KEY = "sk-bd2c69c1c94a42dd97fc0bbb94d184d5";

const SYSTEM_PROMPT = `You are the official AI Support Assistant for "Anjuman e Huda (chs)", the supreme student management and academic portal for Darul Huda Islamic University students.

Key Information about Anjuman e Huda (chs):
1. Purpose: Manages programmes, registrations, results, content submissions, outreach, achievements, and student points.
2. Categories & Bonding:
   - Categories like Bidaya, Ula, Thaniya, Aliya, etc. are bound to specific classes (Our_Classes).
   - "Category Bonding": A student only sees and can register for programmes matching their specific Category (e.g., a Bidaya student only registers for Bidaya programmes).
3. Point System:
   - 1st Place: 10 points
   - 2nd Place (Runner-up): 7 points
   - 3rd Place: 5 points
   - A-Grade: 5 points
   - B-Grade: 3 points
   - OutReach points & Achievement points are also tracked in Grand Total Points.
4. Content Submission (Content_Table):
   - For programmes marked "Content Required", students submit essays, articles, or code.
   - Students can upload documents (.docx, .pdf, .tsx, .ts, .txt, .md).
   - If a file upload encounters any issue, students can paste their document directly into the "Content Text" area.
5. Wings & Batches:
   - Specialized Wings (departments) organize academic and co-curricular programmes.
   - Batches collaborate on initiatives.
6. Squad / Group Programmes:
   - For group programmes, students can form a squad of up to 7 members.

Please provide concise, helpful, polite, and accurate answers in clean formatting. If asked about technical features or how to navigate the portal, guide the user step by step.`;

// Local intelligent responses for common questions when API credit is temporarily pending top-up
const KNOWLEDGE_BASE: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["category", "bonding", "bidaya", "ula", "thaniya", "aliya", "class"],
    answer: `**Category Bonding in Anjuman e Huda (chs):**
• Each student belongs to a specific Class (e.g., Secondary First Year) which is linked to an academic Category (such as *Bidaya*, *Ula*, *Thaniya*, or *Aliya*).
• **Automatic Filtering:** In your Student Panel, the Upcoming Programmes list automatically filters to show only the programmes designed for your category.
• **Registration Safety:** You can only register for programmes that belong to your category, preventing accidental misregistrations.
• If a programme is marked for General/All Classes, it is accessible to all students.`
  },
  {
    keywords: ["content", "submit", "submission", "docx", "pdf", "tsx", "essay", "file", "upload"],
    answer: `**Content Submission Guidelines (Content_Table):**
1. **Find Programme:** Look for programmes marked with the *"Content Required"* badge.
2. **Submit Content:** Click the *"Submit Your Content"* button on the programme card.
3. **Upload File or Paste Text:**
   - You can upload documents in formats like **.pdf, .docx, .tsx, .txt, or .md**.
   - **Upload Backup:** If you experience any upload error or file issue, simply paste your text directly into the **"Content Text"** box.
4. **Deadline:** Make sure to submit before the announced content deadline.`
  },
  {
    keywords: ["point", "points", "grading", "score", "rank", "grand total"],
    answer: `**Anjuman e Huda Point Distribution:**
• 🥇 **1st Place:** 10 Points
• 🥈 **2nd Place (Runner-up):** 7 Points
• 🥉 **3rd Place:** 5 Points
• 🎖️ **Grade A:** 5 Points
• 🎖️ **Grade B:** 3 Points

**Grand Total Calculation:**
\`Grand Total Points = Anjuman Programme Points + OutReach Points + Achievement Points\`
All points are updated automatically when results are published by the admin or wing convener.`
  },
  {
    keywords: ["squad", "group", "team", "member"],
    answer: `**Squad & Group Registration:**
• For group programmes, you can create a squad with up to 7 students.
• When registering, click *"Form Squad / Group Registration"*, enter your squad title, and invite your batchmates using their Admission Numbers.
• The squad will participate together, and earned positions will award points to the team.`
  },
  {
    keywords: ["result", "results", "winner", "podium"],
    answer: `**Viewing Results:**
• Visit the **Results** section in the Public Portal or your Student Dashboard.
• Once a programme is conducted and results are evaluated, podium holders (1st, 2nd, 3rd) and Grade A/B achievers are published with student photo thumbnails and verified points.`
  }
];

export async function sendDeepSeekQuery(
  userQuery: string,
  history: ChatMessage[] = []
): Promise<{ text: string; usedFallback?: boolean; error?: string }> {
  const apiKey = (import.meta.env.VITE_DEEPSEEK_API_KEY || DEFAULT_API_KEY).trim();

  // Prepare messages payload
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6), // Keep last 6 interactions for context
    { role: "user", content: userQuery.trim() }
  ];

  try {
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

    if (!response.ok) {
      const errorMsg = data?.error?.message || response.statusText;
      console.warn("DeepSeek API returned status:", response.status, errorMsg);
      // Fallback seamlessly to local knowledge base
      return getFallbackResponse(userQuery, errorMsg);
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (answer) {
      return { text: answer.trim() };
    }

    return getFallbackResponse(userQuery, "Empty response from DeepSeek API");
  } catch (err: any) {
    console.error("DeepSeek network error:", err);
    return getFallbackResponse(userQuery, err.message || "Network error");
  }
}

function getFallbackResponse(query: string, apiNote?: string): { text: string; usedFallback: boolean; error?: string } {
  const q = query.toLowerCase();

  // Match keyword in local knowledge base
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((k) => q.includes(k))) {
      return {
        text: `${entry.answer}\n\n*(Anjuman Portal AI Assistant • DeepSeek Engine)*`,
        usedFallback: true,
        error: apiNote
      };
    }
  }

  // General helpful response
  return {
    text: `Hello! I am your **Anjuman e Huda AI Support Assistant**.\n\nHere are quick things you can ask me about:\n• **Category Bonding:** How student classes link to categories (Bidaya, Ula, etc.) and filter upcoming programmes.\n• **Content Submission:** How to submit documents (.pdf, .docx, .tsx) or paste text if an upload error occurs.\n• **Point Structure:** Points for 1st, 2nd, 3rd positions, Grade A, and Grade B.\n• **Squads & Group Registrations:** How to form squads up to 7 members.\n• **Results & Achievements:** How results are published.\n\nWhat can I help you with today?`,
    usedFallback: true,
    error: apiNote
  };
}
