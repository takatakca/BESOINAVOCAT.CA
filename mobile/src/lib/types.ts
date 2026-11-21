// Shapes returned by the portal (platform/server.mjs and platform/lib/*). Only the fields the app reads.
export type User = { subject: string; tenantId: string; email?: string; name?: string; product?: string };

export type Health = { status: string; emailCodeConfigured: boolean; clientSignup: boolean; googleSignIn: boolean; lawyerSpace?: { trialDays: number } };

export type Profile = {
  domain: string | null; domainLabel: string | null; summary: string;
  status: 'preparation' | 'pret' | 'accepte'; readyAt: string | null; acceptedBy: string | null; acceptedAt: string | null;
};

export type Case = { id: string; title: string; reference: string; createdAt: string; createdBy: string; role: 'client' | 'lawyer' | 'owner'; profile: Profile };

export type Document = {
  id: string; caseId: string; rootDocumentId: string; versionOf: string | null; versionNumber: number; name: string; mimeType: string;
  sha256: string; size?: number; bytes?: number; sourceType: string; reviewStatus: string; createdAt: string; createdBy: string; excerpt?: string; page?: number;
};
export type Message = { id: string; caseId: string; body: string; authorSubject: string; createdAt: string };
export type TimeEntry = { id: string; description: string; minutes: number; createdAt: string; authorSubject: string; approvedBy?: string | null };
export type Session = { id: string; caseId: string; kind: string; title: string; scheduledAt: string; joinUrl: string | null; status: string };

export type CaseDetails = {
  case: Case; documents: Document[]; messages: Message[]; timeEntries: TimeEntry[];
  communications: { sessions: Session[] };
};

export type Deadline = {
  id: string; title: string; kind: string; kindLabel: string; dueDate: string; dueTime: string | null; note: string;
  visibleToClient: boolean; status: string; daysLeft: number; overdue: boolean; caseId?: string; caseTitle?: string; caseReference?: string;
};

export type DocRequest = { id: string; title: string; note: string; dueDate: string | null; status: 'requested' | 'provided' | 'accepted' | 'declined' | string; documentId: string | null; answer: string; createdAt: string };
export type RequestList = { requests: DocRequest[]; canRequest: boolean; open: number; toReview: number };

export type Invitation = { id: string; caseId: string; status: string; createdAt: string; expiresAt: string };

export type SearchHit = Document & { excerpt?: string };

export type Domain = { id: string; label: string };

export type Capabilities = {
  intakeReview: boolean;
  lawyerSpace: { url: string; trialDays: number; account: boolean };
  clientAccount: boolean;
  caseMatching: { domains: Domain[] };
  maxDocumentBytes: number;
  caseStorageQuotaBytes: number;
  billing: { configured: boolean; enforced: boolean };
};

export type Plan = { id: string; label: string; rank: number; tagline: string; storageBytes: number; maxCases: number | null; video: boolean; prices: { month?: number; year?: number }; features: string[] };
export type Pricing = {
  currency: string; trialDays: number;
  client: { plans: Plan[] };
  lawyer: { plans: { id: string; label: string; amount?: number; interval?: string; [k: string]: unknown }[]; [k: string]: unknown };
};

export type Billing = {
  configured: boolean; billed: boolean; kind?: 'client' | 'lawyer';
  plan?: { id: string; label: string; source: string };
  trial?: { endsAt?: string; active?: boolean } | null;
  usage?: { bytes: number; quotaBytes: number; percent: number; cases: number; maxCases: number | null } | null;
};

export type LawyerMe = { account: { name?: string; domains?: string[]; [k: string]: unknown } | null; cases: Case[]; domains: Domain[]; trialDays: number };
export type ReadyCase = { id: string; title: string; domain: string; domainLabel: string; summary: string; documents?: number; readyAt: string };
