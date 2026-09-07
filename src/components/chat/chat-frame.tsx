import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

type ChatFrameProps = Omit<ComponentPropsWithoutRef<"section">, "className" | "style"> & {
  header: ReactNode;
  footer: ReactNode;
  scrollRef?: Ref<HTMLDivElement>;
  messagesBusy?: boolean;
};

/** Shares the conversation header, scroll well, and footer geometry across loaded and pending routes. */
export function ChatFrame({ header, footer, children, scrollRef, messagesBusy, ...props }: ChatFrameProps) {
  return (
    <section
      data-chat-frame
      className="neu-panel bg-surface flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl"
      {...props}
    >
      <header className="flex h-15 min-w-0 shrink-0 items-center justify-between pr-4 pl-16 lg:pl-4">{header}</header>
      <div
        ref={scrollRef}
        aria-busy={messagesBusy}
        className="chat-message-well min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6"
      >
        {children}
      </div>
      {footer}
    </section>
  );
}

/** Keeps composer padding, safe-area space, and the caption row stable across input states. */
export function ChatComposerFrame({
  children,
  caption,
  trailing,
}: {
  children: ReactNode;
  caption?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      data-chat-composer-footer
      className="shrink-0 bg-transparent px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
    >
      {children}
      <div data-chat-composer-caption className="mt-2 flex min-h-4 items-center justify-between px-1">
        <p className="text-muted flex-1 text-center text-xs">{caption}</p>
        {trailing}
      </div>
    </div>
  );
}
