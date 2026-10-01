"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, RefreshCw, Send, Users } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type Conversation = {
  id: number;
  otherMembers: { id: number; name: string; avatarUrl: string | null }[];
  latestMessage: { body: string; createdAt: string; sender: { name: string } } | null;
};
type Message = { id: number; body: string; createdAt: string; sender: { id: number; name: string; avatarUrl: string | null } };

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = async () => {
    const [response, sessionResponse] = await Promise.all([fetch("/api/conversations"), fetch("/api/auth/session")]);
    const [data, sessionData] = await Promise.all([response.json(), sessionResponse.json()]);
    if (!response.ok) { setError(data.error || "Could not load messages."); setLoading(false); return; }
    setUserId(sessionData.user?.id || null);
    setConversations(data.conversations);
    setSelectedId((current) => current || data.conversations[0]?.id || null);
    setLoading(false);
  };

  const loadMessages = async (conversationId: number) => {
    const response = await fetch(`/api/conversations/${conversationId}/messages`);
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not load this conversation."); return; }
    setMessages(data.messages);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadConversations(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    const initialTimer = window.setTimeout(() => { void loadMessages(selectedId); }, 0);
    const interval = window.setInterval(() => { void loadMessages(selectedId); }, 6000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [selectedId]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;
    const response = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not send message."); return; }
    setMessages((current) => [...current, data.message]);
    setMessage("");
    void loadConversations();
  };

  const filtered = conversations.filter((conversation) =>
    conversation.otherMembers.some((member) => member.name.toLowerCase().includes(query.toLowerCase()))
  );
  const selected = conversations.find((conversation) => conversation.id === selectedId);

  return (
    <SiteShell>
      <section className="page-hero">
        <p className="eyebrow">Your conversations</p>
        <h1>Good work needs good communication.</h1>
        <p className="page-copy">Messages are saved to your account and refresh automatically while a conversation is open.</p>
      </section>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status">Loading conversations...</div> : conversations.length === 0 ? (
        <section className="empty-state">
          <MessageCircle size={24} />
          <h2>Your inbox is ready</h2>
          <p>Connect with a student or join a shared team to start a conversation.</p>
          <div className="form-actions"><Link className="button button-primary" href="/discover">Find collaborators</Link><Link className="button button-secondary" href="/teams">My teams</Link></div>
        </section>
      ) : (
        <section className="inbox-layout">
          <aside className="inbox-sidebar">
            <label className="search-with-icon"><MessageCircle size={15} /><input className="search-input" aria-label="Search conversations" placeholder="Find a conversation" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className="conversation-list">
              {filtered.map((conversation) => {
                const peer = conversation.otherMembers[0];
                return <button className={selectedId === conversation.id ? "conversation-item active" : "conversation-item"} type="button" key={conversation.id} onClick={() => { setMessages([]); setSelectedId(conversation.id); }}>
                  <span className="avatar">{peer?.name.slice(0, 1) || "?"}</span>
                  <span><strong>{peer?.name || "Conversation"}</strong><small>{conversation.latestMessage?.body || "Start a conversation"}</small></span>
                </button>;
              })}
            </div>
          </aside>
          <section className="inbox-thread">
            <header className="inbox-thread-head"><div><span className="avatar">{selected?.otherMembers[0]?.name.slice(0, 1) || "?"}</span><div><strong>{selected?.otherMembers[0]?.name || "Select a conversation"}</strong><small><Users size={13} /> Connected students</small></div></div><button className="icon-button" type="button" onClick={() => selectedId && void loadMessages(selectedId)} aria-label="Refresh messages" title="Refresh messages"><RefreshCw size={16} /></button></header>
            <div className="thread-history" aria-live="polite">
              {messages.length === 0 ? <div className="empty-state"><MessageCircle size={22} /><h3>Say hello</h3><p>Start with a question, an idea, or a useful next step.</p></div> : messages.map((entry) => <article className={entry.sender.id === userId ? "thread-message thread-message-own" : "thread-message"} key={entry.id}><strong>{entry.sender.name}</strong><p>{entry.body}</p><small>{new Date(entry.createdAt).toLocaleString()}</small></article>)}
            </div>
            <form className="chat-composer" onSubmit={sendMessage}><input className="search-input" aria-label="Write a message" placeholder="Write a message" maxLength={2000} required value={message} onChange={(event) => setMessage(event.target.value)} /><button className="button button-primary" type="submit" disabled={!selectedId}><Send size={15} /> Send</button></form>
            <p className="inbox-refresh-note">Messages refresh every 6 seconds while open.</p>
          </section>
        </section>
      )}
    </SiteShell>
  );
}