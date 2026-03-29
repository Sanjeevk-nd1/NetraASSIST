import { Shield, Brain, FileText, MessageSquare, Zap, Target, BarChart3, Clock } from 'lucide-react';

export default function About() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="space-y-10 animate-fade-up">

          {/* Hero */}
          <div className="page-section hero-section">
            <div className="section-kicker">
              <Shield size={15} />
              About NetraASSIST
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-dark lg:text-5xl">
              AI-Powered RFP &amp; RFQ Response Automation
            </h1>
            <p className="mt-5 text-base leading-7 text-muted">
              NetraASSIST is an enterprise intelligence platform built by the Netradyne InfoSec team. It combines advanced document indexing, retrieval-augmented generation (RAG), and large language models to transform how organizations respond to security questionnaires, RFPs, and RFQs — reducing response time from weeks to hours while maintaining expert-level accuracy.
            </p>
          </div>

          {/* What it does */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <Target size={15} />
                Purpose
              </div>
              <h2 className="text-2xl font-extrabold text-dark">What NetraASSIST Does</h2>
            </div>

            <div className="mt-6 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                Every enterprise faces a constant stream of security questionnaires, RFPs (Request for Proposal), and RFQs (Request for Quotation) from customers, partners, and auditors. These documents often contain hundreds of questions about policies, compliance, infrastructure, and business practices — and each one demands accurate, consistent answers drawn from organizational knowledge.
              </p>
              <p>
                Traditionally, answering these documents is a labour-intensive process: subject matter experts manually search through policy documents, past responses, and internal wikis to craft each answer. A single RFP with 200+ questions can take a team several weeks.
              </p>
              <p>
                <strong className="text-dark">NetraASSIST changes this entirely.</strong> It ingests your organization's entire knowledge base — policy documents, SOPs, compliance frameworks, architecture docs — and uses AI to instantly generate accurate, contextual answers to any question. Subject matter experts then review, edit, and approve each response before export, ensuring human oversight at every step.
              </p>
            </div>
          </div>

          {/* Key capabilities */}
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                icon: FileText,
                title: 'Batch Document Processing',
                desc: 'Upload Excel files with hundreds of questions. The system processes each question in parallel using a distributed task queue, delivering answers with source citations in minutes instead of weeks.',
              },
              {
                icon: MessageSquare,
                title: 'Intelligent Chatbot (NetraBOT)',
                desc: 'Ask any question about your organization\'s policies, procedures, or compliance posture in natural language. NetraBOT searches the entire knowledge base and returns comprehensive, source-backed answers.',
              },
              {
                icon: Brain,
                title: 'AI-Powered Accuracy',
                desc: 'Backed by advanced LLM models with multi-deployment fallback, circuit breaker protection, and rate-limit resilience. Answers are grounded in your actual documents — not hallucinated.',
              },
              {
                icon: Zap,
                title: 'PageIndex RAG Engine',
                desc: 'A proprietary vectorless retrieval-augmented generation engine that understands document hierarchy and structure, enabling precise section-level retrieval without traditional embedding databases.',
              },
              {
                icon: BarChart3,
                title: 'Review & Quality Control',
                desc: 'Every generated answer goes through a human review workflow. Accept, edit, retry, or regenerate individual responses. Bulk accept for efficiency, with full audit trail.',
              },
              {
                icon: Clock,
                title: 'Speed & Scale',
                desc: 'Process 500+ questions per batch with concurrent Celery workers. Automatic rate limiting, retry logic, and job queuing ensure reliable processing even under heavy load.',
              },
            ].map((item) => (
              <div key={item.title} className="panel-card panel-card-hover p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light">
                  <item.icon size={22} className="text-brand" />
                </div>
                <h3 className="text-base font-extrabold text-dark">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* How AI helps */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <Brain size={15} />
                AI Advantage
              </div>
              <h2 className="text-2xl font-extrabold text-dark">How AI Transforms RFP Response</h2>
            </div>

            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                <h4 className="font-bold text-dark">Before NetraASSIST</h4>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                    Manual search through dozens of policy documents for each question
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                    Inconsistent answers across different RFPs and team members
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                    Weeks of effort for large questionnaires (200-500 questions)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                    Knowledge silos — answers depend on who's available
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <h4 className="font-bold text-dark">With NetraASSIST</h4>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                    AI instantly retrieves the most relevant sections from your entire knowledge base
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                    Consistent, well-structured answers grounded in official documentation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                    Hours instead of weeks — 500 questions processed in under 30 minutes
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                    Institutional knowledge available to everyone, anytime
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Built by */}
          <div className="page-section text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Built With Purpose</p>
            <h2 className="mt-3 text-2xl font-extrabold text-dark">By the InfoSec Team, For the Enterprise</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">
              NetraASSIST was designed and built by the Netradyne Information Security team to solve a real, recurring challenge — answering security questionnaires at scale without compromising accuracy. Every feature reflects real-world workflow needs validated through production use.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
