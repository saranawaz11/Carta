// Shared Clerk theme for the sign-in and sign-up forms.
// Heading, subtitle and the "switch page" link are rendered by AuthShell,
// so Clerk's own header and footerAction are hidden.
export const appearance = {
  // Puts Clerk's styles in their own CSS layer so the Tailwind classes below win.
  // Needs the matching @layer line at the top of globals.css.
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--carta-brand)",
    colorText: "var(--carta-ink)",
    colorTextSecondary: "var(--carta-muted)",
    colorBackground: "var(--carta-surface)",
    colorInputBackground: "var(--carta-panel)",
    colorInputText: "var(--carta-ink)",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
    fontSize: "0.8125rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full rounded-none bg-transparent shadow-none",
    card: "w-full gap-5 bg-transparent p-0 shadow-none",
    header: "hidden",
    footerAction: "hidden",
    footer: "bg-none bg-transparent",
    footerPages: "bg-transparent",
    footerPagesLink: "text-gray-500",

    socialButtonsBlockButton:
      "h-10 rounded-xl border border-line bg-panel shadow-none transition-[border-color,background-color,transform] duration-300 hover:border-red-300 hover:bg-red-50 active:scale-[0.98]",
    socialButtonsBlockButtonText: "text-xs font-medium text-gray-700",
    dividerLine: "bg-line",
    dividerText: "font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500",

    formFieldLabel: "text-[11px] font-medium text-gray-700",
    formFieldInput:
      "h-10 rounded-xl border border-line bg-panel text-xs shadow-none transition-[border-color,box-shadow] duration-300 focus:border-red-300 focus:ring-4 focus:ring-red-100",
    formFieldInputShowPasswordButton: "text-gray-500 hover:text-brand",
    formFieldAction: "text-[11px] text-brand hover:text-brand-strong",
    formFieldHintText: "text-[11px] text-gray-500",
    formFieldErrorText: "text-[11px]",

    formButtonPrimary:
      "h-11 rounded-full bg-[var(--carta-button)] text-xs font-medium normal-case shadow-lg shadow-[var(--carta-button-shadow)] transition-[background-color,box-shadow,transform] duration-300 hover:bg-[var(--carta-button-hover)] hover:shadow-xl hover:shadow-[var(--carta-button-shadow-hover)] active:scale-[0.98]",

    identityPreview: "rounded-xl border border-line bg-panel",
    identityPreviewEditButton: "text-brand hover:text-brand-strong",
    formResendCodeLink: "text-brand hover:text-brand-strong",
    otpCodeFieldInput: "rounded-xl border border-line bg-panel",
    alert: "rounded-xl",
    footerActionLink: "text-brand hover:text-brand-strong",
  },
};