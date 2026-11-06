import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { withBasePath } from "@/lib/base-path"

/**
 * /privacy and /tos: the pages Google's sign-in consent screen links to.
 * Plain content, no app providers or data fetching. Keep the privacy policy in
 * step with what the code actually does: if a new service starts receiving
 * user data, it belongs in "Who processes it".
 */

export type LegalDoc = "privacy" | "tos"

const CONTACT = "ken.peterson@maplekey.org"
const UPDATED = "November 6, 2026"

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <article className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        <a
          href={withBasePath("/")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Maple Key
        </a>
        {doc === "privacy" ? <Privacy /> : <Terms />}
        <p className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">
          Maple Key is made by Arboretum Labs. Questions: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          {" · "}
          <a className="underline" href={withBasePath(doc === "privacy" ? "/tos" : "/privacy")}>
            {doc === "privacy" ? "Terms of Service" : "Privacy Policy"}
          </a>
        </p>
      </article>
    </div>
  )
}

function Title({ children }: { children: ReactNode }) {
  return (
    <header className="mt-6">
      <h1 className="text-2xl font-bold">{children}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated {UPDATED}</p>
    </header>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  )
}

function List({ children }: { children: ReactNode }) {
  return <ul className="ml-4 flex list-disc flex-col gap-2">{children}</ul>
}

function Privacy() {
  return (
    <>
      <Title>Privacy Policy</Title>
      <Section title="The short version">
        <p>
          Maple Key helps teachers find resources and plan lessons. We collect as little as we can, we don't sell or
          share personal information for advertising, and we don't run ads or tracking scripts. Students don't have
          accounts, and their answers never leave their own device.
        </p>
      </Section>

      <Section title="What we collect">
        <List>
          <li>
            <strong>If you sign in:</strong> your name and email address (from Google, or the address you type for an
            email sign-in link), and the school or workspace and role you belong to. If an administrator invites you,
            we store the invitation (your email, the school, the role and who sent it).
          </li>
          <li>
            <strong>What you create:</strong> lesson plans, planning answers and graphic organizers. When you share an
            organizer as a short student link, we store the organizer's text (its title and prompts) so students can
            open it.
          </li>
          <li>
            <strong>In your browser:</strong> your filters, bookmarks, classroom materials and saved lessons are kept
            in your browser's local storage. They stay on that device unless you're signed in and a feature says it
            syncs them.
          </li>
          <li>
            <strong>Technical logs:</strong> our hosting provider records standard request logs (such as IP address
            and time) to run and protect the service.
          </li>
        </List>
      </Section>

      <Section title="Students">
        <p>
          Students use Maple Key only through links their teacher shares. They don't sign in, and we don't collect
          their names or email addresses. Answers a student types into an activity are saved only in their own
          browser and leave it only as a PDF the student chooses to download and hand in. Please don't put students'
          personal information into lesson plans or prompts.
        </p>
      </Section>

      <Section title="How we use it">
        <List>
          <li>To sign you in and show you your school's or workspace's content, and no one else's.</li>
          <li>To generate lesson plans, planning questions and assessments when you ask for them.</li>
          <li>To send sign-in links and invitations you or your administrator request.</li>
          <li>To keep the service secure and working, and to answer you when you contact us.</li>
        </List>
        <p>We don't use your information for advertising, and we don't sell it.</p>
      </Section>

      <Section title="Who processes it">
        <List>
          <li>
            <strong>Supabase</strong> stores accounts, schools, invitations, lessons and shared organizers in its
            Canada (Central) region, and sends sign-in and invitation emails.
          </li>
          <li>
            <strong>Vercel</strong> hosts the website and the server functions that run it.
          </li>
          <li>
            <strong>Anthropic</strong> receives what you enter when you ask Maple Key to generate a lesson, questions
            or an assessment, and returns the generated text. Under its commercial terms it does not use that content
            to train its models.
          </li>
          <li>
            <strong>Google</strong> handles sign-in when you choose "Continue with Google". We receive your name,
            email address and profile picture link; we don't get access to your Google Drive, Classroom or Gmail.
          </li>
        </List>
        <p>
          Some of these providers may process data outside Canada. Each is bound by its own privacy and security
          commitments.
        </p>
      </Section>

      <Section title="Who can see your content">
        <p>
          Your school's or workspace's content is visible only to its members, according to their role: teachers see
          their own school, school administrators manage their school, and district administrators can see the
          schools in their district. A solo workspace is visible only to you. Anyone with a short student link can
          open that one organizer.
        </p>
      </Section>

      <Section title="Keeping and deleting it">
        <p>
          We keep account information while your account is active. You can ask us to delete your account and the
          content tied to it by emailing us; if your account belongs to a school, we may check with its administrator
          first. Invitations expire after 14 days. Data in your browser's local storage is removed when you clear
          your browser data.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask to see, correct or delete the personal information we hold about you, or ask questions about
          how we handle it, by emailing <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>. If you're
          not satisfied with our answer, you can contact the Office of the Privacy Commissioner of Canada.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this policy, we'll update the date at the top, and tell signed-in users about significant
          changes.
        </p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <Title>Terms of Service</Title>
      <Section title="Agreement">
        <p>
          These terms apply when you use Maple Key, a lesson-planning tool made by Arboretum Labs ("we"). By using
          it, you agree to them. If you use Maple Key on behalf of a school or district, you confirm you're allowed
          to.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          Keep your sign-in secure and use your own account. School and district administrators are responsible for
          who they invite and the roles they give. Tell us if you think someone has accessed your account without
          permission.
        </p>
      </Section>

      <Section title="Your content">
        <p>
          You own the lessons, organizers and other material you create. You give us permission to store, process
          and display it only as needed to run Maple Key for you and the people you share it with. Don't upload
          anything you don't have the right to use, and don't include students' personal information.
        </p>
      </Section>

      <Section title="AI-generated material">
        <p>
          Maple Key uses AI to draft lessons, questions and assessments. Drafts can contain mistakes or miss what
          your students need. Review and adapt everything before using it in class; you remain responsible for what
          you teach and assign.
        </p>
      </Section>

      <Section title="Resources from other sites">
        <p>
          Maple Key links to resources published by others. We curate and check them, but we don't control those
          sites, and their own terms apply when you visit them.
        </p>
      </Section>

      <Section title="Acceptable use">
        <List>
          <li>Don't try to access other schools' or users' content, or get around the service's security.</li>
          <li>Don't overload, scrape or reverse-engineer the service, or use it to send spam.</li>
          <li>Don't use it for anything unlawful or harmful to students.</li>
        </List>
      </Section>

      <Section title="Availability and changes">
        <p>
          We work to keep Maple Key running and improving, but we provide it "as is" and can't promise it will always
          be available or error-free. We may change or discontinue features, and we'll give reasonable notice of
          changes that significantly affect you.
        </p>
      </Section>

      <Section title="Ending use">
        <p>
          You can stop using Maple Key at any time and ask us to delete your account. We may suspend accounts that
          break these terms.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the extent the law allows, we're not liable for indirect or consequential losses arising from your use
          of Maple Key.
        </p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of Ontario and the federal laws of Canada that apply there.</p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </Section>
    </>
  )
}
