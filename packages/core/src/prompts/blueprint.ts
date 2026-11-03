import { BLUEPRINT_QUESTION_LIMIT, BLUEPRINT_REQUIREMENT_LIMIT } from '../constants'

const EXTRACTION_PROMPT = `You turn messy client material into a requirement map for a software proposal.

Rules:
- Return only requirements the evidence supports; cite the evidence ids that state each one.
- area: a short label such as auth, data, integrations, bot, dashboard, admin, api, payments, notifications.
- status: clear when the evidence states it, ambiguous when it is implied but vague, missing when the client needs it but no evidence states it.
- Suggest up to three requirements the evidence does not state. Pick a well-known real-world application of this kind of project as the reference and list what it has that this map is missing, such as accounts, notifications, admin, or reporting. Check every suggestion against the listed requirements: never repeat or rephrase one. Mark them suggested, set confidence low, and leave sourceEvidenceIds empty.
- confidence: how strongly the evidence supports the requirement.
- Never invent prices, timelines, or technology choices.
- summary: two sentences on what the client wants and what is still unclear.
- At most ${BLUEPRINT_REQUIREMENT_LIMIT} requirements, grouped by area.`

const READINESS_PROMPT = `You decide whether a requirement map is complete enough to draft a software proposal.

Enough when:
- the project type and the core areas are clear;
- each integration, bot, or dashboard area the client mentioned is concrete enough to scope;
- no missing requirement would change the scope or the tasks;
- when the map has suggested requirements, the technology stack and existing systems the project must use are known;
- answered facts below are treated as facts and are never asked for again.

Not enough otherwise. List up to ${BLUEPRINT_QUESTION_LIMIT} gaps, the most decisive first, each a single fact the client can supply. Do not ask for prices or timelines unless the client already asked for them.`

const QUESTIONS_PROMPT = `You ask targeted questions that close the listed gaps in a requirement map.

Rules:
- Each question targets one gap and asks for a fact only the client can confirm.
- Keep each question under 300 characters and specific to the areas and integrations in the map.
- rationale: one sentence on why the answer changes the proposal.
- gap: the exact gap text this question closes.
- kind: short for one short fact such as a name, host, or count; long when the answer needs a sentence or a list; select when the answer is one of a few known choices; date when the answer is a specific day.
- options: for select only, the two to six allowed answers and nothing else. Leave it empty for every other kind.
- When the map has suggested requirements or no answered fact names a technology, ask one question about the stack and existing systems the project must use. Use kind select with two to five plausible options, such as the platform the evidence mentions plus common alternatives. Never pick a stack yourself.`

const HIERARCHY_PROMPT = `You arrange a software project into an app hierarchy for a proposal diagram.

Rules:
- Return three to eight groups; each group is a user-facing area such as auth, booking, admin, billing, or reporting.
- Each group has two to four short capability labels.
- Base the groups on the requirement map. Add capabilities a real app of this kind has when they are missing, but never repeat a capability already listed.
- Name groups in lowercase, and keep every label under 48 characters.
- No prices, timelines, or technology choices.`

const FLOW_PROMPT = `You write the end-to-end user flow of a software project for a proposal diagram.

Rules:
- Return three to ten ordered steps, from the first visit or entry point to the outcome, then admin or support steps.
- label: two to five words. detail: one short sentence under ninety characters.
- kind: entry for the first step, screen for a page or view, decision for a branch or check, outcome for a result.
- Follow the requirement map and the answered facts. Never invent prices, timelines, or technology choices.`

const DRAFT_PROMPT = `Write a software project proposal in markdown from the requirement map.

Sections, in order: Summary, Scope, Out of scope, Task breakdown, Timeline, Assumptions, Open questions.

Rules:
- Keep the whole proposal under 1,200 words. No section longer than 150 words.
- Every Scope and Task line ends with the requirement ids it comes from as [req:<id>], or is marked [estimate] when it is the freelancer's judgement rather than a client requirement.
- Out of scope lists explicit exclusions with a one-line reason.
- Timeline: only use durations the freelancer supplied. Otherwise write a short "AI estimate, confirm with the client" line and mark it [estimate]. Never invent prices.
- No pricing section. No technologies the requirement map does not name.
- Open questions repeat only gaps that are still unanswered.
- Never mention anything absent from the requirement map or the answered facts.`

type Evidence = { id: string; kind: string; text: string }
type Requirement = {
  id: string
  area: string
  status: string
  text: string
  sources: Array<string>
}
type AnsweredFact = { question: string; answer: string }

function evidenceText(evidence: Array<Evidence>): string {
  if (evidence.length === 0) return 'None.'

  return evidence.map((item) => `${item.id} | ${item.kind} | ${item.text}`).join('\n')
}

function requirementsText(requirements: Array<Requirement>): string {
  if (requirements.length === 0) return 'None.'

  return requirements
    .map(
      (item) =>
        `${item.id} | ${item.area} | ${item.status} | ${item.text} | sources: ${item.sources.join(', ')}`
    )
    .join('\n')
}

function answeredFacts(answers?: Array<AnsweredFact>): string {
  if (!answers || answers.length === 0) return ''

  return `\n\nAnswered facts (confirmed by the client; never ask for these again):\n${answers
    .map((fact) => `- Q: ${fact.question}\n  A: ${fact.answer}`)
    .join('\n')}`
}

export function buildBlueprintExtractionPrompt(options: {
  evidence: Array<Evidence>
  answers?: Array<AnsweredFact>
}): string {
  return `${EXTRACTION_PROMPT}\n\nEvidence (id | kind | text):\n${evidenceText(options.evidence)}${answeredFacts(options.answers)}`
}

export function buildBlueprintReadinessPrompt(options: {
  requirements: Array<Requirement>
  answers?: Array<AnsweredFact>
}): string {
  return `${READINESS_PROMPT}\n\nRequirements (id | area | status | text | sources):\n${requirementsText(options.requirements)}${answeredFacts(options.answers)}`
}

export function buildBlueprintQuestionsPrompt(options: {
  requirements: Array<Requirement>
  gaps: Array<string>
  answers?: Array<AnsweredFact>
}): string {
  const gaps = options.gaps.map((gap) => `- ${gap}`).join('\n')

  return `${QUESTIONS_PROMPT}\n\nRequirements (id | area | status | text | sources):\n${requirementsText(options.requirements)}\n\nGaps:\n${gaps || 'None.'}${answeredFacts(options.answers)}`
}

export function buildBlueprintHierarchyPrompt(options: {
  title: string
  client: string | null
  requirements: Array<Requirement>
  answers?: Array<AnsweredFact>
}): string {
  const client = options.client ? `\nClient: ${options.client}` : ''

  return `${HIERARCHY_PROMPT}\n\nProject: ${options.title}${client}\n\nRequirements (id | area | status | text | sources):\n${requirementsText(options.requirements)}${answeredFacts(options.answers)}`
}

export function buildBlueprintFlowPrompt(options: {
  title: string
  client: string | null
  requirements: Array<Requirement>
  answers?: Array<AnsweredFact>
}): string {
  const client = options.client ? `\nClient: ${options.client}` : ''

  return `${FLOW_PROMPT}\n\nProject: ${options.title}${client}\n\nRequirements (id | area | status | text | sources):\n${requirementsText(options.requirements)}${answeredFacts(options.answers)}`
}

export function buildBlueprintDraftPrompt(options: {
  title: string
  client: string | null
  requirements: Array<Requirement>
  answers?: Array<AnsweredFact>
}): string {
  const client = options.client ? `\nClient: ${options.client}` : ''

  return `${DRAFT_PROMPT}\n\nProject: ${options.title}${client}\n\nRequirements (id | area | status | text | sources):\n${requirementsText(options.requirements)}${answeredFacts(options.answers)}`
}
