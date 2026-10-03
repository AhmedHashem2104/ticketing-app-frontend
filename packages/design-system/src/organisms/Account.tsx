import { zodResolver } from "@hookform/resolvers/zod";
import {
  documentTypeSchema,
  FAN_ID_IMAGE_TYPES,
  fanIdDocumentsSchema,
  fanIdExtractedSchema,
  fanIdSubmitRequestSchema,
  fanSchema,
  forgotPasswordRequestSchema,
  imageUploadSchema,
  initialsOf,
  linkFanRequestSchema,
  loginRequestSchema,
  otpCodeSchema,
  passwordSchema,
  preferencesRequestSchema,
  signUpRequestSchema,
  userSchema,
  type DocumentType,
  type ForgotPasswordRequest,
  type LinkFanRequest,
  type LoginRequest,
  type PreferencesRequest,
  type SignUpRequest,
} from "@repo/contracts";
import { Camera, Check, Loader2, LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { Button, LinkButton } from "../atoms/Button";
import { Input, RadioGroup } from "../atoms/FormControls";
import { Avatar, Logo } from "../atoms/Identity";
import { Switch } from "../components/ui/switch";
import { Eyebrow, Heading } from "../atoms/Typography";
import { HolderRow, Notice } from "../molecules/Content";
import { CheckboxField, Field, OptionCard, OtpInput } from "../molecules/Form";
import { StepProgress } from "../molecules/Navigation";
import { useCountdown } from "../lib/hooks";
import { validateProps, zClassName, zDateString, zFn, zHref } from "../lib/props";
import { cn } from "../lib/utils";
import { DevAutofillButton } from "../atoms/DevAutofill";
import { devSamples, fillForm, sampleImageFile, sampleSignUp } from "../lib/dev-samples";
import { useI18n } from "../lib/provider";
import { msg } from "@repo/i18n";

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
  const { t } = useI18n();
  return (
    <section
      aria-label={t("Why Matchpass")}
      className={cn("flex flex-col gap-9 bg-pitch px-6 py-10 text-white sm:px-14 sm:py-12", className)}
    >
      <AppLink href={homeHref} aria-label={t("Matchpass home")} className="self-start hover:no-underline">
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
  const { t } = useI18n();
  return (
    <form
      noValidate
      aria-labelledby="signup-title"
      onSubmit={form.handleSubmit((v) => onSubmit(v))}
      className={cn("flex flex-col gap-[18px]", className)}
    >
      <DevAutofillButton label={t("Autofill a new account")} onFill={() => fillForm(form, sampleSignUp())} />
      <div className="flex flex-col gap-1.5">
        <Heading as="h1" id="signup-title" size="2xl">
          {t("Create your account")}
        </Heading>
        <span className="text-[15px] text-sub">
          {t("Already have one?")}{" "}
          <AppLink href={loginHref} tone="pitch" underline>
            {t("Log in")}
          </AppLink>
        </span>
      </div>
      <Field label={t("Full name (as on your ID)")} error={e.fullName?.message} required>
        <Input autoComplete="name" className="h-12" {...form.register("fullName")} />
      </Field>
      <Field label={t("Mobile number")} error={e.phone?.message} required>
        <div dir="ltr" className="flex gap-2">
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
      <Field label={t("Email")} optionalLabel={t("(optional, for receipts)")} error={e.email?.message}>
        <Input type="email" autoComplete="email" className="h-12" {...form.register("email")} />
      </Field>
      <Field label={t("Password")} hint={t("At least 8 characters")} error={e.password?.message} required>
        <Input type="password" autoComplete="new-password" className="h-12" {...form.register("password")} />
      </Field>
      <Controller
        control={form.control}
        name="acceptTerms"
        render={({ field }) => (
          <CheckboxField
            label={t("I agree to the terms of use and privacy policy")}
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
          <CheckboxField label={t("Send me news and offers (optional)")} checked={!!field.value} onCheckedChange={field.onChange} />
        )}
      />
      {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText={t("Sending code…")}>
        {t("Send verification code")}
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
  const { t } = useI18n();
  return (
    <form
      noValidate
      aria-labelledby="otp-title"
      onSubmit={form.handleSubmit((v) => onSubmit(v.code))}
      className={cn("flex flex-col gap-[18px]", className)}
    >
      <DevAutofillButton label={t("Autofill code")} onFill={() => fillForm(form, { code: devSamples.otp })} />
      <div className="flex flex-col gap-1.5">
        <Heading as="h1" id="otp-title" size="2xl">
          {t("Enter the code")}
        </Heading>
        <span className="text-[15px] text-sub">
          {t("We sent a 6-digit code to")}{" "}
          <span dir="ltr" className="font-mono text-ink">
            {maskedPhone}
          </span>
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
          {t(error)}
        </span>
      ) : null}
      <div className="flex items-center justify-between text-sm text-muted-ink">
        {resendIn > 0 ? (
          <span aria-live="off">{t("Resend code in {time}", { time: `0:${String(resendIn).padStart(2, "0")}` })}</span>
        ) : (
          <Button variant="link" size="sm" onClick={onResend}>
            {t("Resend code")}
          </Button>
        )}
        <Button variant="link" size="sm" onClick={onChangeNumber} className="min-h-11">
          {t("Change number")}
        </Button>
      </div>
      {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText={t("Verifying…")}>
        {t("Verify and continue")}
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
  forgotHref: zHref.optional(),
  className: zClassName,
});

export type LoginFormProps = z.input<typeof loginFormPropsSchema>;

/** Organism · LoginForm */
export function LoginForm(props: LoginFormProps) {
  validateProps("LoginForm", loginFormPropsSchema, props);
  const { onSubmit, submitting, serverError, signUpHref, forgotHref, className } = props;
  const form = useForm<LoginRequest, unknown, z.output<typeof loginRequestSchema>>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { phone: "", password: "" },
  });
  const e = form.formState.errors;
  const { t } = useI18n();
  return (
    <form
      noValidate
      aria-labelledby="login-title"
      onSubmit={form.handleSubmit((v) => onSubmit(v))}
      className={cn("flex flex-col gap-[18px]", className)}
    >
      <DevAutofillButton label={t("Autofill demo account")} onFill={() => fillForm(form, devSamples.login)} />
      <div className="flex flex-col gap-1.5">
        <Heading as="h1" id="login-title" size="2xl">
          {t("Log in")}
        </Heading>
        <span className="text-[15px] text-sub">
          {t("New to Matchpass?")}{" "}
          <AppLink href={signUpHref} tone="pitch" underline>
            {t("Create an account")}
          </AppLink>
        </span>
      </div>
      <Field label={t("Mobile number")} error={e.phone?.message} required>
        <div dir="ltr" className="flex gap-2">
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
      <Field label={t("Password")} error={e.password?.message} required>
        <Input type="password" autoComplete="current-password" className="h-12" {...form.register("password")} />
      </Field>
      {forgotHref ? (
        <AppLink href={forgotHref} tone="pitch" underline className="-mt-2 flex min-h-11 items-center self-end text-sm">
          {t("Forgot password?")}
        </AppLink>
      ) : null}
      {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText={t("Logging in…")}>
        {t("Log in")}
      </Button>
    </form>
  );
}

/* ---------- FanIdCard ---------- */

export const fanIdCardPropsSchema = z.object({
  name: z.string().min(1),
  number: z.string().min(1),
  validUntil: z.string().min(1),
  /** Verified photo, when the app can show it. Initials are shown otherwise. */
  photoUrl: z.string().min(1).optional(),
  className: zClassName,
});

export type FanIdCardProps = z.input<typeof fanIdCardPropsSchema>;

/** Organism · FanIdCard — the digital Fan ID. */
export function FanIdCard(props: FanIdCardProps) {
  validateProps("FanIdCard", fanIdCardPropsSchema, props);
  const { name, number, validUntil, photoUrl, className } = props;
  const { t } = useI18n();
  return (
    <section
      aria-label={t("Your Fan ID")}
      className={cn("flex w-full max-w-[440px] flex-col gap-[18px] rounded-[18px] bg-pitch p-6 text-white", className)}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-[22px] font-extrabold tracking-[0.08em]">{t("MATCHPASS FAN ID")}</span>
        <Logo wordmark="none" tone="gold" />
      </div>
      <div className="flex items-center gap-[18px]">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="h-[108px] w-[88px] shrink-0 rounded-[10px] object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-[108px] w-[88px] shrink-0 items-center justify-center rounded-[10px] bg-mint font-display text-[34px] font-extrabold text-pitch"
          >
            {initialsOf(name)}
          </div>
        )}
        <dl className="m-0 flex flex-col gap-1.5">
          <dt className="sr-only">{t("Name")}</dt>
          <dd className="m-0 font-display text-[30px] leading-none font-extrabold uppercase">{name}</dd>
          <dt className="sr-only">{t("Fan ID number")}</dt>
          <dd className="m-0 font-mono text-[15px] text-gold">{number}</dd>
          <dt className="sr-only">{t("Validity")}</dt>
          <dd className="m-0 text-[13px] text-mint">{t("Valid until {date}", { date: validUntil })}</dd>
        </dl>
      </div>
    </section>
  );
}

/* ---------- FanIdWizard ---------- */

const FAN_STEPS = [msg("Document"), msg("ID photos"), msg("Selfie"), msg("Review"), msg("Done")];
const FAN_TITLES = [
  msg("Get your Fan ID"),
  msg("Scan your document"),
  msg("Confirm it’s you"),
  msg("Almost done"),
  msg("Your Fan ID is ready"),
];

const zFile = z.custom<File>((value) => typeof File !== "undefined" && value instanceof File, { error: "Expected a File" });

export type FanIdDocumentsValues = { documentType: DocumentType; front: File; back?: File };
export type FanIdSubmitValues = { scanId: string; selfie: File; confirmDetails: true };

export const fanIdWizardPropsSchema = z.object({
  step: z.number().int().min(1).max(5),
  onStepChange: zFn<(step: number) => void>(),
  onScan: zFn<(values: FanIdDocumentsValues) => Promise<void> | void>(),
  extracted: fanIdExtractedSchema.optional(),
  onSubmit: zFn<(values: FanIdSubmitValues) => Promise<void> | void>(),
  approved: z
    .object({ name: z.string().min(1), number: z.string().min(1), validUntil: z.string().min(1), photoUrl: z.string().min(1).optional() })
    .optional(),
  /** Submitted and waiting for the identity check. */
  underReview: z.boolean().optional(),
  pending: z.boolean().optional(),
  serverError: z.string().optional(),
  browseHref: zHref,
  skipHref: zHref,
  linkFansHref: zHref.optional(),
  className: zClassName,
});

export type FanIdWizardProps = z.input<typeof fanIdWizardPropsSchema>;

const canPreview = () => typeof URL !== "undefined" && typeof URL.createObjectURL === "function";

/**
 * Preview of a picked photo. The object URL is created and revoked by the same effect run, so React
 * StrictMode's mount → cleanup → mount never leaves a revoked URL on screen.
 */
function PhotoPreview({ file, alt }: { file: File; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (!img || !canPreview()) return;
    const url = URL.createObjectURL(file);
    img.src = url;
    return () => {
      img.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return <img ref={ref} alt={alt} className="h-24 max-w-full rounded-lg object-cover" />;
}

const captureTilePropsSchema = z.object({
  label: z.string().min(1),
  file: zFile.optional(),
  onFile: zFn<(file: File | undefined) => void>(),
  capture: z.enum(["user", "environment"]),
  error: z.string().optional(),
});

/** Molecule-level helper · CaptureTile — take or upload one photo, with preview and validation message. */
function CaptureTile(props: z.input<typeof captureTilePropsSchema>) {
  validateProps("CaptureTile", captureTilePropsSchema, props);
  const { label, file, onFile, capture, error } = props;
  const { t } = useI18n();
  const id = useId();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0]);
  const describedBy = [`${id}-status`, error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-2.5 rounded-xl p-3 text-center",
        error
          ? "border-2 border-rose-ink bg-rose-soft"
          : file
            ? "border-2 border-pitch bg-mint text-pitch"
            : "border-2 border-dashed border-stone bg-paper",
      )}
    >
      {file && canPreview() ? (
        <PhotoPreview file={file} alt={t("{label} preview", { label })} />
      ) : file ? (
        <Check className="size-9" strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <Camera className="size-9 text-sub" aria-hidden="true" />
      )}
      <span className="font-semibold" id={`${id}-status`}>
        {file && !error ? t("{label} added", { label }) : label}
      </span>
      {error ? (
        <span id={`${id}-error`} className="text-[13px] text-rose-ink">
          {t(error)}
        </span>
      ) : null}
      <input
        id={id}
        type="file"
        accept={FAN_ID_IMAGE_TYPES.join(",")}
        capture={capture}
        className="peer sr-only"
        onChange={onChange}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex h-11 cursor-pointer items-center rounded-lg px-4 text-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-gold",
          file ? "font-semibold text-pitch underline" : "border border-ink bg-white",
        )}
      >
        {file
          ? t("Retake {label}", { label: label.toLowerCase() })
          : capture === "user"
            ? t("Take selfie")
            : t("Take photo or upload · {label}", { label: label.toLowerCase() })}
      </label>
    </div>
  );
}

type Photos = { front?: File; back?: File; selfie?: File };

/** Organism · FanIdWizard — document, photo uploads, selfie, review, then the identity check and approval. */
export function FanIdWizard(props: FanIdWizardProps) {
  validateProps("FanIdWizard", fanIdWizardPropsSchema, props);
  const {
    step,
    onStepChange,
    onScan,
    extracted,
    onSubmit,
    approved,
    underReview,
    pending,
    serverError,
    browseHref,
    skipHref,
    linkFansHref,
    className,
  } = props;
  const [documentType, setDocumentType] = useState<DocumentType>("national_id");
  const [photos, setPhotos] = useState<Photos>({});
  const [photoErrors, setPhotoErrors] = useState<Partial<Record<keyof Photos, string>>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string>();
  const { t } = useI18n();
  const docName = documentType === "national_id" ? t("national ID") : t("passport");

  /** Validates a picked photo immediately (type and size) so fans don't find out after uploading. */
  const pick = (key: keyof Photos) => (file: File | undefined) => {
    setPhotos((p) => ({ ...p, [key]: file }));
    const check = file ? imageUploadSchema.safeParse({ type: file.type, size: file.size }) : undefined;
    setPhotoErrors((e) => ({ ...e, [key]: check && !check.success ? check.error.issues[0]?.message : undefined }));
  };

  const next = async () => {
    setMessage(undefined);
    if (step === 1) return onStepChange(2);
    if (step === 2) {
      const meta = (f?: File) => (f ? { type: f.type, size: f.size } : undefined);
      const parsed = fanIdDocumentsSchema.safeParse({
        documentType,
        front: meta(photos.front),
        back: documentType === "national_id" ? meta(photos.back) : undefined,
      });
      if (!parsed.success) {
        const errs: Partial<Record<keyof Photos, string>> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof Photos;
          errs[key] ??= issue.message;
        }
        setPhotoErrors(errs);
        return setMessage(parsed.error.issues[0]?.message);
      }
      return onScan({
        documentType,
        front: photos.front!,
        ...(documentType === "national_id" && photos.back ? { back: photos.back } : {}),
      });
    }
    if (step === 3) {
      const check = photos.selfie ? imageUploadSchema.safeParse({ type: photos.selfie.type, size: photos.selfie.size }) : undefined;
      if (!check) return setMessage("Take a selfie to continue");
      if (!check.success) return setMessage(check.error.issues[0]?.message);
      return onStepChange(4);
    }
    if (step === 4) {
      const submit = fanIdSubmitRequestSchema.safeParse({
        scanId: extracted?.scanId,
        selfie: photos.selfie ? { type: photos.selfie.type, size: photos.selfie.size } : undefined,
        confirmDetails: confirmed,
      });
      if (!submit.success) return setMessage(submit.error.issues[0]?.message);
      return onSubmit({ scanId: submit.data.scanId, selfie: photos.selfie!, confirmDetails: true });
    }
  };

  const nextLabel = step === 4 ? t("Submit for verification") : t("Continue");

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <Eyebrow tone="pitch">{t("Fan ID · Needed for football matches")}</Eyebrow>
        <Heading as="h1" size="3xl">
          {step === 5 && underReview && !approved ? t("We’re checking your details") : t(FAN_TITLES[step - 1]!)}
        </Heading>
      </div>
      <StepProgress steps={FAN_STEPS.map((s) => t(s))} current={step} />
      {step >= 1 && step <= 4 ? (
        <DevAutofillButton
          label={t("Autofill sample photos")}
          onFill={async () => {
            const [front, back, selfie] = await Promise.all(["front", "back", "selfie"].map((k) => sampleImageFile(k as keyof Photos)));
            setPhotos({ front, back, selfie });
            setPhotoErrors({});
            setConfirmed(true);
            setMessage(undefined);
          }}
        />
      ) : null}
      <section aria-label={t(FAN_TITLES[step - 1]!)} className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
        {step === 1 ? (
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="pb-3 text-lg font-semibold">{t("Which document will you use?")}</legend>
            <RadioGroup
              aria-label={t("Document")}
              value={documentType}
              onValueChange={(v) => setDocumentType(documentTypeSchema.parse(v))}
              className="gap-3"
            >
              <OptionCard
                value="national_id"
                title={t("Egyptian national ID")}
                description={t("Front and back of the card")}
                selected={documentType === "national_id"}
                size="lg"
              />
              <OptionCard
                value="passport"
                title={t("Passport")}
                description={t("For non-Egyptian fans · photo page")}
                selected={documentType === "passport"}
                size="lg"
              />
            </RadioGroup>
            <p className="text-sm leading-normal text-muted-ink">
              {t("Your ID images are encrypted, used only to verify you and deleted after the check. Takes about 2 minutes.")}
            </p>
          </fieldset>
        ) : null}
        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("Photograph your {document}", { document: docName })}</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
              <CaptureTile
                label={t("Front side")}
                capture="environment"
                file={photos.front}
                onFile={pick("front")}
                error={photoErrors.front}
              />
              {documentType === "national_id" ? (
                <CaptureTile
                  label={t("Back side")}
                  capture="environment"
                  file={photos.back}
                  onFile={pick("back")}
                  error={photoErrors.back}
                />
              ) : null}
            </div>
            <ul className="m-0 ps-5 text-sm leading-relaxed text-sub">
              <li>{t("Place the card on a dark, flat surface")}</li>
              <li>{t("All four corners visible, no glare or blur")}</li>
              <li>{t("JPG, PNG, WEBP or HEIC, up to 8 MB")}</li>
            </ul>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-semibold">{t("Take a selfie")}</h2>
            <p className="max-w-[420px] text-[15px] leading-normal text-sub">
              {t("Face the camera in good light. Remove sunglasses and hats. We compare it with your document photo.")}
            </p>
            <div className="w-full max-w-[320px]">
              <CaptureTile label={t("Selfie")} capture="user" file={photos.selfie} onFile={pick("selfie")} error={photoErrors.selfie} />
            </div>
          </div>
        ) : null}
        {step === 4 && extracted ? (
          <div className="flex flex-col gap-3.5">
            <h2 className="text-lg font-semibold">{t("Check your details")}</h2>
            <p className="text-sm text-muted-ink">
              {t("We read these from your document. They'll appear on your Fan ID and can't be changed later.")}
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
              <Field label={t("Name (English)")}>
                <Input readOnly dir="ltr" value={extracted.nameEn} className="h-12" />
              </Field>
              <Field label={t("Name (Arabic)")}>
                <Input readOnly dir="rtl" lang="ar" value={extracted.nameAr} className="h-12" />
              </Field>
              <Field label={t("ID number")}>
                <Input readOnly mono value={extracted.idNumberMasked} className="h-12" />
              </Field>
              <Field label={t("Date of birth")}>
                <Input readOnly mono value={extracted.dateOfBirth} className="h-12" />
              </Field>
            </div>
            <Button variant="link" className="min-h-11 self-start" onClick={() => onStepChange(2)}>
              {t("Something's wrong? Retake photos")}
            </Button>
            <CheckboxField
              label={t("I confirm these details are correct and agree to identity checks for stadium entry.")}
              checked={confirmed}
              onCheckedChange={setConfirmed}
            />
          </div>
        ) : null}
        {step === 5 && approved ? (
          <div className="flex flex-col items-center gap-5">
            <Notice tone="success" icon={false} className="w-auto py-2.5 font-semibold">
              {t("Approved — you can now buy match tickets")}
            </Notice>
            <FanIdCard name={approved.name} number={approved.number} validUntil={approved.validUntil} photoUrl={approved.photoUrl} />
            <div className="flex flex-wrap justify-center gap-2.5">
              <LinkButton href={browseHref} variant="primary" size="xl">
                {t("Browse matches")}
              </LinkButton>
              {linkFansHref ? (
                <LinkButton href={linkFansHref} variant="outline" size="xl" className="font-normal">
                  {t("Link family & friends")}
                </LinkButton>
              ) : null}
            </div>
          </div>
        ) : null}
        {step === 5 && !approved && underReview ? (
          <div role="status" className="flex flex-col items-center gap-4 py-4 text-center">
            <Loader2 className="size-10 animate-spin text-pitch motion-reduce:animate-none" aria-hidden="true" />
            <p className="max-w-[440px] text-[15px] leading-normal text-sub">
              {t(
                "Your photos are with our verification partner. It usually takes a few minutes — we’ll text you, and this page updates by itself.",
              )}
            </p>
            <LinkButton href={skipHref} variant="outline" size="lg" className="font-normal">
              {t("Browse concerts meanwhile")}
            </LinkButton>
          </div>
        ) : null}
        {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
        {step < 5 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line pt-[18px]">
            <Button variant="outline" size="lg" onClick={() => onStepChange(Math.max(1, step - 1))} disabled={step === 1}>
              {t("Back")}
            </Button>
            <span role="alert" className="flex-1 text-end text-[13px] text-rose-ink">
              {message ? t(message) : null}
            </span>
            <Button variant="pitch" size="lg" onClick={next} loading={pending} loadingText={step === 2 ? t("Uploading…") : undefined}>
              {nextLabel}
            </Button>
          </div>
        ) : null}
      </section>
      {step < 5 ? (
        <AppLink href={skipHref} tone="muted" underline className="flex min-h-11 items-center self-center text-sm">
          {t("Skip for now — I only want concert tickets")}
        </AppLink>
      ) : null}
    </div>
  );
}

/* ---------- ForgotPasswordForm ---------- */

const resetFormSchema = z
  .object({ code: otpCodeSchema, password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { error: "Passwords don't match", path: ["confirmPassword"] });
export type ResetPasswordValues = z.output<typeof resetFormSchema>;

export const forgotPasswordFormPropsSchema = z.object({
  /** `request`: ask for the mobile number · `reset`: enter the SMS code and a new password. */
  stage: z.enum(["request", "reset"]),
  maskedPhone: z.string().optional(),
  onRequest: zFn<(values: z.output<typeof forgotPasswordRequestSchema>) => Promise<void> | void>(),
  onReset: zFn<(values: ResetPasswordValues) => Promise<void> | void>(),
  onStartOver: zFn<() => void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  loginHref: zHref,
  className: zClassName,
});

export type ForgotPasswordFormProps = z.input<typeof forgotPasswordFormPropsSchema>;

/** Organism · ForgotPasswordForm — reset a password with an SMS code. */
export function ForgotPasswordForm(props: ForgotPasswordFormProps) {
  validateProps("ForgotPasswordForm", forgotPasswordFormPropsSchema, props);
  const { stage, maskedPhone, onRequest, onReset, onStartOver, submitting, serverError, loginHref, className } = props;
  const request = useForm<ForgotPasswordRequest, unknown, z.output<typeof forgotPasswordRequestSchema>>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { phone: "" },
  });
  const reset = useForm<z.input<typeof resetFormSchema>, unknown, ResetPasswordValues>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { code: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const { t } = useI18n();
  const header = (
    <div className="flex flex-col gap-1.5">
      <Heading as="h1" id="forgot-title" size="2xl">
        {stage === "request" ? t("Reset your password") : t("Choose a new password")}
      </Heading>
      <span className="text-[15px] text-sub">
        {stage === "request" ? (
          t("We’ll text a code to the mobile number on your account.")
        ) : (
          <>
            {t("Enter the code we sent to")}{" "}
            <span dir="ltr" className="font-mono text-ink">
              {maskedPhone}
            </span>
          </>
        )}
      </span>
    </div>
  );
  if (stage === "request") {
    const e = request.formState.errors;
    return (
      <form
        noValidate
        aria-labelledby="forgot-title"
        onSubmit={request.handleSubmit((v) => onRequest(v))}
        className={cn("flex flex-col gap-[18px]", className)}
      >
        <DevAutofillButton label={t("Autofill demo number")} onFill={() => fillForm(request, { phone: devSamples.login.phone })} />
        {header}
        <Field label={t("Mobile number")} error={e.phone?.message} required>
          <div dir="ltr" className="flex gap-2">
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
              {...request.register("phone")}
            />
          </div>
        </Field>
        {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
        <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText={t("Sending code…")}>
          {t("Send reset code")}
        </Button>
        <AppLink href={loginHref} tone="pitch" underline className="flex min-h-11 items-center self-center text-sm">
          {t("Back to log in")}
        </AppLink>
      </form>
    );
  }
  const e = reset.formState.errors;
  return (
    <form
      noValidate
      aria-labelledby="forgot-title"
      onSubmit={reset.handleSubmit((v) => onReset(v))}
      className={cn("flex flex-col gap-[18px]", className)}
    >
      <DevAutofillButton
        onFill={() => fillForm(reset, { code: devSamples.otp, password: devSamples.newPassword, confirmPassword: devSamples.newPassword })}
      />
      {header}
      <Controller
        control={reset.control}
        name="code"
        render={({ field }) => (
          <Field label={t("SMS code")} error={e.code?.message} required>
            <OtpInput value={field.value} onValueChange={field.onChange} invalid={!!e.code} />
          </Field>
        )}
      />
      <Field label={t("New password")} hint={t("At least 8 characters")} error={e.password?.message} required>
        <Input type="password" autoComplete="new-password" className="h-12" {...reset.register("password")} />
      </Field>
      <Field label={t("Confirm new password")} error={e.confirmPassword?.message} required>
        <Input type="password" autoComplete="new-password" className="h-12" {...reset.register("confirmPassword")} />
      </Field>
      {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText={t("Saving…")}>
        {t("Save new password")}
      </Button>
      <Button variant="link" size="sm" onClick={onStartOver} className="min-h-11 self-center">
        {t("Use a different number")}
      </Button>
    </form>
  );
}

/* ---------- PreferencesForm ---------- */

export const preferencesFormPropsSchema = z.object({
  defaultValues: preferencesRequestSchema,
  onSubmit: zFn<(values: PreferencesRequest) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  saved: z.boolean().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});

export type PreferencesFormProps = z.input<typeof preferencesFormPropsSchema>;

const PREFERENCES: { key: keyof PreferencesRequest; label: string; hint: string }[] = [
  { key: "sms", label: msg("SMS updates"), hint: msg("Waiting room turns, order confirmations and gate changes") },
  { key: "email", label: msg("Email receipts"), hint: msg("Receipts, refunds and transfer updates") },
  { key: "marketing", label: msg("News and offers"), hint: msg("Presales and offers from Matchpass and organisers") },
];

/** Organism · PreferencesForm — how Matchpass contacts the fan. */
export function PreferencesForm(props: PreferencesFormProps) {
  validateProps("PreferencesForm", preferencesFormPropsSchema, props);
  const { defaultValues, onSubmit, submitting, saved, serverError, className } = props;
  const form = useForm<PreferencesRequest>({ resolver: zodResolver(preferencesRequestSchema), defaultValues });
  const baseId = useId();
  const { t } = useI18n();
  return (
    <form
      noValidate
      aria-labelledby={`${baseId}-title`}
      onSubmit={form.handleSubmit((v) => onSubmit(v))}
      className={cn("flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6", className)}
    >
      <DevAutofillButton label={t("Turn everything on")} onFill={() => fillForm(form, { sms: true, email: true, marketing: true })} />
      <h2 id={`${baseId}-title`} className="text-lg font-semibold">
        {t("Notifications")}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {PREFERENCES.map((pref) => (
          <li key={pref.key} className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
            <span className="flex flex-col">
              <label htmlFor={`${baseId}-${pref.key}`} className="text-[15px] font-semibold">
                {t(pref.label)}
              </label>
              <span id={`${baseId}-${pref.key}-hint`} className="text-sm text-sub">
                {t(pref.hint)}
              </span>
            </span>
            <Controller
              control={form.control}
              name={pref.key}
              render={({ field }) => (
                <Switch
                  id={`${baseId}-${pref.key}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-describedby={`${baseId}-${pref.key}-hint`}
                />
              )}
            />
          </li>
        ))}
      </ul>
      {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="lg" loading={submitting} loadingText={t("Saving…")}>
          {t("Save preferences")}
        </Button>
        {saved ? (
          <span role="status" className="flex items-center gap-1 text-sm font-semibold text-pitch">
            <Check className="size-4" aria-hidden="true" /> {t("Saved")}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/* ---------- AccountProfileCard ---------- */

export const accountProfileCardPropsSchema = z.object({
  user: userSchema,
  fanIdHref: zHref,
  onSignOut: zFn<() => void>(),
  className: zClassName,
});

export type AccountProfileCardProps = z.input<typeof accountProfileCardPropsSchema>;

/** Organism · AccountProfileCard — who is signed in, their Fan ID status and credit. */
export function AccountProfileCard(props: AccountProfileCardProps) {
  validateProps("AccountProfileCard", accountProfileCardPropsSchema, props);
  const { user, fanIdHref, onSignOut, className } = props;
  const fanId = user.fanId;
  const { t, f } = useI18n();
  return (
    <section
      aria-labelledby="profile-title"
      className={cn("flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6", className)}
    >
      <div className="flex items-center gap-4">
        <Avatar initials={user.initials} src={user.avatarUrl} size="lg" />
        <div className="flex flex-col">
          <h2 id="profile-title" className="text-xl font-semibold">
            {user.fullName}
          </h2>
          <span dir="ltr" className="self-start font-mono text-sm text-sub">
            {user.phoneMasked}
          </span>
          {user.email ? <span className="text-sm text-sub">{user.email}</span> : null}
        </div>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl bg-paper p-3">
          <dt className="text-xs font-semibold tracking-wide text-muted-ink uppercase">{t("Fan ID")}</dt>
          <dd className="m-0 text-[15px] font-semibold">
            {fanId.status === "approved" ? fanId.number : fanId.status === "pending" ? t("Under review") : t("Not yet")}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-paper p-3">
          <dt className="text-xs font-semibold tracking-wide text-muted-ink uppercase">{t("Matchpass credit")}</dt>
          <dd className="m-0 font-mono text-[15px] font-semibold">{f.money(user.credit)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2.5">
        {fanId.status !== "approved" ? (
          <LinkButton href={fanIdHref} variant="pitch" size="lg">
            {fanId.status === "pending" ? t("Check Fan ID status") : t("Get your Fan ID")}
          </LinkButton>
        ) : null}
        <Button variant="outline" size="lg" onClick={onSignOut} className="font-normal">
          <LogOut aria-hidden="true" /> {t("Sign out")}
        </Button>
      </div>
    </section>
  );
}

/* ---------- LinkedFansManager ---------- */

export const MAX_LINKED_FANS = 3;

export const linkedFansManagerPropsSchema = z.object({
  fans: z.array(fanSchema),
  onLink: zFn<(values: z.output<typeof linkFanRequestSchema>) => Promise<void> | void>(),
  onUnlink: zFn<(fanId: string) => Promise<void> | void>(),
  canLink: z.boolean(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});

export type LinkedFansManagerProps = z.input<typeof linkedFansManagerPropsSchema>;

/** Organism · LinkedFansManager — family and friends you can buy match tickets for. */
export function LinkedFansManager(props: LinkedFansManagerProps) {
  validateProps("LinkedFansManager", linkedFansManagerPropsSchema, props);
  const { fans, onLink, onUnlink, canLink, submitting, serverError, className } = props;
  const others = fans.filter((f) => !f.isSelf);
  const form = useForm<LinkFanRequest, unknown, z.output<typeof linkFanRequestSchema>>({
    resolver: zodResolver(linkFanRequestSchema),
    defaultValues: { name: "", fanIdNumber: "" },
  });
  const e = form.formState.errors;
  const full = others.length >= MAX_LINKED_FANS;
  const { t } = useI18n();
  return (
    <section
      aria-labelledby="fans-title"
      className={cn("flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6", className)}
    >
      <div className="flex flex-col gap-1">
        <h2 id="fans-title" className="text-lg font-semibold">
          {t("Linked fans")}
        </h2>
        <p className="text-sm text-sub">
          {t("Buy match tickets for up to {count} family members or friends with their own Fan ID.", { count: MAX_LINKED_FANS })}
        </p>
      </div>
      {fans.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {fans.map((fan) => (
            <li key={fan.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
              <HolderRow initials={fan.initials} avatarUrl={fan.avatarUrl} name={fan.name} detail={fan.fanIdMasked} />
              {fan.isSelf ? null : (
                <Button
                  variant="link"
                  size="sm"
                  className="min-h-11 text-rose-ink"
                  onClick={() => onUnlink(fan.id)}
                  aria-label={t("Unlink {name}", { name: fan.name })}
                >
                  {t("Unlink")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {canLink && !full ? (
        <form
          noValidate
          aria-label={t("Link a fan")}
          onSubmit={form.handleSubmit(async (v) => {
            await onLink(v);
            form.reset();
          })}
          className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-start gap-3 border-t border-line pt-4"
        >
          <DevAutofillButton label={t("Autofill a fan")} onFill={() => fillForm(form, devSamples.linkFan)} />
          <Field label={t("Their full name")} error={e.name?.message} required>
            <Input autoComplete="off" className="h-12" {...form.register("name")} />
          </Field>
          <Field label={t("Their Fan ID number")} error={e.fanIdNumber?.message} required>
            <Input mono inputMode="numeric" placeholder="2210 4417 0000" className="h-12" {...form.register("fanIdNumber")} />
          </Field>
          <Button type="submit" variant="primary" size="lg" loading={submitting} className="sm:mt-7">
            {t("Link fan")}
          </Button>
        </form>
      ) : canLink ? (
        <p className="text-sm text-sub">
          {t("You’ve linked the maximum of {count} fans. Unlink someone to add another.", { count: MAX_LINKED_FANS })}
        </p>
      ) : (
        <Notice tone="info">{t("Get your own Fan ID first, then you can link family and friends.")}</Notice>
      )}
      {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
    </section>
  );
}
