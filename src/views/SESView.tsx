import { useState, useEffect } from 'react';
import {
  ListIdentitiesCommand,
  VerifyEmailIdentityCommand,
  SendEmailCommand,
  GetSendQuotaCommand,
  GetIdentityVerificationAttributesCommand,
} from '@aws-sdk/client-ses';
import { useAws } from '../contexts/AwsContext';
import {
  Mail,
  Search,
  CirclePlus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const verificationBadge = (status?: string) => {
  switch (status) {
    case 'Success':
      return <span className="flex items-center gap-1 px-2 py-0.5 border border-emerald-500 bg-emerald-50 text-emerald-800 text-[8px] font-bold uppercase tracking-wide"><CheckCircle size={10} /> Verified</span>;
    case 'Pending':
      return <span className="flex items-center gap-1 px-2 py-0.5 border border-amber-400 bg-amber-50 text-amber-800 text-[8px] font-bold uppercase tracking-wide"><Clock size={10} /> Pending</span>;
    case 'Failed':
      return <span className="flex items-center gap-1 px-2 py-0.5 border border-rose-500 bg-rose-50 text-rose-800 text-[8px] font-bold uppercase tracking-wide"><XCircle size={10} /> Failed</span>;
    default:
      return <span className="px-2 py-0.5 border border-neutral-300 bg-neutral-50 text-neutral-600 text-[8px] font-bold uppercase tracking-wide">Unknown</span>;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SESView = () => {
  const { clients, logActivity } = useAws();
  const [identities, setIdentities] = useState<string[]>([]);
  const [verificationAttrs, setVerificationAttrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Quota
  const [quota, setQuota] = useState<{ Max24HourSend?: number; MaxSendRate?: number; SentLast24Hours?: number } | null>(null);

  // Verify modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Send email
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [fromAddr, setFromAddr] = useState('');
  const [toAddr, setToAddr] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [listRes, quotaRes] = await Promise.all([
        clients.ses.send(new ListIdentitiesCommand({ IdentityType: 'EmailAddress', MaxItems: 100 })),
        clients.ses.send(new GetSendQuotaCommand({})),
      ]);

      const ids = listRes.Identities ?? [];
      setIdentities(ids);
      setQuota({
        Max24HourSend: quotaRes.Max24HourSend,
        MaxSendRate: quotaRes.MaxSendRate,
        SentLast24Hours: quotaRes.SentLast24Hours,
      });
      logActivity('SES', 'ListIdentities + GetSendQuota', 'success', `${ids.length} identities`);

      if (ids.length > 0) {
        const attrRes = await clients.ses.send(
          new GetIdentityVerificationAttributesCommand({ Identities: ids })
        );
        const attrs: Record<string, string> = {};
        for (const [id, val] of Object.entries(attrRes.VerificationAttributes ?? {})) {
          attrs[id] = val.VerificationStatus ?? 'Unknown';
        }
        setVerificationAttrs(attrs);
      }
    } catch (err) {
      logActivity('SES', 'FetchAll failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ─── Verify email ──────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!newEmail) return;
    setVerifying(true);
    try {
      await clients.ses.send(new VerifyEmailIdentityCommand({ EmailAddress: newEmail }));
      logActivity('SES', `VerifyEmailIdentity: ${newEmail}`, 'success');
      setNewEmail('');
      setIsVerifyModalOpen(false);
      fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('SES', `VerifyEmailIdentity failed`, 'error', message);
      alert(message);
    } finally {
      setVerifying(false);
    }
  };

  // ─── Send email ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!fromAddr || !toAddr || !emailSubject || !emailBody) return;
    setSending(true);
    try {
      await clients.ses.send(new SendEmailCommand({
        Source: fromAddr,
        Destination: { ToAddresses: [toAddr] },
        Message: {
          Subject: { Data: emailSubject, Charset: 'UTF-8' },
          Body: { Text: { Data: emailBody, Charset: 'UTF-8' } },
        },
      }));
      logActivity('SES', `SendEmail: ${fromAddr} → ${toAddr}`, 'success');
      setIsSendModalOpen(false);
      setToAddr('');
      setEmailSubject('');
      setEmailBody('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('SES', `SendEmail failed`, 'error', message);
      alert(message);
    } finally {
      setSending(false);
    }
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const filtered = identities.filter(id => id.toLowerCase().includes(search.toLowerCase()));
  const verifiedCount = Object.values(verificationAttrs).filter(s => s === 'Success').length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="SES Identities"
        icon={<Mail size={18} />}
        onRefresh={fetchAll}
        isRefreshing={loading}
        actions={
          <div className="flex gap-3">
            <Button variant="ghost" icon={<Send size={13} />} onClick={() => setIsSendModalOpen(true)}>
              Send Email
            </Button>
            <Button icon={<CirclePlus size={14} />} onClick={() => setIsVerifyModalOpen(true)}>
              Verify Address
            </Button>
          </div>
        }
      />

      {/* Quota bar */}
      {quota && (
        <div className="border-b border-brand-text/10 bg-brand-muted/30 px-6 py-3 flex gap-8 text-[10px] font-bold uppercase">
          <div className="flex items-center gap-2">
            <BarChart3 size={13} className="opacity-50" />
            <span className="opacity-50">Quota 24h:</span>
            <span>{quota.Max24HourSend?.toLocaleString() ?? '—'}</span>
          </div>
          <div>
            <span className="opacity-50">Sent 24h: </span>
            <span>{quota.SentLast24Hours?.toLocaleString() ?? '0'}</span>
          </div>
          <div>
            <span className="opacity-50">Rate: </span>
            <span>{quota.MaxSendRate ?? '—'} msg/s</span>
          </div>
          <div>
            <span className="opacity-50">Verified: </span>
            <span className="text-emerald-600">{verifiedCount}</span>
            <span className="opacity-50"> / {identities.length}</span>
          </div>
        </div>
      )}

      {/* Verify modal */}
      <Modal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} title="Verify Email Address">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Email Address</label>
            <Input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="dev@example.com"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
          </div>
          <p className="text-[9px] opacity-50 normal-case">
            SES will send a verification email. In local emulation the identity is confirmed immediately.
          </p>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsVerifyModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleVerify} disabled={!newEmail || verifying}>
              {verifying ? 'Sending...' : 'Verify'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Send email modal */}
      <Modal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} title="Send Email">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">From</label>
              <Input
                value={fromAddr}
                onChange={e => setFromAddr(e.target.value)}
                placeholder="sender@verified.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">To</label>
              <Input
                value={toAddr}
                onChange={e => setToAddr(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Subject</label>
            <Input
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder="Hello from floci"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Body</label>
            <textarea
              className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-text transition-all placeholder:italic font-mono min-h-[100px] normal-case"
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              placeholder="Email body here..."
            />
          </div>
          <div className="pt-2 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsSendModalOpen(false)}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={!fromAddr || !toAddr || !emailSubject || !emailBody || sending}
              icon={<Send size={13} />}
            >
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Main content */}
      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input
            placeholder="Filter identities..."
            className="pl-10 font-mono text-[11px]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)
          ) : filtered.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-16 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
              <Mail size={28} className="mx-auto mb-3 opacity-40" />
              No verified identities. Add one to start sending.
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_10rem_4rem] gap-4 px-4 text-[8px] font-bold opacity-40 uppercase tracking-widest border-b border-brand-text/10 pb-2">
                <span>Email Address</span>
                <span>Status</span>
                <span></span>
              </div>
              {filtered.map(id => (
                <Card key={id} className="group hover:bg-brand-text hover:text-brand-bg transition-colors">
                  <div className="grid grid-cols-[1fr_10rem_4rem] gap-4 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 border border-brand-text flex items-center justify-center opacity-60 group-hover:border-brand-bg shrink-0">
                        <Mail size={14} />
                      </div>
                      <span className="font-mono text-[11px] font-bold normal-case truncate">{id}</span>
                    </div>
                    <div>
                      {verificationAttrs[id]
                        ? verificationBadge(verificationAttrs[id])
                        : <span className="text-[8px] opacity-30 font-mono">Loading...</span>
                      }
                    </div>
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setFromAddr(id); setIsSendModalOpen(true); }}
                        className="p-1 hover:text-brand-bg"
                        title="Send email from this address"
                      >
                        <Send size={13} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Remove identity "${id}"?`)) return;
                          try {
                            await clients.ses.send(new (await import('@aws-sdk/client-ses')).DeleteIdentityCommand({ Identity: id }));
                            logActivity('SES', `DeleteIdentity: ${id}`, 'success');
                            fetchAll();
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            logActivity('SES', `DeleteIdentity failed`, 'error', message);
                            alert(message);
                          }
                        }}
                        className="p-1 hover:text-rose-400"
                        title="Remove identity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SESView;
