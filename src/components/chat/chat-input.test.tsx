// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChatInput } from "./chat-input";

afterEach(cleanup);

it("swaps only icon presentation while send and stop actions change immediately", () => {
  const onSend = vi.fn();
  const onStop = vi.fn();
  const { getByRole, rerender } = render(
    <ChatInput disabled={false} thinking={false} showDisclaimer={false} onSend={onSend} />,
  );
  const textarea = getByRole("textbox", { name: "Message the assistant" }) as HTMLTextAreaElement;
  const sendIcon = getByRole("button", { name: "Send message" }).querySelector(".ui-content-enter");
  expect(sendIcon).not.toBeNull();
  fireEvent.change(textarea, { target: { value: "Hello" } });
  fireEvent.click(getByRole("button", { name: "Send message" }));
  expect(onSend).toHaveBeenCalledWith("Hello");
  expect(textarea.value).toBe("");
  rerender(<ChatInput disabled thinking showDisclaimer onSend={onSend} onStop={onStop} />);
  const stop = getByRole("button", { name: "Stop generating" });
  expect(stop.querySelector(".ui-content-enter")).not.toBe(sendIcon);
  expect(getByRole("textbox", { name: "Message the assistant" })).toBe(textarea);
  expect(textarea.disabled).toBe(true);
  fireEvent.click(stop);
  expect(onStop).toHaveBeenCalledOnce();
  rerender(<ChatInput disabled={false} thinking={false} showDisclaimer onSend={onSend} />);
  expect(getByRole("textbox", { name: "Message the assistant" })).toBe(textarea);
  expect(textarea.disabled).toBe(false);
});
