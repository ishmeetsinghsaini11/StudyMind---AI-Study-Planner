const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroqAPI(model, messages, maxRetries = 3) {
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      console.log('[Groq] API call', 'model:', model);
      
      const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7
        })
      });

      if (response.status === 429) {
        retryCount++;
        if (retryCount <= maxRetries) {
          const errorData = await response.text();
          console.log(`[Groq] Rate limited, retry ${retryCount}/${maxRetries}`);
          
          // Try to extract retry time from error message
          let retryDelay = 5000; // Default 5 seconds
          const match = errorData.match(/Please try again in ([\d.]+)s/);
          if (match) {
            retryDelay = Math.ceil(parseFloat(match[1]) * 1000);
            console.log(`[Groq] Waiting ${retryDelay/1000}s as suggested by API`);
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (retryCount < maxRetries && error.message.includes('429')) {
        retryCount++;
        console.log(`[Groq] Retry ${retryCount}/${maxRetries} after error:`, error.message);
        
        // Extract retry time from error message if available
        let retryDelay = 5000;
        const match = error.message.match(/Please try again in ([\d.]+)s/);
        if (match) {
          retryDelay = Math.ceil(parseFloat(match[1]) * 1000);
          console.log(`[Groq] Waiting ${retryDelay/1000}s as suggested by API`);
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      throw error;
    }
  }
}

async function generateStudyPlan(userProfile, syllabusSummary) {
  console.log('[Groq] generateStudyPlan', 'model: llama-3.3-70b-versatile');
  
  const systemPrompt = "You are an expert education coach. You create specific, detailed study plans. Always use the actual subject name provided. Never use generic terms like 'Study Task', 'Review Task', 'Subject Fundamentals', 'Subject Applications'. Always respond with valid JSON only, no markdown, no backticks.";
  
  // Call 1: Analyze
  const analysisPrompt = `Analyze this student profile and identify key study challenges and priorities.
Profile: ${JSON.stringify(userProfile)}
Syllabus Summary: ${syllabusSummary}
Respond in 150 words max.`;
  
  const analysisResult = await callGroqAPI('llama-3.3-70b-versatile', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: analysisPrompt }
  ]);
  console.log('[Groq] Analysis result:', analysisResult);
  
  // Call 2: Generate plan using analysis
  const prompt = `Create a detailed ${userProfile.totalDays || 14}-day study plan.

Subject: ${userProfile.subject}
Student name: ${userProfile.name || 'Student'}
Knowledge level: ${userProfile.knowledgeLevel || userProfile.knowledge_level || 'Intermediate'}
Daily available hours: ${userProfile.dailyHours || userProfile.daily_hours || 2}
Learning style: ${userProfile.learningStyle || userProfile.learning_style || 'Visual'}
Energy pattern: ${userProfile.energyPattern || userProfile.energy_pattern || 'Morning'}
Goal: ${userProfile.goal || 'Master the subject'}
Weak areas: ${userProfile.weakAreas || userProfile.weak_areas || 'none specified'}
Syllabus/Notes: ${syllabusSummary || 'Not provided'}

Generate a day-by-day plan where every task title specifically mentions 
the subject: "${userProfile.subject}".

For example if subject is "Data Structures":
  Good task titles: "Study Binary Trees in Data Structures", "Practice Linked List Problems", "Review Sorting Algorithms"
  Bad task titles: "Study Task 1", "Review Task", "Subject Fundamentals"

Return ONLY this JSON structure, no other text:
{
  "subject": "${userProfile.subject}",
  "total_days": 14,
  "daily_hours": ${userProfile.dailyHours || 2},
  "days": [
    {
      "day": 1,
      "date": "",
      "topics": ["specific topic name related to ${userProfile.subject}"],
      "tasks": [
        {
          "title": "specific task mentioning ${userProfile.subject}",
          "duration_mins": 60,
          "type": "read"
        }
      ],
      "resources": ["specific resource for ${userProfile.subject}"],
      "difficulty": "easy",
      "rationale": "why this topic matters for ${userProfile.subject}"
    }
  ],
  "weak_areas": ["actual weak areas from student input"],
  "exam_readiness_estimate": "60%"
}`;
  
  const planResult = await callGroqAPI('llama-3.3-70b-versatile', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ]);
  console.log('[Groq] Plan generated');
  
  // Call 3: Critique and refine
  const critiquePrompt = `Review this study plan for realism. Is the daily load achievable?
Plan: ${planResult}
If changes needed, return the corrected full JSON.
If plan is fine, return the same JSON unchanged.
Output ONLY JSON, no extra text.`;
  
  const finalResult = await callGroqAPI('llama-3.3-70b-versatile', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: critiquePrompt }
  ]);
  console.log('[Groq] Final plan refined');
  
  // Strip markdown code blocks if present
  const cleanJson = finalResult.replace(/```json\s*|\s*```/g, '').trim();
  return JSON.parse(cleanJson);
}

async function adaptPlan(currentPlan, progressData) {
  console.log('[Groq] adaptPlan', 'model: llama-3.3-70b-versatile');
  
  const prompt = `A student is struggling. Here is their current plan and progress:
Plan: ${JSON.stringify(currentPlan)}
Progress (completed tasks + difficulty ratings): ${JSON.stringify(progressData)}
The student rated several topics as very hard (4-5/5 difficulty).
Adjust the remaining days to: slow down on hard topics, add more review sessions,
redistribute load. Return ONLY the updated 'days' array as JSON.`;
  
  const result = await callGroqAPI('llama-3.3-70b-versatile', [
    { role: 'user', content: prompt }
  ]);
  
  console.log('[Groq] Plan adapted');
  // Strip markdown code blocks if present
  const cleanJson = result.replace(/```json\s*|\s*```/g, '').trim();
  return JSON.parse(cleanJson);
}

async function generateFlashcards(topic, count = 10) {
  console.log('[Groq] generateFlashcards', 'model: llama-3.1-8b-instant');
  
  const prompt = `Generate ${count} flashcards for the topic: '${topic}'.
Output ONLY this JSON array, no extra text:
[{"question":"...","answer":"..."}]`;
  
  const result = await callGroqAPI('llama-3.1-8b-instant', [
    { role: 'user', content: prompt }
  ]);
  
  console.log('[Groq] Flashcards generated');
  // Strip markdown code blocks if present
  const cleanJson = result.replace(/```json\s*|\s*```/g, '').trim();
  
  try {
    return JSON.parse(cleanJson);
  } catch (parseError) {
    console.error('[Groq] Failed to parse flashcard JSON:', parseError.message);
    console.error('[Groq] Raw response:', cleanJson.substring(0, 200));
    // Return empty array as fallback
    return [];
  }
}

async function chatWithAI(messages, userContext) {
  console.log('[Groq] chatWithAI', 'model: llama-3.1-8b-instant');
  
  const systemPrompt = `You are StudyMind, a friendly AI study assistant.
  
  The student's current study context:
  - Subject(s): ${userContext.subject}
  - Today is Day ${userContext.currentDay} of ${userContext.totalDays}
  - Today's tasks: ${userContext.todayTasks?.map(t => t.title).join(', ') || 'none'}
  - Completed tasks today: ${userContext.completedToday || 0}
  - Weak areas: ${userContext.weakAreas?.join(', ') || 'none identified'}
  - Exam readiness: ${userContext.examReadiness || 'not calculated'}
  - Study streak: ${userContext.streak || 0} days

  Your response rules:
  1. Keep responses SHORT — max 4 sentences unless student asks for explanation
  2. Always be specific to their subject — never give generic advice
  3. Never suggest a full day plan unprompted — student can see their plan already
  4. If student says they completed a task — congratulate briefly and ask how it went
  5. If student is stuck — ask ONE specific question to understand the problem
  6. Use simple friendly language — no bullet points unless student asks for a list
  7. Never repeat what the student just said back to them
  8. Focus on ONE thing per response — don't overwhelm`;
  
  // Get last 8 messages for conversation history
  const recentMessages = messages.slice(-8);
  
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages
  ];
  
  const result = await callGroqAPI('llama-3.1-8b-instant', apiMessages);
  
  console.log('[Groq] Chat response generated');
  return result;
}

module.exports = {
  generateStudyPlan,
  adaptPlan,
  generateFlashcards,
  chatWithAI
};
