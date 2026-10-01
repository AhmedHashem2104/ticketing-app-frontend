import { formatClock, queueStatusSchema } from "@repo/contracts";
import { Check, Info } from "lucide-react";
import { z } from "zod";
import { LinkButton } from "../atoms/Button";
import { ProgressBar } from "../atoms/Feedback";
import { Heading } from "../atoms/Typography";
import { CheckboxField } from "../molecules/Form";
import { StatTile } from "../molecules/Content";
import { validateProps, zClassName, zFn, zHref } from "../lib/props";
import { cn } from "../lib/utils";

export const waitingRoomPanelPropsSchema = z.object({
  status: queueStatusSchema,
  chooseHref: zHref,
  maskedPhone: z.string().min(1),
  onSmsChange: zFn<(optIn: boolean) => void>(),
  readyNote: z.string().optional(),
  className: zClassName,
});

export type WaitingRoomPanelProps = z.input<typeof waitingRoomPanelPropsSchema>;

/** Organism · WaitingRoomPanel — the three waiting-room phases with live updates. */
export function WaitingRoomPanel(props: WaitingRoomPanelProps) {
  validateProps("WaitingRoomPanel", waitingRoomPanelPropsSchema, props);
  const { status, chooseHref, maskedPhone, onSmsChange, readyNote, className } = props;
  return (
    <section
      aria-live="polite"
      aria-label="Your place in the queue"
      className={cn("flex flex-col gap-[22px] rounded-2xl bg-white p-6 sm:p-9", className)}
    >
      {status.phase === "waiting" ? (
        <div className="flex flex-col items-center gap-3.5 text-center">
          <Heading size="xl">You&apos;re in. Sale opens soon.</Heading>
          <div
            className="font-display text-[72px] leading-none font-extrabold text-pitch sm:text-[88px]"
            aria-label={`Opens in ${status.opensInSeconds} seconds`}
          >
            {formatClock(status.opensInSeconds)}
          </div>
          <p className="max-w-[460px] text-base leading-normal text-sub">
            When the sale opens, everyone here gets a random place in line. There&apos;s no advantage to refreshing.
          </p>
        </div>
      ) : status.phase === "in_line" ? (
        <div className="flex flex-col gap-[18px]">
          <Heading size="xl">You&apos;re in line</Heading>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="People ahead of you" value={status.ahead.toLocaleString("en-US")} />
            <StatTile label="Estimated wait" value={`~${status.etaMinutes} min`} />
          </div>
          <ProgressBar value={status.progress} label="Progress in line" />
          <CheckboxField
            label={`Text me at ${maskedPhone} when it's my turn`}
            checked={status.smsOptIn}
            onCheckedChange={onSmsChange}
            className="min-h-11 justify-center"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-mint" aria-hidden="true">
            <Check className="size-9 text-pitch" strokeWidth={2.5} />
          </span>
          <Heading size="2xl">It&apos;s your turn</Heading>
          <p className="text-base leading-normal text-sub">You have {status.turnWindowMinutes} minutes to choose your zone and pay.</p>
          <LinkButton href={chooseHref} variant="primary" size="2xl">
            Choose tickets
          </LinkButton>
        </div>
      )}
      <div className="flex flex-col gap-2 border-t border-line pt-[18px] text-sm text-sub">
        <p className="flex gap-2.5">
          <Info className="size-[18px] shrink-0 text-pitch" aria-hidden="true" />
          Keep this tab open. Opening another tab or device moves you to the back.
        </p>
        {readyNote ? (
          <p className="flex gap-2.5">
            <Check className="size-[18px] shrink-0 text-pitch" aria-hidden="true" />
            {readyNote}
          </p>
        ) : null}
      </div>
    </section>
  );
}
