import { Mail, MessageCircle, Bug, Shield, ExternalLink } from 'lucide-react';

export default function Contact() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="space-y-10 animate-fade-up">

          {/* Header */}
          <div className="page-section hero-section">
            <div className="section-kicker">
              <Mail size={15} />
              Contact Us
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-dark lg:text-4xl">
              Get in Touch
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              Have feedback, found a bug, or need help? Reach out to the right team below. We're committed to making NetraASSIST better with every release.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">

            {/* Feedback */}
            <div className="panel-card p-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-brand-light">
                <MessageCircle size={26} className="text-brand" />
              </div>
              <h2 className="text-xl font-extrabold text-dark">Feedback &amp; Suggestions</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Share your ideas, feature requests, or general feedback about NetraASSIST. We actively review all submissions and prioritize improvements based on user input.
              </p>

              <div className="mt-8 space-y-5">
                <div className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light">
                      <Shield size={18} className="text-brand" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-dark">Netradyne InfoSec Team</p>
                      <p className="text-xs text-muted-light">Information Security</p>
                    </div>
                  </div>
                  <a
                    href="mailto:infosec@netradyne.com"
                    className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
                  >
                    <Mail size={15} />
                    infosec@netradyne.com
                    <ExternalLink size={12} className="opacity-50" />
                  </a>
                </div>
              </div>
            </div>

            {/* Issues & Errors */}
            <div className="panel-card p-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-red-500/10">
                <Bug size={26} className="text-danger" />
              </div>
              <h2 className="text-xl font-extrabold text-dark">Issues &amp; Errors</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Encountered a bug, error, or unexpected behavior? Report it directly to the InfoSec team. Please include steps to reproduce, screenshots, and the browser you're using.
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                <strong className="text-dark">AI response not accurate?</strong> If you notice an AI-generated response that is inaccurate or incorrect, please report that as well — it helps us improve the model and the knowledge base.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                      <Shield size={18} className="text-danger" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-dark">Netradyne InfoSec Team</p>
                      <p className="text-xs text-muted-light">Bugs, Errors &amp; Inaccurate Responses</p>
                    </div>
                  </div>
                  <a
                    href="mailto:infosec@netradyne.com"
                    className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
                  >
                    <Mail size={15} />
                    infosec@netradyne.com
                    <ExternalLink size={12} className="opacity-50" />
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Tips */}
          <div className="info-note">
            <div className="mb-2 flex items-center gap-2">
              <Bug size={16} className="info-note-title" />
              <h4 className="info-note-title text-sm font-bold">Reporting Tips</h4>
            </div>
            <ul className="info-note-text space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
                Include the page you were on and what action triggered the issue
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
                Attach screenshots or the browser console error if possible
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
                Mention your browser and OS (e.g., Chrome on macOS)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
                If it's a batch processing issue, include the job filename and question number
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
                If an AI response is inaccurate or incorrect, include the question and the generated answer so we can investigate
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
