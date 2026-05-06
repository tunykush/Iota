export default function ChatPage() {
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-4 h-px bg-accent" />
        <span className="section-label text-[10px]">Chat workspace</span>
        <span className="text-muted text-[10px] font-mono">· N° 02</span>
      </div>
      <h1 className="text-2xl font-display font-medium tracking-tight mb-1">
        Ask your knowledge base<span className="text-accent">.</span>
      </h1>
      <p className="text-sm text-muted mb-6">Phase 2 will turn this into the full chat UI with citations.</p>

      <div className="image-frame max-w-3xl">
        <div className="chat-card">
          <div className="chat-head">
            <span className="dot" />
            <span>iota · retrieval session</span>
            <span className="src">
              <span>TOP 5</span>
              <span>14 SRC</span>
            </span>
          </div>
          <div className="chat-body">
            <div className="msg msg-bot">
              <div className="avatar">ι</div>
              <div className="bubble">
                Upload documents or select existing sources, then ask a question. Answers will include inline citations
                like <span className="cite">[1]</span> and source cards.
              </div>
            </div>
          </div>
          <div className="chat-input">
            <div className="field">Ask anything from your private knowledge base<span className="cur" /></div>
            <div className="send">↵</div>
          </div>
        </div>
      </div>
    </div>
  );
}