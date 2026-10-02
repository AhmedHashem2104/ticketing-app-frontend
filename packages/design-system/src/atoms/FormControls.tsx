import type { ComponentProps } from "react";
import { z } from "zod";
import { Checkbox as UICheckbox } from "../components/ui/checkbox";
import { Input as UIInput } from "../components/ui/input";
import { Label as UILabel } from "../components/ui/label";
import { RadioGroup as UIRadioGroup, RadioGroupItem as UIRadioGroupItem } from "../components/ui/radio-group";
import { Slider as UISlider } from "../components/ui/slider";
import { Textarea as UITextarea } from "../components/ui/textarea";
import { markFieldControl } from "../lib/field-control";
import { validateProps, zClassName, zFn, zNode } from "../lib/props";
import { cn } from "../lib/utils";

/* ---------- Input ---------- */

export const inputPropsSchema = z.object({
  type: z.enum(["text", "email", "tel", "password", "search", "number", "date", "url"]).optional(),
  invalid: z.boolean().optional(),
  mono: z.boolean().optional(),
  className: zClassName,
});

export type InputProps = Omit<ComponentProps<"input">, "type"> & z.input<typeof inputPropsSchema>;

/** Atom · Input — text input; picks up id/ARIA wiring when rendered inside `<Field>`. */
export function Input(props: InputProps) {
  validateProps("Input", inputPropsSchema, props);
  const { invalid, mono, className, ...rest } = props;
  return <UIInput aria-invalid={invalid || rest["aria-invalid"] || undefined} className={cn(mono && "font-mono", className)} {...rest} />;
}

/* ---------- Textarea ---------- */

export const textareaPropsSchema = z.object({ invalid: z.boolean().optional(), className: zClassName });
export type TextareaProps = ComponentProps<"textarea"> & z.input<typeof textareaPropsSchema>;

/** Atom · Textarea */
export function Textarea(props: TextareaProps) {
  validateProps("Textarea", textareaPropsSchema, props);
  const { invalid, ...rest } = props;
  return <UITextarea aria-invalid={invalid || rest["aria-invalid"] || undefined} {...rest} />;
}

/* ---------- Label ---------- */

export const labelPropsSchema = z.object({ htmlFor: z.string().min(1).optional(), children: zNode, className: zClassName });
export type LabelProps = ComponentProps<typeof UILabel> & z.input<typeof labelPropsSchema>;

/** Atom · Label */
export function Label(props: LabelProps) {
  validateProps("Label", labelPropsSchema, props);
  const { className, ...rest } = props;
  return <UILabel className={cn("text-sm font-semibold text-ink", className)} {...rest} />;
}

/* ---------- Checkbox ---------- */

export const checkboxPropsSchema = z.object({
  checked: z.union([z.boolean(), z.literal("indeterminate")]).optional(),
  onCheckedChange: zFn<(checked: boolean) => void>().optional(),
  disabled: z.boolean().optional(),
  invalid: z.boolean().optional(),
  id: z.string().optional(),
  className: zClassName,
});

export type CheckboxProps = Omit<ComponentProps<typeof UICheckbox>, "onCheckedChange"> & z.input<typeof checkboxPropsSchema>;

/** Atom · Checkbox — controlled checkbox (Radix). */
export function Checkbox(props: CheckboxProps) {
  validateProps("Checkbox", checkboxPropsSchema, props);
  const { onCheckedChange, invalid, ...rest } = props;
  return (
    <UICheckbox
      aria-invalid={invalid || rest["aria-invalid"] || undefined}
      onCheckedChange={(value) => onCheckedChange?.(value === true)}
      {...rest}
    />
  );
}

/* ---------- Radio ---------- */

export const radioGroupPropsSchema = z.object({
  value: z.string().optional(),
  onValueChange: zFn<(value: string) => void>().optional(),
  "aria-label": z.string().min(1).optional(),
  "aria-labelledby": z.string().min(1).optional(),
  name: z.string().optional(),
  className: zClassName,
  children: zNode,
});

export type RadioGroupProps = ComponentProps<typeof UIRadioGroup> & z.input<typeof radioGroupPropsSchema>;

/** Atom · RadioGroup — controlled radio group (Radix, arrow-key navigation). */
export function RadioGroup(props: RadioGroupProps) {
  validateProps("RadioGroup", radioGroupPropsSchema, props);
  return <UIRadioGroup {...props} />;
}

export const radioItemPropsSchema = z.object({ value: z.string().min(1), id: z.string().optional(), disabled: z.boolean().optional() });
export type RadioItemProps = ComponentProps<typeof UIRadioGroupItem> & z.input<typeof radioItemPropsSchema>;

/** Atom · RadioItem */
export function RadioItem(props: RadioItemProps) {
  validateProps("RadioItem", radioItemPropsSchema, props);
  return <UIRadioGroupItem {...props} />;
}

/* ---------- NativeSelect ---------- */

export const nativeSelectPropsSchema = z.object({
  options: z.array(z.object({ value: z.string(), label: z.string().min(1), disabled: z.boolean().optional() })).min(1),
  value: z.string().optional(),
  invalid: z.boolean().optional(),
  className: zClassName,
});

export type NativeSelectProps = Omit<ComponentProps<"select">, "children"> & z.input<typeof nativeSelectPropsSchema>;

/** Atom · NativeSelect — the platform select (best mobile + screen reader support). */
export function NativeSelect(props: NativeSelectProps) {
  validateProps("NativeSelect", nativeSelectPropsSchema, props);
  const { options, invalid, className, ...rest } = props;
  return (
    <select
      aria-invalid={invalid || rest["aria-invalid"] || undefined}
      className={cn(
        "h-12 w-full rounded-lg border border-input bg-white px-3 text-[15px] text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-2 aria-invalid:border-destructive",
        className,
      )}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/* ---------- Slider ---------- */

export const sliderPropsSchema = z
  .object({
    value: z.number(),
    onValueChange: zFn<(value: number) => void>(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive().optional(),
    "aria-label": z.string().min(1).optional(),
    "aria-labelledby": z.string().min(1).optional(),
    "aria-valuetext": z.string().optional(),
    id: z.string().optional(),
    className: zClassName,
  })
  .refine((p) => p.max > p.min, { error: "max must be greater than min", path: ["max"] })
  .refine((p) => p.value >= p.min && p.value <= p.max, { error: "value must be between min and max", path: ["value"] })
  .refine((p) => !!p["aria-label"] || !!p["aria-labelledby"], { error: "Sliders need an accessible name", path: ["aria-label"] });

export type SliderProps = z.input<typeof sliderPropsSchema>;

/** Atom · Slider — single-value controlled slider (Radix). */
export function Slider(props: SliderProps) {
  validateProps("Slider", sliderPropsSchema, props);
  const { value, onValueChange, "aria-label": ariaLabel, "aria-labelledby": labelledBy, "aria-valuetext": valueText, id, ...rest } = props;
  return (
    <UISlider
      value={[value]}
      onValueChange={(values) => onValueChange(values[0] ?? value)}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      thumbProps={{ id, "aria-label": ariaLabel, "aria-labelledby": labelledBy, "aria-valuetext": valueText }}
      {...rest}
    />
  );
}

markFieldControl(Input);
markFieldControl(Textarea);
markFieldControl(Checkbox);
markFieldControl(NativeSelect);
