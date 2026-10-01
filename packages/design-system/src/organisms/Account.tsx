import { zodResolver } from "@hookform/resolvers/zod";
import {
  documentTypeSchema,
  fanIdExtractedSchema,
  fanIdScanRequestSchema,
  fanIdSubmitRequestSchema,
  loginRequestSchema,
  otpCodeSchema,
  signUpRequestSchema,
  type DocumentType,
  type LoginRequest,
  type SignUpRequest,
} from "@repo/contracts";
import { Camera, Check } from "lucide-react";
import { useEffect, useId, useState, type ChangeEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { Button, LinkButton } from "../atoms/Button";
import { Input, RadioGroup } from "../atoms/FormControls";
import { Logo } from "../atoms/Identity";
import { Eyebrow, Heading } from "../atoms/Typography";
import { Notice } from "../molecules/Content";
import { CheckboxField, Field, OptionCard, OtpInput } from "../molecules/Form";
import { StepProgress } from "../molecules/Navigation";
import { useCountdown } from "../lib/hooks";
import { validateProps, zClassName, zDateString, zFn, zHref } from "../lib/props";
import { cn } from "../lib/utils";

const fieldErrorsSchema = z.record(z.string(), z.string()).optional();

/** Applies server-side field errors (from the API's validation details) to a form. */
function useServerFieldErrors<T extends Record<string, unknown>>(
  form: ReturnType<typeof useForm<T, unknown, unknown>>,
  errors?: Record<string, string>,
) {
  useEffect(() => {
    if (!errors) return;
    for (const [name, message] of Object.entries(errors)) form.setError(name as never, { type: "server", message });
  }, [errors, form]);
}

/* ---------- BrandPanel ---------- */

export const brandPanelPropsSchema = z.object({
  title: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
  homeHref: zHref.optional(),
  className: zClassName,
});

export type BrandPanelProps = z.input<typeof brandPanelPropsSchema>;

/** Organism · BrandPanel — green value-proposition panel beside auth forms. */
export function BrandPanel(props: BrandPanelProps) {
  validateProps("BrandPanel", brandPanelPropsSchema, props);
  const { title, bullets, homeHref = "/", className } = props;
  return (
    <section aria-label="Why Matchpass" className={cn("flex flex-col gap-9 bg-pitch px-6 py-10 text-white sm:px-14 sm:py-12", className)}>
      <AppLink href={homeHref} aria-label="Matchpass home" className="self-start hover:no-underline">
        <Logo tone="gold" size="lg" className="text-white" />
      </AppLink>
      <p className="max-w-[520px] font-display text-[48px] leading-[0.95] font-extrabold uppercase sm:text-[72px]">{title}</p>
      <ul className="m-0 flex max-w-[460px] list-none flex-col gap-4 p-0 text-[17px] text-mint">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3">
            <Check className="size-[22px] shrink-0 text-gold" aria-hidden="true" />
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- SignUpForm ---------- */

export const signUpFormPropsSchema = z.object({
  onSubmit: zFn<(values: z.output<typeof signUpRequestSchema>) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  fieldErrors: fieldErrorsSchema,
  loginHref: zHref,
  className: zClassName,
});

export type SignUpFormProps = z.input<typeof signUpFormPropsSchema>;

/** Organism · SignUpForm — create an account, validated with the shared sign-up schema. */
export function SignUpForm(props: SignUpFormProps) {
  validateProps("SignUpForm", signUpFormPropsSchema, props);
  const { onSubmit, submitting, serverError, fieldErrors, loginHref, className } = props;
  const form = useForm<SignUpRequest, unknown, z.output<typeof signUpRequestSchema>>({
    resolver: zodResolver(signUpRequestSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "", marketing: false },
    mode: "onTouched",
  });
  useServerFieldErrors(form as never, fieldErrors);
  const e = form.formState.errors;
  return (
    <form
      noValidate
      aria-labelledby="signup-title"
      onSubmit={form.handleSubmit((v) => onSubmit(v))}
      className={cn("flex flex-col gap-[18px]", className)}
    >
      <div className="flex flex-col gap-1.5">
        <Heading as="h1" id="signup-title" size="2xl">
          Create your account
        </Heading>
        <span className="text-[15px] text-sub">
          Already have one?{" "}
          <AppLink href={loginHref} tone="pitch" underline>
            Log in
          </AppLink>
        </span>
      </div>
      <Field label="Full name (as on your ID)" error={e.fullName?.message} required>
        <Input autoComplete="name" className="h-12" {...form.register("fullName")} />
      </Field>
      <Field label="Mobile number" error={e.phone?.message} required>
        <div className="flex gap-2">
          <span className="flex h-12 items-center rounded-lg border border-line bg-sand px-3.5 font-mono" aria-hidden="true">
            +20
          </span>
          <Input
            type="tel"
            mono
            autoComplete="tel-national"
            inputMode="tel"
            placeholder="10 0000 0000"
            className="h-12 flex-1"
            {...form.register("phone")}
          />
        </div>
      </Field>
      <Field label="Email" optionalLabel="(optional, for receipts)" error={e.email?.message}>
        <Input type="email" autoComplete="email" className="h-12" {...form.register("email")} />
      </Field>
      <Field label="Password" hint="At least 8 characters" error={e.password?.message} required>
        <Input type="password" autoComplete="new-password" className="h-12" {...form.register("password")} />
      </Field>
      <Controller
        control={form.control}
        name="acceptTerms"
        render={({ field }) => (
          <CheckboxField
            label="I agree to the terms of use and privacy policy"
            checked={field.value === true}
            onCheckedChange={(on) => field.onChange(on ? true : undefined)}
            error={e.acceptTerms?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="marketing"
        render={({ field }) => (
          <CheckboxField label="Send me news and offers (optional)" checked={!!field.value} onCheckedChange={field.onChange} />
        )}
      />
      {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText="Sending code…">
        Send verification code
      </Button>
    </form>
  );
}

/* ---------- OtpForm ---------- */

export const otpFormPropsSchema = z.object({
  maskedPhone: z.string().min(1),
  resendAvailableAt: zDateString,
  onSubmit: zFn<(code: string) => Promise<void> | void>(),
  onResend: zFn<() => void>(),
  onChangeNumber: zFn<() => void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  note: z.string().optional(),
  className: zClassName,
});

export type OtpFormProps = z.input<typeof otpFormPropsSchema>;

const otpSchema = z.object({ code: otpCodeSchema });

/** Organism · OtpForm — enter the 6-digit SMS code. */
export function OtpForm(props: OtpFormProps) {
  validateProps("OtpForm", otpFormPropsSchema, props);
  const { maskedPhone, resendAvailableAt, onSubmit, onResend, onChangeNumber, submitting, serverError, note, className } = props;
  const form = useForm<z.input<typeof otpSchema>>({ resolver: zodResolver(otpSchema), defaultValues: { code: "" } });
  const resendIn = useCountdown(resendAvailableAt);
  const error = form.formState.errors.code?.message;
  return (
    <form
      noValidate
      aria-labelledby="otp-title"
      onSubmit={form.handleSubmit((v) => onSubmit(v.code))}
      className={cn("flex flex-col gap-[18px]", className)}
    >
      <div className="flex flex-col gap-1.5">
        <Heading as="h1" id="otp-title" size="2xl">
          Enter the code
        </Heading>
        <span className="text-[15px] text-sub">
          We sent a 6-digit code to <span className="font-mono text-ink">{maskedPhone}</span>
        </span>
      </div>
      <Controller
        control={form.control}
        name="code"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the OTP step replaces the details form; moving focus to the first digit keeps keyboard and screen-reader users oriented
        render={({ field }) => <OtpInput value={field.value} onValueChange={field.onChange} invalid={!!error} autoFocus />}
      />
      {error ? (
        <span role="alert" className="text-[13px] text-rose-ink">
          {error}
        </span>
      ) : null}
      <div className="flex items-center justify-between text-sm text-muted-ink">
        {resendIn > 0 ? (
          <span aria-live="off">Resend code in 0:{String(resendIn).padStart(2, "0")}</span>
        ) : (
          <Button variant="link" size="sm" onClick={onResend}>
            Resend code
          </Button>
        )}
        <Button variant="link" size="sm" onClick={onChangeNumber} className="min-h-11">
          Change number
        </Button>
      </div>
      {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText="Verifying…">
        Verify and continue
      </Button>
      {note ? <p className="text-[13px] leading-normal text-muted-ink">{note}</p> : null}
    </form>
  );
}

/* ---------- LoginForm ---------- */

export const loginFormPropsSchema = z.object({
  onSubmit: zFn<(values: z.output<typeof loginRequestSchema>) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  signUpHref: zHref,
  className: zClassName,
});

export type LoginFormProps = z.input<typeof loginFormPropsSchema>;

/** Organism · LoginForm */
export function LoginForm(props: LoginFormProps) {
  validateProps("LoginForm", loginFormPropsSchema, props);
  const { onSubmit, submitting, serverError, signUpHref, className } = props;
  const form = useForm<LoginRequest, unknown, z.output<typeof loginRequestSchema>>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { phone: "", password: "" },
  });
  const e = form.formState.errors;
  return (
    <form
      noValidate
      aria-labelledby="login-title"
      onSubmit={form.handleSubmit((v) => onSubmit(v))}
      className={cn("flex flex-col gap-[18px]", className)}
    >
      <div className="flex flex-col gap-1.5">
        <Heading as="h1" id="login-title" size="2xl">
          Log in
        </Heading>
        <span className="text-[15px] text-sub">
          New to Matchpass?{" "}
          <AppLink href={signUpHref} tone="pitch" underline>
            Create an account
          </AppLink>
        </span>
      </div>
      <Field label="Mobile number" error={e.phone?.message} required>
        <div className="flex gap-2">
          <span className="flex h-12 items-center rounded-lg border border-line bg-sand px-3.5 font-mono" aria-hidden="true">
            +20
          </span>
          <Input
            type="tel"
            mono
            autoComplete="tel-national"
            inputMode="tel"
            placeholder="10 0000 0000"
            className="h-12 flex-1"
            {...form.register("phone")}
          />
        </div>
      </Field>
      <Field label="Password" error={e.password?.message} required>
        <Input type="password" autoComplete="current-password" className="h-12" {...form.register("password")} />
      </Field>
      {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText="Logging in…">
        Log in
      </Button>
    </form>
  );
}

/* ---------- FanIdCard ---------- */

export const fanIdCardPropsSchema = z.object({
  name: z.string().min(1),
  number: z.string().min(1),
  validUntil: z.string().min(1),
  className: zClassName,
});

export type FanIdCardProps = z.input<typeof fanIdCardPropsSchema>;

/** Organism · FanIdCard — the digital Fan ID. */
export function FanIdCard(props: FanIdCardProps) {
  validateProps("FanIdCard", fanIdCardPropsSchema, props);
  const { name, number, validUntil, className } = props;
  return (
    <section
      aria-label="Your Fan ID"
      className={cn("flex w-full max-w-[440px] flex-col gap-[18px] rounded-[18px] bg-pitch p-6 text-white", className)}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-[22px] font-extrabold tracking-[0.08em]">MATCHPASS FAN ID</span>
        <Logo wordmark="none" tone="gold" />
      </div>
      <div className="flex items-center gap-[18px]">
        <div
          role="img"
          aria-label="Fan photo placeholder"
          className="flex h-[108px] w-[88px] shrink-0 items-center justify-center rounded-[10px] bg-mint text-[13px] font-semibold text-pitch"
        >
          [PHOTO]
        </div>
        <dl className="m-0 flex flex-col gap-1.5">
          <dt className="sr-only">Name</dt>
          <dd className="m-0 font-display text-[30px] leading-none font-extrabold uppercase">{name}</dd>
          <dt className="sr-only">Fan ID number</dt>
          <dd className="m-0 font-mono text-[15px] text-gold">{number}</dd>
          <dt className="sr-only">Validity</dt>
          <dd className="m-0 text-[13px] text-mint">Valid until {validUntil}</dd>
        </dl>
      </div>
    </section>
  );
}

/* ---------- FanIdWizard ---------- */

const FAN_STEPS = ["Document", "ID photos", "Selfie", "Review", "Done"];
const FAN_TITLES = ["Get your Fan ID", "Scan your document", "Confirm it’s you", "Almost done", "Your Fan ID is ready"];

export const fanIdWizardPropsSchema = z.object({
  step: z.number().int().min(1).max(5),
  onStepChange: zFn<(step: number) => void>(),
  onScan: zFn<(values: z.infer<typeof fanIdScanRequestSchema>) => Promise<void> | void>(),
  extracted: fanIdExtractedSchema.optional(),
  onSubmit: zFn<(values: z.infer<typeof fanIdSubmitRequestSchema>) => Promise<void> | void>(),
  approved: z.object({ name: z.string().min(1), number: z.string().min(1), validUntil: z.string().min(1) }).optional(),
  pending: z.boolean().optional(),
  serverError: z.string().optional(),
  browseHref: zHref,
  skipHref: zHref,
  linkFansHref: zHref.optional(),
  className: zClassName,
});

export type FanIdWizardProps = z.input<typeof fanIdWizardPropsSchema>;

function CaptureTile({
  label,
  captured,
  onCapture,
  capture,
}: {
  label: string;
  captured: boolean;
  onCapture: (captured: boolean) => void;
  capture: "user" | "environment";
}) {
  const id = useId();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => onCapture(!!event.target.files?.length);
  return (
    <div
      className={cn(
        "flex h-[200px] flex-col items-center justify-center gap-2.5 rounded-xl text-center",
        captured ? "border-2 border-pitch bg-mint text-pitch" : "border-2 border-dashed border-stone bg-paper",
      )}
    >
      {captured ? (
        <Check className="size-9" strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <Camera className="size-9 text-sub" aria-hidden="true" />
      )}
      <span className="font-semibold" id={`${id}-status`}>
        {captured ? `${label} added` : label}
      </span>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={capture}
        className="peer sr-only"
        onChange={onChange}
        aria-describedby={`${id}-status`}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex h-11 cursor-pointer items-center rounded-lg px-4 text-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-gold",
          captured ? "font-semibold text-pitch underline" : "border border-ink bg-white",
        )}
      >
        {captured ? `Retake ${label.toLowerCase()}` : capture === "user" ? "Take selfie" : `Take photo or upload · ${label.toLowerCase()}`}
      </label>
    </div>
  );
}

/** Organism · FanIdWizard — document, photos, selfie, review and approval. */
export function FanIdWizard(props: FanIdWizardProps) {
  validateProps("FanIdWizard", fanIdWizardPropsSchema, props);
  const { step, onStepChange, onScan, extracted, onSubmit, approved, pending, serverError, browseHref, skipHref, linkFansHref, className } =
    props;
  const [documentType, setDocumentType] = useState<DocumentType>("national_id");
  const [captured, setCaptured] = useState({ front: false, back: false, selfie: false });
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string>();
  const docName = documentType === "national_id" ? "national ID" : "passport";

  const next = async () => {
    setMessage(undefined);
    if (step === 1) return onStepChange(2);
    if (step === 2) {
      const scan = fanIdScanRequestSchema.safeParse({ documentType, frontCaptured: captured.front, backCaptured: captured.back });
      if (!scan.success) return setMessage(scan.error.issues[0]?.message);
      return onScan(scan.data);
    }
    if (step === 3) {
      if (!captured.selfie) return setMessage("Take a selfie to continue");
      return onStepChange(4);
    }
    if (step === 4) {
      const submit = fanIdSubmitRequestSchema.safeParse({
        scanId: extracted?.scanId,
        selfieCaptured: captured.selfie,
        confirmDetails: confirmed,
      });
      if (!submit.success) return setMessage(submit.error.issues[0]?.message);
      return onSubmit(submit.data);
    }
  };

  const nextLabel = step === 4 ? "Submit for verification" : "Continue";

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <Eyebrow tone="pitch">Fan ID · Needed for football matches</Eyebrow>
        <Heading as="h1" size="3xl">
          {FAN_TITLES[step - 1]}
        </Heading>
      </div>
      <StepProgress steps={FAN_STEPS} current={step} />
      <section aria-label={FAN_TITLES[step - 1]} className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
        {step === 1 ? (
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="pb-3 text-lg font-semibold">Which document will you use?</legend>
            <RadioGroup
              aria-label="Document"
              value={documentType}
              onValueChange={(v) => setDocumentType(documentTypeSchema.parse(v))}
              className="gap-3"
            >
              <OptionCard
                value="national_id"
                title="Egyptian national ID"
                description="Front and back of the card"
                selected={documentType === "national_id"}
                size="lg"
              />
              <OptionCard
                value="passport"
                title="Passport"
                description="For non-Egyptian fans · photo page"
                selected={documentType === "passport"}
                size="lg"
              />
            </RadioGroup>
            <p className="text-sm leading-normal text-muted-ink">
              Your ID images are encrypted and used only to verify you. Takes about 2 minutes.
            </p>
          </fieldset>
        ) : null}
        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Photograph your {docName}</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
              <CaptureTile
                label="Front side"
                capture="environment"
                captured={captured.front}
                onCapture={(c) => setCaptured((s) => ({ ...s, front: c }))}
              />
              {documentType === "national_id" ? (
                <CaptureTile
                  label="Back side"
                  capture="environment"
                  captured={captured.back}
                  onCapture={(c) => setCaptured((s) => ({ ...s, back: c }))}
                />
              ) : null}
            </div>
            <ul className="m-0 pl-5 text-sm leading-relaxed text-sub">
              <li>Place the card on a dark, flat surface</li>
              <li>All four corners visible, no glare or blur</li>
            </ul>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-semibold">Take a selfie</h2>
            <div aria-hidden="true" className="flex h-[300px] w-[260px] items-center justify-center rounded-2xl bg-ink">
              <div
                className={cn(
                  "h-[230px] w-[170px] rounded-full border-[3px] border-dashed",
                  captured.selfie ? "border-mint" : "border-gold",
                )}
              />
            </div>
            <p className="max-w-[420px] text-[15px] leading-normal text-sub">
              Keep your face inside the oval and turn your head slowly when asked. Remove sunglasses and hats.
            </p>
            <div className="w-full max-w-[320px]">
              <CaptureTile
                label="Selfie"
                capture="user"
                captured={captured.selfie}
                onCapture={(c) => setCaptured((s) => ({ ...s, selfie: c }))}
              />
            </div>
          </div>
        ) : null}
        {step === 4 && extracted ? (
          <div className="flex flex-col gap-3.5">
            <h2 className="text-lg font-semibold">Check your details</h2>
            <p className="text-sm text-muted-ink">
              We read these from your document. They&apos;ll appear on your Fan ID and can&apos;t be changed later.
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
              <Field label="Name (English)">
                <Input readOnly value={extracted.nameEn} className="h-12" />
              </Field>
              <Field label="Name (Arabic)">
                <Input readOnly dir="rtl" lang="ar" value={extracted.nameAr} className="h-12" />
              </Field>
              <Field label="ID number">
                <Input readOnly mono value={extracted.idNumberMasked} className="h-12" />
              </Field>
              <Field label="Date of birth">
                <Input readOnly mono value={extracted.dateOfBirth} className="h-12" />
              </Field>
            </div>
            <Button variant="link" className="min-h-11 self-start" onClick={() => onStepChange(2)}>
              Something&apos;s wrong? Retake photos
            </Button>
            <CheckboxField
              label="I confirm these details are correct and agree to identity checks for stadium entry."
              checked={confirmed}
              onCheckedChange={setConfirmed}
            />
          </div>
        ) : null}
        {step === 5 && approved ? (
          <div className="flex flex-col items-center gap-5">
            <Notice tone="success" icon={false} className="w-auto py-2.5 font-semibold">
              Approved — you can now buy match tickets
            </Notice>
            <FanIdCard name={approved.name} number={approved.number} validUntil={approved.validUntil} />
            <div className="flex flex-wrap justify-center gap-2.5">
              <LinkButton href={browseHref} variant="primary" size="xl">
                Browse matches
              </LinkButton>
              {linkFansHref ? (
                <LinkButton href={linkFansHref} variant="outline" size="xl" className="font-normal">
                  Link family &amp; friends
                </LinkButton>
              ) : null}
            </div>
          </div>
        ) : null}
        {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
        {step < 5 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line pt-[18px]">
            <Button variant="outline" size="lg" onClick={() => onStepChange(Math.max(1, step - 1))} disabled={step === 1}>
              Back
            </Button>
            <span role="alert" className="flex-1 text-right text-[13px] text-rose-ink">
              {message}
            </span>
            <Button variant="pitch" size="lg" onClick={next} loading={pending}>
              {nextLabel}
            </Button>
          </div>
        ) : null}
      </section>
      {step < 5 ? (
        <AppLink href={skipHref} tone="muted" underline className="flex min-h-11 items-center self-center text-sm">
          Skip for now — I only want concert tickets
        </AppLink>
      ) : null}
    </div>
  );
}
