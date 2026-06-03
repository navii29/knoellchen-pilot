// Übersetzt rohe Supabase-Auth-Fehlermeldungen in verständliches Deutsch,
// damit Vermietungen auf Login/Register nie englische Fehlertexte sehen.
export const mapAuthError = (raw: string | null | undefined): string => {
  const m = (raw ?? "").toLowerCase();
  if (!m) return "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already"))
    return "Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.";
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "E-Mail oder Passwort ist falsch.";
  if (m.includes("email not confirmed"))
    return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse — der Link ist in Ihrem Postfach.";
  if (m.includes("password") && (m.includes("short") || m.includes("at least") || m.includes("weak") || m.includes("characters")))
    return "Das Passwort ist zu kurz — bitte mindestens 8 Zeichen verwenden.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("for security purposes"))
    return "Zu viele Versuche. Bitte warten Sie kurz und versuchen Sie es erneut.";
  if (m.includes("unable to validate email") || m.includes("invalid email") || m.includes("invalid format"))
    return "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "Registrierungen sind derzeit deaktiviert. Bitte kontaktieren Sie uns.";
  return "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.";
};

// Fehler aus URL-Query (?error=...) — z. B. nach fehlgeschlagenem Callback /
// unvollständigem Konto.
export const mapQueryError = (code: string | null | undefined): string | null => {
  switch (code) {
    case "no_profile":
      return "Ihr Konto ist noch nicht vollständig eingerichtet. Bitte melden Sie sich erneut an — wir richten es automatisch fertig ein.";
    case "no_org":
      return "Ihrem Konto ist noch keine Organisation zugeordnet. Bitte registrieren Sie sich erneut.";
    case "auth":
      return "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.";
    default:
      return null;
  }
};
