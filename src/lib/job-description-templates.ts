export type JobDescriptionTemplate = {
  id: string;
  name: string;
  summary: string;
  content: string;
};

export const jobDescriptionTemplates: JobDescriptionTemplate[] = [
  {
    id: "frontend-engineer",
    name: "前端工程师",
    summary: "React / TypeScript / 性能优化 / 工程化",
    content: `岗位职责：
- 负责 Web 前端产品的页面开发、组件抽象与交互体验优化
- 与产品、设计、后端协作，推动需求高质量上线
- 持续优化前端工程体系、构建流程、性能和稳定性

任职要求：
- 熟练掌握 JavaScript / TypeScript / HTML / CSS
- 熟悉 React 生态与组件化开发
- 具备前端性能优化、工程化、接口联调经验
- 有复杂后台系统或数据可视化项目经验优先

关键词：
React、TypeScript、Next.js、组件设计、性能优化、工程化、可维护性、跨团队协作`
  },
  {
    id: "product-manager",
    name: "产品经理",
    summary: "需求分析 / 数据驱动 / 跨团队推进",
    content: `岗位职责：
- 负责产品需求分析、方案设计、排期推进和上线复盘
- 协调设计、研发、运营等团队推动项目落地
- 基于数据和用户反馈持续优化关键流程

任职要求：
- 具备较强的需求抽象和结构化表达能力
- 熟悉 PRD、流程图、原型等产出方式
- 具备数据分析和业务指标拆解能力
- 有 ToC 或 ToB 产品经验优先

关键词：
需求分析、产品设计、项目推进、数据分析、用户研究、PRD、跨团队协作、增长优化`
  },
  {
    id: "backend-engineer",
    name: "后端工程师",
    summary: "服务设计 / 数据库 / 稳定性 / API",
    content: `岗位职责：
- 负责后端服务设计、开发、部署和稳定性保障
- 负责数据库设计、接口实现和业务性能优化
- 与前端和产品协作完成复杂业务系统建设

任职要求：
- 扎实的数据结构和计算机基础
- 熟悉 Node.js、Java、Go、Python 中至少一种后端语言
- 熟悉 SQL、索引优化、缓存、消息队列等基础设施
- 具备高并发、高可用系统经验优先

关键词：
API 设计、数据库设计、性能优化、缓存、消息队列、微服务、可观测性、稳定性`
  }
];
