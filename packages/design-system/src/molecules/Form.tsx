import { Minus, Plus, Search } from "lucide-react";
import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { z } from "zod";
import { Checkbox, RadioItem } from "../atoms/FormControls";
import { FieldContext, type FieldControlProps } from "../lib/field-context";
import { validateProps, zClassName, zFn, zNode } from "../lib/props";
import { cn } from "../lib/utils";

/* ---------- Field ---------- */

export const fieldPropsSchema = z.object({
  label: zNode,
  children: zNode,
  hint: zNode.optional(),
  error: z.string().optional(),
  required: z.boolean().optional(),
  optionalLabel: z.string().optional(),
  id: z.string().optional(),
  labelSize: z.enum(["sm", "md"]).optional(),
  className: zClassName,
});

export type FieldProps = z.input<typeof fieldPropsSchema>;

/**
 * Molecule · Field — label + control + hint + error.
 * The nested control receives its id, `aria-describedby` and `aria-invalid` automatically.
 */
export function Field(props: FieldProps) {
  validateProps("Field", fieldPropsSchema, props);
  const { label, children, hint, error, required, optionalLabel, id: idProp, labelSize = "sm", className } = props;
  const autoId = useId();
  const id = idProp ?? `field-${autoId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control: FieldControlProps = {
    id,
    ...(hintId || errorId ? { "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") } : {}),
    ...(error ? { "aria-invalid": true as const } : {}),
    ...(required ? { "aria-required": true as const } : {}),
  };
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("font-semibold text-ink", labelSize === "sm" ? "text-sm" : "text-[15px]")}>
        {label}
        {optionalLabel ? <span className="font-normal text-muted-ink"> {optionalLabel}</span> : null}
      </label>
      <FieldContext.Provider value={control}>{children}</FieldContext.Provider>
      {hint ? (
        <span id={hintId} className="text-[13px] text-muted-ink">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="text-[13px] font-medium text-rose-ink">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/* ---------- CheckboxField ---------- */

export const checkboxFieldPropsSchema = z.object({
  label: zNode,
  checked: z.boolean(),
  onCheckedChange: zFn<(checked: boolean) => void>(),
  description: zNode.optional(),
  error: z.string().optional(),
  disabled: z.boolean().optional(),
  tone: z.enum(["plain", "warning"]).optional(),
  id: z.string().optional(),
  className: zClassName,
});

export type CheckboxFieldProps = z.input<typeof checkboxFieldPropsSchema>;

/** Molecule · CheckboxField — checkbox with an inline clickable label and error. */
export function CheckboxField(props: CheckboxFieldProps) {
  validateProps("CheckboxField", checkboxFieldPropsSchema, props);
  const { label, checked, onCheckedChange, description, error, disabled, tone = "plain", id: idProp, className } = props;
  const autoId = useId();
  const id = idProp ?? `check-${autoId}`;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className={cn(
          "flex items-start gap-2.5 text-sm leading-snug",
          tone === "warning" && "rounded-[10px] bg-amber-soft px-4 py-3.5 text-amber-ink",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          invalid={!!error}
          aria-describedby={errorId}
          className="mt-0.5"
        />
        <label htmlFor={id} className="cursor-pointer">
          {label}
          {description ? <span className="block text-[13px] text-muted-ink">{description}</span> : null}
        </label>
      </div>
      {error ? (
        <span id={errorId} role="alert" className="text-[13px] font-medium text-rose-ink">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/* ---------- SearchField ---------- */

export const searchFieldPropsSchema = z.object({
  label: z.string().min(1),
  value: z.string(),
  onValueChange: zFn<(value: string) => void>(),
  placeholder: z.string().optional(),
  className: zClassName,
});

export type SearchFieldProps = z.input<typeof searchFieldPropsSchema>;

/** Molecule · SearchField — search input with icon and a visually hidden label. */
export function SearchField(props: SearchFieldProps) {
  validateProps("SearchField", searchFieldPropsSchema, props);
  const { label, value, onValueChange, placeholder, className } = props;
  const id = useId();
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-2.5 rounded-lg border border-line bg-white px-3.5 focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      <Search className="size-[18px] text-muted-ink" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-ink"
      />
    </div>
  );
}

/* ---------- OptionCard ---------- */

export const optionCardPropsSchema = z.object({
  value: z.string().min(1),
  title: zNode,
  description: zNode.optional(),
  tag: z.string().optional(),
  tagTone: z.enum(["neutral", "success"]).optional(),
  selected: z.boolean(),
  children: zNode.optional(),
  size: z.enum(["md", "lg"]).optional(),
  className: zClassName,
});

export type OptionCardProps = z.input<typeof optionCardPropsSchema>;

/**
 * Molecule · OptionCard — a bordered radio choice (payment, payout, refund method).
 * Must be rendered inside `<RadioGroup>`; `children` show only while selected.
 */
export function OptionCard(props: OptionCardProps) {
  validateProps("OptionCard", optionCardPropsSchema, props);
  const { value, title, description, tag, tagTone = "neutral", selected, children, size = "md", className } = props;
  const id = useId();
  return (
    <div className={cn("rounded-xl border bg-white", selected ? "border-2 border-pitch" : "border-line", className)}>
      <label
        htmlFor={id}
        className={cn("flex cursor-pointer items-center gap-3.5 px-4", size === "lg" ? "min-h-16 py-2.5" : "min-h-14 py-2")}
      >
        <RadioItem value={value} id={id} />
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{title}</span>
          {description ? <span className="text-[13px] text-muted-ink">{description}</span> : null}
        </span>
        {tag ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              tagTone === "success" ? "bg-mint text-pitch" : "bg-sand text-sub",
            )}
          >
            {tag}
          </span>
        ) : null}
      </label>
      {selected && children ? <div className="px-4 pb-4 sm:pl-[50px]">{children}</div> : null}
    </div>
  );
}

/* ---------- OtpInput ---------- */

export const otpInputPropsSchema = z.object({
  value: z.string().regex(/^\d*$/, { error: "OTP value must be digits" }),
  onValueChange: zFn<(value: string) => void>(),
  length: z.number().int().min(4).max(8).optional(),
  invalid: z.boolean().optional(),
  label: z.string().min(1).optional(),
  autoFocus: z.boolean().optional(),
  className: zClassName,
});

export type OtpInputProps = z.input<typeof otpInputPropsSchema>;

/** Molecule · OtpInput — one box per digit with auto-advance, backspace and paste support. */
export function OtpInput(props: OtpInputProps) {
  validateProps("OtpInput", otpInputPropsSchema, props);
  const { value, onValueChange, length = 6, invalid, label = "Verification code", autoFocus, className } = props;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onValueChange(next.join("").slice(0, length));
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigit(index - 1, "");
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onValueChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <fieldset className={cn("m-0 border-0 p-0", className)}>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {digits.map((digit, index) => (
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus -- first box focuses when the step opens
            autoFocus={autoFocus && index === 0}
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={invalid || undefined}
            value={digit}
            onPaste={onPaste}
            onKeyDown={onKeyDown(index)}
            onChange={(event) => {
              const char = event.target.value.replace(/\D/g, "").slice(-1);
              setDigit(index, char);
              if (char && index < length - 1) refs.current[index + 1]?.focus();
            }}
            className={cn(
              "h-[60px] min-w-0 rounded-lg bg-white text-center font-mono text-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              digit ? "border-2 border-pitch" : "border border-line",
              invalid && "border-2 border-rose-ink",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- QuantityStepper ---------- */

export const quantityStepperPropsSchema = z
  .object({
    value: z.number().int().min(0),
    onValueChange: zFn<(value: number) => void>(),
    itemLabel: z.string().min(1),
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
    className: zClassName,
  })
  .refine((p) => p.max === undefined || p.value <= p.max, { error: "value exceeds max", path: ["value"] });

export type QuantityStepperProps = z.input<typeof quantityStepperPropsSchema>;

/** Molecule · QuantityStepper — − / count / + with live count announcement. */
export function QuantityStepper(props: QuantityStepperProps) {
  validateProps("QuantityStepper", quantityStepperPropsSchema, props);
  const { value, onValueChange, itemLabel, min = 0, max, className } = props;
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;
  const button = "flex size-11 items-center justify-center rounded-lg border border-line bg-paper text-xl disabled:opacity-40";
  return (
    <div role="group" aria-label={`${itemLabel} quantity`} className={cn("flex items-center gap-0.5", className)}>
      <button
        type="button"
        className={button}
        aria-label={`One less ${itemLabel}`}
        disabled={atMin}
        onClick={() => onValueChange(value - 1)}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="w-7 text-center font-mono text-[17px]">
        {value}
      </output>
      <button
        type="button"
        className={button}
        aria-label={`One more ${itemLabel}`}
        disabled={atMax}
        onClick={() => onValueChange(value + 1)}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
