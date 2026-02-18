/* ── Section helpers ─────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <h2 className="text-base font-bold text-gray-100 shrink-0">{children}</h2>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-gray-400 leading-relaxed space-y-4 text-justify">{children}</div>
}

/* ── Main component ─────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="border-b border-gray-800 pb-5">
        <h1 className="text-2xl font-bold text-gray-100">About This App</h1>
        <p className="text-sm text-gray-500 mt-1.5">
          Why we built it, where the data comes from, and what's coming next.
        </p>
      </div>

      {/* ── Why this exists ── */}
      <section className="space-y-4">
        <SectionHeading>Why This Exists</SectionHeading>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <Prose>
            <p>
              The Australian Government publishes detailed data on how every university performs — dropout
              rates, completion rates, whether students pass their subjects, how long it takes to finish.
              It's one of the most thorough higher education datasets in the world.
            </p>
            <p>
              But almost nobody looks at it when choosing a university. Instead, students rely on global
              rankings (which mostly measure research reputation, not student experience), marketing, and
              word of mouth. That means big decisions get made without the most relevant information.
            </p>
            <p className="text-indigo-400 font-medium">
              This app puts that data in your hands.
            </p>
          </Prose>
        </div>
      </section>

      {/* ── What it does ── */}
      <section className="space-y-4">
        <SectionHeading>What It Does</SectionHeading>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <Prose>
            <p>
              The app takes official government data and turns it into something you can actually use
              when deciding where to study. The core question it helps you answer:
            </p>
            <blockquote className="border-l-2 border-indigo-500 pl-4 py-1 text-gray-300 italic">
              Where am I most likely to finish my degree and succeed?
            </blockquote>
            <p>
              Instead of asking which uni has the best brand, it focuses on things that directly
              affect your experience:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>How many students actually finish their degree (over 4, 6, and 9 years)</li>
              <li>Dropout rates — and whether they're getting better or worse</li>
              <li>Whether students come back after first year</li>
              <li>How many students pass their subjects</li>
              <li>How different fields compare across universities</li>
              <li>How well universities support students from different backgrounds</li>
            </ul>
          </Prose>
        </div>
      </section>

      {/* ── Why it matters ── */}
      <section className="space-y-4">
        <SectionHeading>Why This Matters</SectionHeading>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <Prose>
            <p>
              University is a big commitment — years of your life and significant financial investment.
              Dropping out, taking much longer than expected, or picking an institution that's in decline
              all have real consequences. But these risks are rarely shown to you when you're applying.
            </p>
            <p>Using real data, this app helps you:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { n: '1', text: 'See past the marketing and understand how universities actually perform' },
                { n: '2', text: 'Compare universities and fields side by side with real numbers' },
                { n: '3', text: 'Spot trends — is this uni getting better or worse over time?' },
                { n: '4', text: 'Make decisions based on evidence, not just reputation' },
              ].map((item) => (
                <div key={item.n} className="bg-gray-800 rounded-xl p-4 flex gap-3">
                  <span className="text-lg font-bold text-indigo-500 tabular-nums shrink-0">{item.n}</span>
                  <p className="text-sm text-gray-400">{item.text}</p>
                </div>
              ))}
            </div>
            <p>
              This doesn't mean global rankings or research excellence don't matter. But when you're
              deciding where to spend 3–6 years of your life, you deserve to see the outcomes data too.
            </p>
          </Prose>
        </div>
      </section>

      {/* ── How it's different ── */}
      <section className="space-y-4">
        <SectionHeading>How It's Different from Rankings</SectionHeading>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <Prose>
            <p>
              Global rankings measure things like how often a university's research gets cited,
              its reputation among academics, and how internationally diverse it is. Useful for some
              purposes — but not great for telling you whether <em>you'll</em> actually finish your degree there.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  This app doesn't ask
                </p>
                <p className="text-sm text-gray-500 italic">
                  "Which uni is ranked highest in the world?"
                </p>
              </div>
              <div className="bg-indigo-950/30 rounded-xl p-4 border border-indigo-800/50">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                  Instead, it asks
                </p>
                <ul className="text-sm text-gray-300 space-y-1.5">
                  <li>"Where am I most likely to finish my degree in this field?"</li>
                  <li>"Is this uni getting better or worse at keeping students?"</li>
                  <li>"What's the dropout risk if I study here?"</li>
                </ul>
              </div>
            </div>
          </Prose>
        </div>
      </section>

      {/* ── Where the data comes from ── */}
      <section className="space-y-4">
        <SectionHeading>Where the Data Comes From</SectionHeading>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <Prose>
            <p>
              Everything in this app comes from the Australian Department of Education's official
              statistics. Every university is required to report this data annually. We use:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Enrolments', desc: 'How many students are enrolled at each uni, broken down by field of study and year.' },
                { label: 'Graduates', desc: 'How many students completed their degrees at each uni and in each field.' },
                { label: 'Dropout & Return Rates', desc: 'What percentage of new students left and didn\'t come back — and trends over time.' },
                { label: 'Completion Rates', desc: 'Of the students who started together, how many finished within 4, 6, or 9 years.' },
                { label: 'Equity Data', desc: 'How well universities support students from different backgrounds — regional, lower-income, First Nations, disability, and more.' },
                { label: 'Risk Scores', desc: 'A combined measure we calculate from dropout rates and graduation rates, so you can compare at a glance.' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-200">{item.label}</h4>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </Prose>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className="space-y-4">
        <SectionHeading>What's Coming Next</SectionHeading>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <Prose>
            <p>
              This app is under active development. Here's what we're working on for future releases:
            </p>
            <div className="space-y-3">
              {[
                {
                  status: 'planned',
                  title: 'Graduate Outcomes',
                  desc: 'Employment rates, salary data, and whether graduates end up in jobs related to their degree — sourced from the Graduate Outcomes Survey.',
                },
                {
                  status: 'planned',
                  title: 'Student Satisfaction',
                  desc: 'How students rate their teaching quality, learning resources, and overall experience — from the Student Experience Survey.',
                },
                {
                  status: 'planned',
                  title: 'ATAR & Entry Requirements',
                  desc: 'Selection rank data so you can see the typical entry scores alongside outcome data — helping you find unis where you\'re likely to get in and succeed.',
                },
                {
                  status: 'planned',
                  title: 'Course-level Fees & HELP Debt',
                  desc: 'Student contribution amounts and expected HELP debt by course, so you can weigh costs against completion likelihood.',
                },
                {
                  status: 'planned',
                  title: 'Scholarships & Support Programs',
                  desc: 'Information on financial support, equity scholarships, and student services available at each university.',
                },
                {
                  status: 'exploring',
                  title: 'International Student Data',
                  desc: 'Completion and retention data for international students, where available in the Department\'s collections.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-gray-800 rounded-xl p-4 flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${item.status === 'planned' ? 'bg-indigo-500' : 'bg-gray-600'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 italic">
              Have a suggestion? We'd love to hear what data would be most useful to you.
            </p>
          </Prose>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section className="space-y-4">
        <SectionHeading>Important Disclaimer</SectionHeading>
        <div className="bg-amber-950/20 rounded-2xl p-5 border border-amber-800/30 space-y-3">
          <p className="text-sm text-gray-400 leading-relaxed text-justify">
            <strong className="text-amber-400/90">This app is in active development.</strong>{' '}
            While every effort has been made to process and present the data accurately,
            this tool is provided on an &ldquo;as is&rdquo; basis. There may be errors,
            omissions, or misinterpretations in how the data is displayed.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed text-justify">
            <strong className="text-gray-300">This is not professional advice.</strong>{' '}
            The information presented here is for general informational purposes only
            and should not be treated as a substitute for professional educational guidance,
            career counselling, or official university information. Always verify details
            directly with the relevant institution before making decisions about your education.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed text-justify">
            <strong className="text-gray-300">Data limitations.</strong>{' '}
            All data is sourced from the Australian Department of Education's Higher Education
            Statistics Collection. It is subject to the limitations, definitions, and collection
            methodologies of the original source. Some data points may be suppressed, unavailable,
            or not directly comparable across institutions due to differences in student cohort
            size, institutional structure, or reporting practices. Historical data reflects the
            year of publication and may not represent current conditions.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed text-justify">
            <strong className="text-gray-300">No affiliation.</strong>{' '}
            This app is an independent project. It is not affiliated with, endorsed by, or
            connected to the Australian Department of Education, any Australian university,
            or any government agency.
          </p>
        </div>
      </section>

      {/* ── Closing principle ── */}
      <div className="bg-gray-900/60 rounded-2xl p-6 border border-gray-800 text-center">
        <p className="text-sm text-gray-400 leading-relaxed">
          The principle behind this app is simple:
        </p>
        <p className="text-base font-semibold text-indigo-400 mt-3">
          Publicly funded data should be accessible and useful
          for the students it's about.
        </p>
      </div>

      {/* ── Built by ── */}
      <section id="built-by" className="space-y-4">
        <SectionHeading>Built By</SectionHeading>
        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-base font-bold text-gray-100">Dr Jason Ensor</h3>
                <p className="text-sm text-indigo-400 mt-0.5">
                  Data &amp; Analytics Executive &middot; Sydney, Australia
                </p>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed text-justify">
                This app was designed and built by Jason Ensor, a senior digital and data executive
                with over 30 years' experience in Australian higher education and the public sector. Most recently
                Director of Competitive Intelligence &amp; Analytics at a New South Wales university, Jason
                led enterprise analytics for the institution, building decision-support systems,
                AI-assisted forecasting workflows, and data governance frameworks used at Board level.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed text-justify">
                His career spans institutional analytics, data architecture, digital transformation,
                and research infrastructure, with a scholarly background that includes a PhD, peer-reviewed
                publications, international keynote speaking, and over $1.1M in competitive research funding.
                He holds PRINCE2, ITIL, and Management of Risk practitioner certifications, and has served
                on expert panels for the Australian Research Data Commons and national security research grants.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed text-justify">
                Course Survival Probability reflects the kind of work Jason does: turning complex
                government data into clear, evidence-based tools that support better decisions.
                The app is free for students because the data it uses is publicly funded — and
                should be accessible to the people it's about.
              </p>
            </div>
          </div>

          {/* Career highlights — compact grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { value: '30+', label: 'Years in data & digital' },
              { value: 'Director', label: 'Competitive Intelligence' },
              { value: 'PhD', label: 'Communication Studies' },
              { value: '$1.1M+', label: 'Research funding' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-800 rounded-xl px-3 py-3 text-center">
                <p className="text-sm font-bold text-gray-100">{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Availability signal — professional but clear */}
          <div className="bg-indigo-950/30 rounded-xl p-4 border border-indigo-800/40 space-y-2">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Available for engagement
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Jason is currently open to new opportunities — including contract and permanent
              roles, consulting engagements, advisory positions, and venture partnerships in
              higher education, data strategy, AI adoption, and public-sector innovation.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="https://linkedin.com/in/jasondensor/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:border-indigo-600 hover:text-indigo-300 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a
                href="mailto:jasondensor@gmail.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:border-indigo-600 hover:text-indigo-300 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Email
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Source attribution ── */}
      <footer className="text-xs text-gray-600 text-center pb-4 space-y-1">
        <p>
          Data source: Australian Department of Education — Higher Education Statistics Collection.
        </p>
        <p>
          All data is publicly available and published under Australian Government open data policy.
        </p>
        <p className="text-gray-700 pt-1">
          v1.0 &middot; Built by{' '}
          <a
            href="https://linkedin.com/in/jasondensor/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-indigo-400 transition-colors"
          >
            Dr Jason Ensor
          </a>
        </p>
      </footer>
    </div>
  )
}
