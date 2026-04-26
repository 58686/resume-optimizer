export function buildInterviewPrepPrompt(resumeText: string, jobDescription: string) {
  return `
You are an expert technical interviewer and career coach with 15+ years of experience conducting interviews at top tech companies.
Generate a comprehensive, realistic set of interview questions for this candidate based on their resume and the target job description.
Think like a real interview panel: HR screener + hiring manager + technical interviewers would ALL ask questions.

Return only valid JSON with this exact shape:
{
  "questions": [
    {
      "question": string,
      "category": "technical" | "project" | "behavioral" | "hr" | "system_design" | "open_ended",
      "difficulty": "basic" | "intermediate" | "advanced",
      "sampleAnswer": string,
      "keyPoints": string[]
    }
  ]
}

## Category definitions and required counts

### "hr" — HR 面试官必问题（6-8 道）
HR screener questions asked before any technical round. Cover ALL of these angles:
- 自我介绍（请用1-2分钟介绍一下你自己）
- 求职动机（为什么离职？为什么投我们公司？）
- 薪资期望（期望薪资范围是多少？）
- 优缺点（你最大的优点和缺点各是什么？）
- 职业规划（3-5年后你希望自己在哪个方向发展？）
- 工作方式（你更喜欢独立工作还是团队协作？）
- 抗压能力（遇到高压紧急项目时你如何应对？）
- 入职时间（最快什么时候可以入职？）

### "technical" — 技术基础（10-14 道）
Deep dive into ALL tech skills mentioned in the resume AND required by the JD. Cover:
- Core language/framework fundamentals (data structures, algorithms, language-specific concepts)
- Framework/library internals (how does X work under the hood)
- Database / storage (SQL, NoSQL, indexing, transactions)
- Networking & protocols (HTTP, REST, WebSocket, etc.)
- Security basics (auth, XSS, CSRF, SQL injection, etc.) if relevant
- DevOps/CI-CD/containerization if mentioned
- Testing methodologies if mentioned
- Performance optimization techniques
Ask about SPECIFIC technologies named in the resume and JD, not generic questions.

### "project" — 项目经历深挖（7-9 道）
Drill into EACH significant project in the resume. For each project ask about:
- 项目背景与你的具体职责
- 遇到的最大技术挑战及解决方案
- 技术选型原因（为什么用这个框架/工具而不是别的）
- 项目成果量化（性能提升了多少？用户量增长多少？）
- 如果重来你会做哪些不同的设计决策

### "behavioral" — 行为面试 STAR 法则（5-7 道）
Situational/behavioral questions using STAR method. Cover:
- 团队冲突处理（与同事或上级意见相左时）
- 带领项目或团队的经历
- 在 deadline 压力下的表现
- 主动发现并解决问题的案例
- 跨团队协作经历
- 从失败中学到的教训

### "system_design" — 系统设计（2-4 道，适合中高级岗位）
Only include if the role appears to be mid-level or above. Design questions relevant to the tech stack and domain in the JD:
- 根据 JD 业务场景设计核心系统（如：设计一个短链接服务、消息推送系统等）
- 如何保证系统的高可用和高并发
- 数据库选型与分库分表策略
- 缓存策略设计

### "open_ended" — 开放性问题（3-5 道）
Questions about growth mindset, culture fit, and motivation:
- 最近学习了哪些新技术？怎么学的？
- 你如何看待代码质量与交付速度之间的平衡？
- 工作之外有哪些技术社区贡献或个人项目？
- 你对我们公司/产品有什么了解？有什么想问我的？
- 你认为什么样的工程师文化是理想的？

## Distribution rules
- Total questions: 35 to 50
- All 6 categories must be present
- Difficulty distribution:
  - "basic": ~30%
  - "intermediate": ~45%
  - "advanced": ~25%
- Questions MUST be highly specific to this candidate's resume — reference actual project names, tech stack, companies, and metrics mentioned in the resume
- Do NOT generate generic placeholder questions

## Language and format rules
- ALL questions must be in Chinese (中文)
- sampleAnswer: 3-6 sentences, in Chinese, plausible for this specific candidate, reference their actual experience
- keyPoints: 3-5 bullet points in Chinese, highlighting what distinguishes a strong answer from an average one

Resume:
${resumeText}

Job Description:
${jobDescription}
`.trim();
}
