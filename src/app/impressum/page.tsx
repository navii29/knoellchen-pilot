import type { Metadata } from "next";
import {
  LegalShell,
  H2,
  H3,
  P,
  Address,
  Placeholder,
} from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Impressum — Knöllchen-Pilot",
  description:
    "Impressum und Anbieterkennzeichnung gemäß § 5 TMG für Knöllchen-Pilot, betrieben von der Southern Phoenix GmbH.",
};

export default function ImpressumPage() {
  return (
    <LegalShell
      title="Impressum"
      subtitle="Anbieterkennzeichnung gemäß § 5 TMG und § 18 Abs. 2 MStV."
    >
      <H2>Anbieter</H2>
      <Address>
        Southern Phoenix GmbH
        <br />
        Steinmetzstr. 2
        <br />
        86165 Augsburg
        <br />
        Deutschland
      </Address>

      <H3>Vertretungsberechtigte:r Geschäftsführer:in</H3>
      <P>Amir Alipour</P>

      <H3>Kontakt</H3>
      <P>
        Telefon: <Placeholder>[Telefonnummer wird ergänzt]</Placeholder>
        <br />
        E-Mail:{" "}
        <a
          href="mailto:kontakt@knoellchen-pilot.de"
          className="text-teal-700 hover:underline"
        >
          kontakt@knoellchen-pilot.de
        </a>
      </P>

      <H3>Registereintrag</H3>
      <P>
        Eintragung im Handelsregister
        <br />
        Registergericht: Amtsgericht Augsburg
        <br />
        Registernummer: HRB 29164
      </P>

      <H3>Umsatzsteuer-Identifikationsnummer</H3>
      <P>
        Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:{" "}
        <Placeholder>[DE… wird ergänzt]</Placeholder>
      </P>

      <H2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</H2>
      <Address>
        Amir Alipour
        <br />
        Southern Phoenix GmbH
        <br />
        Steinmetzstr. 2
        <br />
        86165 Augsburg
      </Address>

      <H2>EU-Streitschlichtung</H2>
      <P>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung
        (OS) bereit:{" "}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-700 hover:underline"
        >
          https://ec.europa.eu/consumers/odr/
        </a>
        . Unsere E-Mail-Adresse finden Sie oben im Impressum.
      </P>

      <H2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</H2>
      <P>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
        einer Verbraucherschlichtungsstelle teilzunehmen.
      </P>

      <H2>Haftung für Inhalte</H2>
      <P>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf
        diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis
        10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
        oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
        zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </P>
      <P>
        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen
        nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
        diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer
        konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
        Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
      </P>

      <H2>Haftung für Links</H2>
      <P>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden
        Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
        Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
        verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung
        auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
        Zeitpunkt der Verlinkung nicht erkennbar.
      </P>
      <P>
        Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch
        ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
        Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
        entfernen.
      </P>

      <H2>Urheberrecht</H2>
      <P>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
        Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen
        des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
        Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den
        privaten, nicht kommerziellen Gebrauch gestattet.
      </P>
      <P>
        Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden,
        werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
        Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
        Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
        entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden
        wir derartige Inhalte umgehend entfernen.
      </P>

      <P>
        <span className="text-stone-500 text-[13.5px]">
          Stand: Mai 2026
        </span>
      </P>
    </LegalShell>
  );
}
