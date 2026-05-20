import React, { useState } from 'react';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { useAws } from '../contexts/AwsContext';
import { Mail, Send, Terminal, X, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';

const SESView = () => {
  const { clients, logActivity } = useAws();
  const [loading, setLoading] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sentEmails, setSentEmails] = useState<any[]>([]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await clients.ses.send(new SendEmailCommand({
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } }
        },
        Source: 'no-reply@floci.local'
      }));
      
      const newEmail = { to, subject, body, date: new Date(), id: Math.random().toString(36).substr(2, 9) };
      setSentEmails(prev => [newEmail, ...prev]);
      logActivity('SES', `SendEmail to ${to}`, 'success');
      
      // Reset form
      setTo('');
      setSubject('');
      setBody('');
      alert('Message ingested by Floci SES sink.');
    } catch (err: any) {
      logActivity('SES', 'SendEmail failed', 'error', err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="SES / Email Sink" 
        icon={<Mail size={18} />}
        actions={<div className="text-[10px] font-mono opacity-50">SES_SINK_ENABLED</div>}
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-auto bg-brand-bg">
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold tracking-widest opacity-40">DISPATCH_MESSAGE</h3>
          <Card className="bg-white">
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold opacity-50 block mb-1">RECIPIENT_ADDRESS</label>
                <Input 
                  placeholder="user@example.com" 
                  value={to} 
                  onChange={e => setTo(e.target.value)} 
                  required
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold opacity-50 block mb-1">SUBJECT_LINE</label>
                <Input 
                  placeholder="System Notification" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  required
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold opacity-50 block mb-1">MESSAGE_BODY</label>
                <textarea 
                  className="w-full border border-brand-text p-3 text-xs font-mono min-h-[150px] focus:outline-none"
                  placeholder="Write your message here..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                icon={<Send size={14} />}
                disabled={loading}
              >
                {loading ? 'INGESTING...' : 'DISPATCH_TO_SINK'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-widest opacity-40">SINK_HISTORY</h3>
            <span className="text-[9px] font-mono opacity-30">{sentEmails.length} ITEMS</span>
          </div>
          
          <div className="space-y-3">
            {sentEmails.length === 0 ? (
              <Card className="py-20 text-center border-dashed bg-brand-muted/20">
                <p className="text-[10px] font-bold opacity-20 italic">NULL_HISTORY</p>
              </Card>
            ) : (
              sentEmails.map(email => (
                <Card key={email.id} noPadding className="border-brand-text/30 hover:border-brand-text transition-colors">
                  <div className="p-4 border-b border-brand-text/10 bg-brand-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span className="text-[10px] font-bold font-mono truncate max-w-[200px]">{email.subject}</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-40">{new Date(email.date).toLocaleTimeString()}</span>
                  </div>
                  <div className="p-4 text-[10px] font-mono opacity-70">
                    <p className="mb-1 uppercase opacity-40 font-bold text-[8px]">TO: {email.to}</p>
                    <p className="line-clamp-2 italic">"{email.body}"</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SESView;
