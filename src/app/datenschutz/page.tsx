import type { Metadata } from "next";
import {
  LegalShell,
  H2,
  H3,
  P,
  UL,
  Address,
  Placeholder,
} from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Knöllchen-Pilot",
  description:
    "Datenschutzerklärung gemäß DSGVO für Knöllchen-Pilot, betrieben von der Southern Phoenix GmbH.",
};

export default function DatenschutzPage() {
  return (
    <LegalShell
      title="Datenschutz­erklärung"
      subtitle="Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13, 14 DSGVO."
    >
      <H2>1. Verantwortlicher</H2>
      <P>
        Verantwortlich für die Datenverarbeitung auf dieser Website und in der
        Anwendung Knöllchen-Pilot im Sinne der Datenschutz-Grundverordnung
        (DSGVO) ist:
      </P>
      <Address>
        Southern Phoenix GmbH
        <br />
        Steinmetzstr. 2
        <br />
        86165 Augsburg
        <br />
        Deutschland
      </Address>
      <P>
        Vertreten durch den Geschäftsführer Amir Alipour.
        <br />
        E-Mail:{" "}
        <a
          href="mailto:datenschutz@knoellchen-pilot.de"
          className="text-teal-700 hover:underline"
        >
          datenschutz@knoellchen-pilot.de
        </a>
        <br />
        Telefon: <Placeholder>[Telefonnummer wird ergänzt]</Placeholder>
      </P>

      <H2>2. Datenschutzbeauftragter</H2>
      <P>
        Die Bestellung eines Datenschutzbeauftragten ist nach Art. 37 DSGVO i. V. m.
        § 38 BDSG für unser Unternehmen aktuell nicht erforderlich. Bei Fragen zur
        Verarbeitung Ihrer personenbezogenen Daten wenden Sie sich bitte direkt an
        die oben genannte verantwortliche Stelle.
      </P>

      <H2>3. Allgemeines zur Datenverarbeitung</H2>
      <P>
        Wir verarbeiten personenbezogene Daten unserer Nutzer:innen grundsätzlich
        nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie
        unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung
        personenbezogener Daten erfolgt regelmäßig nur nach Einwilligung der
        Nutzer:innen oder soweit eine gesetzliche Grundlage dies gestattet.
      </P>

      <H3>Rechtsgrundlagen der Verarbeitung</H3>
      <UL>
        <li>
          Art. 6 Abs. 1 lit. a DSGVO — Einwilligung der betroffenen Person.
        </li>
        <li>
          Art. 6 Abs. 1 lit. b DSGVO — Verarbeitung zur Erfüllung eines Vertrags
          oder vorvertraglicher Maßnahmen.
        </li>
        <li>
          Art. 6 Abs. 1 lit. c DSGVO — Verarbeitung zur Erfüllung einer
          rechtlichen Verpflichtung.
        </li>
        <li>
          Art. 6 Abs. 1 lit. f DSGVO — Verarbeitung zur Wahrung berechtigter
          Interessen.
        </li>
      </UL>

      <H3>Speicherdauer und Löschung</H3>
      <P>
        Personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung
        entfällt. Eine darüber hinausgehende Speicherung erfolgt nur, soweit
        gesetzliche Aufbewahrungspflichten (insbesondere nach HGB und AO) bestehen
        oder zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen
        erforderlich ist.
      </P>

      <H2>4. Bereitstellung der Website und Server-Logfiles</H2>
      <P>
        Beim Aufruf unserer Website werden durch unseren Hosting-Dienstleister
        automatisch Informationen erhoben und in Server-Logfiles gespeichert. Dies
        sind insbesondere:
      </P>
      <UL>
        <li>IP-Adresse (gekürzt bzw. anonymisiert)</li>
        <li>Datum und Uhrzeit der Anfrage</li>
        <li>Browsertyp, Browserversion und Betriebssystem</li>
        <li>Referrer-URL</li>
        <li>Aufgerufene URL</li>
      </UL>
      <P>
        Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir
        haben ein berechtigtes Interesse an der technisch fehlerfreien
        Darstellung und Optimierung unserer Website sowie der Sicherheit unserer
        informationstechnischen Systeme.
      </P>

      <H3>Hosting (Vercel)</H3>
      <P>
        Unsere Website wird gehostet bei der Vercel Inc., 440 N Barranca Avenue
        #4133, Covina, CA 91723, USA („Vercel“). Beim Besuch unserer Website
        werden Verbindungsdaten an Vercel übermittelt. Wir haben mit Vercel einen
        Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO geschlossen. Eine
        Datenübermittlung in die USA erfolgt auf Grundlage der EU-US Data Privacy
        Framework-Zertifizierung von Vercel sowie ergänzender
        Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
      </P>

      <H2>5. Cookies</H2>
      <P>
        Wir verwenden auf unserer Website ausschließlich technisch notwendige
        Cookies. Diese sind erforderlich, um die Login-Sitzung aufrechtzuerhalten
        und grundlegende Funktionen unserer Anwendung zu ermöglichen. Eine
        Einwilligung ist hierfür nicht erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
      </P>
      <P>
        Marketing-, Analyse- oder Tracking-Cookies setzen wir derzeit nicht ein.
        Sollte sich dies künftig ändern, holen wir Ihre Einwilligung über ein
        Consent-Management-Tool ein.
      </P>

      <H2>6. Registrierung und Kundenkonto</H2>
      <P>
        Für die Nutzung unserer Anwendung ist die Anlage eines Kundenkontos
        erforderlich. Im Rahmen der Registrierung verarbeiten wir folgende Daten:
      </P>
      <UL>
        <li>Name und E-Mail-Adresse</li>
        <li>Passwort (verschlüsselt gespeichert)</li>
        <li>Firmierung und Unternehmensdaten Ihrer Organisation</li>
        <li>Login- und Nutzungs-Metadaten</li>
      </UL>
      <P>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Die
        Daten werden für die Dauer der Vertragslaufzeit sowie etwaiger
        gesetzlicher Aufbewahrungsfristen gespeichert.
      </P>

      <H3>Authentifizierung und Datenbank (Supabase)</H3>
      <P>
        Für Authentifizierung, Datenbank und Datei-Speicherung nutzen wir die
        Plattform Supabase, betrieben durch die Supabase Inc., 970 Toa Payoh North
        #07-04, Singapur 318992. Sämtliche Daten unserer EU-Kunden werden auf
        Servern in der Europäischen Union (Frankfurt, Deutschland) verarbeitet
        und gespeichert. Mit Supabase haben wir einen Vertrag zur
        Auftragsverarbeitung gemäß Art. 28 DSGVO geschlossen.
      </P>

      <H2>7. Verarbeitung von Strafzettel- und Mieterdaten</H2>
      <P>
        Im Rahmen der Bereitstellung unserer Anwendung verarbeiten wir
        personenbezogene Daten Ihrer Mieter:innen sowie Inhalte von Bußgeld- und
        Anhörungsbescheiden ausschließlich in unserer Rolle als
        Auftragsverarbeiter im Sinne des Art. 28 DSGVO für Sie als
        verantwortliche Stelle. Hierzu schließen wir mit unseren Geschäftskunden
        einen separaten Auftragsverarbeitungsvertrag (AVV).
      </P>
      <P>Verarbeitete Daten umfassen typischerweise:</P>
      <UL>
        <li>Name, Anschrift, Geburtsdatum und Kontaktdaten der Mieter:innen</li>
        <li>Führerschein- und Ausweisdaten (sofern erfasst)</li>
        <li>Buchungs- und Mietvertragsdaten (Fahrzeug, Zeitraum)</li>
        <li>
          Inhalte von Bußgeldbescheiden und Anhörungsbögen (Aktenzeichen,
          Behörde, Tatvorwurf, Bußgeld, Tatort, Tatzeit)
        </li>
      </UL>

      <H3>KI-gestützte Auslesung (Anthropic)</H3>
      <P>
        Zum automatisierten Auslesen von Strafzettel-Dokumenten setzen wir die
        KI-Modelle der Anthropic, PBC, 548 Market Street, PMB 90375, San
        Francisco, CA 94104, USA ein („Claude“). Die hochgeladenen Dokumente
        werden zur Verarbeitung an die API-Schnittstelle von Anthropic übermittelt
        und dort ausschließlich zur Erfüllung der Anfrage verarbeitet.
      </P>
      <P>
        Anthropic verarbeitet API-Daten gemäß seiner Commercial Terms nicht zum
        Training seiner Modelle. Eine Datenübermittlung in die USA erfolgt auf
        Grundlage der EU-US Data Privacy Framework-Zertifizierung von Anthropic
        sowie ergänzender Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
        Mit Anthropic besteht ein Datenverarbeitungsvertrag (Data Processing
        Addendum).
      </P>
      <P>
        Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO
        (Vertragserfüllung gegenüber unseren Geschäftskunden) sowie Art. 28 DSGVO
        (Auftragsverarbeitung).
      </P>

      <H2>8. Kontaktaufnahme per E-Mail</H2>
      <P>
        Wenn Sie uns per E-Mail kontaktieren, werden Ihre Angaben zwecks
        Bearbeitung der Anfrage und für mögliche Anschlussfragen gespeichert.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche oder
        vertragliche Anfragen) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
        Interesse an effizienter Bearbeitung). Diese Daten geben wir nicht ohne
        Ihre Einwilligung weiter.
      </P>

      <H2>9. Zahlungsdienstleister</H2>
      <P>
        Für die Abwicklung kostenpflichtiger Abonnements werden wir künftig den
        Zahlungsdienstleister Stripe Payments Europe Ltd., 1 Grand Canal Street
        Lower, Grand Canal Dock, Dublin, Irland einsetzen. Bei Vertragsabschluss
        werden die Zahlungsdaten direkt an Stripe übermittelt; wir selbst
        speichern keine vollständigen Kreditkartendaten. Es gelten zusätzlich die
        Datenschutzhinweise von Stripe:{" "}
        <a
          href="https://stripe.com/de/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-700 hover:underline"
        >
          stripe.com/de/privacy
        </a>
        .
      </P>

      <H2>10. E-Mail-Versand und -Inbound (Mailgun)</H2>
      <P>
        Für den Versand und Empfang transaktionaler E-Mails nutzen wir den Dienst
        Mailgun der Sinch Email (US Holding) Inc., 112 E Pecan St #1135, San
        Antonio, TX 78205, USA. Übermittelte Daten beschränken sich auf Absender,
        Empfänger, Betreff, Inhalt und Anhänge der E-Mail. Eine Datenübermittlung
        in die USA erfolgt auf Grundlage von Standardvertragsklauseln. Mit
        Mailgun besteht ein Vertrag zur Auftragsverarbeitung.
      </P>

      <H2>11. Empfänger und Auftragsverarbeiter</H2>
      <P>
        Eine Übersicht aller Auftragsverarbeiter und Empfänger personenbezogener
        Daten stellen wir unseren Geschäftskunden im Rahmen des
        Auftragsverarbeitungsvertrags (AVV) zur Verfügung. Diese umfasst
        derzeit:
      </P>
      <UL>
        <li>Vercel Inc. — Hosting</li>
        <li>Supabase Inc. — Datenbank, Authentifizierung, Datei-Speicherung (EU)</li>
        <li>Anthropic, PBC — KI-gestützte Dokumentenanalyse</li>
        <li>Sinch / Mailgun — Transaktionale E-Mails</li>
        <li>Stripe Payments Europe Ltd. — Zahlungsabwicklung (geplant)</li>
      </UL>

      <H2>12. Ihre Rechte als betroffene Person</H2>
      <P>Sie haben uns gegenüber folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:</P>
      <UL>
        <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
        <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
        <li>Recht auf Löschung (Art. 17 DSGVO)</li>
        <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Recht auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>
          Recht auf Widerruf einer erteilten Einwilligung mit Wirkung für die
          Zukunft (Art. 7 Abs. 3 DSGVO)
        </li>
      </UL>
      <P>
        Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
        über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren
        (Art. 77 DSGVO). Zuständige Aufsichtsbehörde für uns ist:
      </P>
      <Address>
        Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)
        <br />
        Promenade 18
        <br />
        91522 Ansbach
        <br />
        Telefon: +49 981 180093-0
        <br />
        E-Mail: poststelle@lda.bayern.de
      </Address>

      <H2>13. Datensicherheit</H2>
      <P>
        Wir treffen technische und organisatorische Sicherheitsmaßnahmen nach
        dem Stand der Technik, um Ihre Daten gegen zufällige oder vorsätzliche
        Manipulation, teilweisen oder vollständigen Verlust, Zerstörung oder
        gegen den unbefugten Zugriff Dritter zu schützen. Dazu gehören
        insbesondere die ausschließliche Nutzung von TLS-verschlüsselten
        Verbindungen (HTTPS), Verschlüsselung gespeicherter Daten („at rest“),
        Zugriffskontrollen sowie regelmäßige Backups.
      </P>

      <H2>14. Aktualität und Änderung dieser Datenschutzerklärung</H2>
      <P>
        Diese Datenschutzerklärung ist aktuell gültig und hat den Stand
        Mai 2026. Durch die Weiterentwicklung unserer Website und Angebote
        oder aufgrund geänderter gesetzlicher beziehungsweise behördlicher
        Vorgaben kann es notwendig werden, diese Datenschutzerklärung zu ändern.
        Die jeweils aktuelle Datenschutzerklärung kann jederzeit auf dieser
        Seite abgerufen werden.
      </P>

      <P>
        <span className="text-stone-500 text-[13.5px]">
          Stand: Mai 2026
        </span>
      </P>
    </LegalShell>
  );
}
