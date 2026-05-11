import type { Metadata } from "next";
import {
  Address,
  LegalShell,
  NumberedH2,
  P,
} from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Impressum — Knöllchen-Pilot",
  description:
    "Impressum und Anbieterkennzeichnung gemäß § 5 DDG für Knöllchen-Pilot, eine Marke der Southern Phoenix GmbH.",
};

export default function ImpressumPage() {
  return (
    <LegalShell
      title="Impressum"
      subtitle="Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG). Knöllchen-Pilot ist eine Marke der Southern Phoenix GmbH."
    >
      <NumberedH2 number="01">Diensteanbieter</NumberedH2>
      <Address>
        Southern Phoenix GmbH
        <br />
        Steinmetzstr. 2
        <br />
        86165 Augsburg
        <br />
        Deutschland
      </Address>

      <NumberedH2 number="02">Vertreten durch</NumberedH2>
      <P>Geschäftsführer: Amir Alipour</P>

      <NumberedH2 number="03">Kontakt</NumberedH2>
      <P>
        E-Mail:{" "}
        <a
          href="mailto:kontakt@knoellchen-pilot.de"
          className="text-teal-700 hover:underline"
        >
          kontakt@knoellchen-pilot.de
        </a>
        <br />
        Telefon Deutschland: +49 176 11 22 33 86
        <br />
        Telefon Istanbul: +90 507 499 31 31
      </P>

      <NumberedH2 number="04">Registereintrag</NumberedH2>
      <P>
        Eingetragen im Handelsregister.
        <br />
        Registergericht: Amtsgericht Augsburg
        <br />
        Registernummer: HRB 29164
      </P>

      <NumberedH2 number="05">Umsatzsteuer</NumberedH2>
      <P>
        Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:
        <br />
        DE298851268
      </P>

      <NumberedH2 number="06">
        Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV
      </NumberedH2>
      <Address>
        Amir Alipour
        <br />
        Steinmetzstr. 2
        <br />
        86165 Augsburg
        <br />
        Deutschland
      </Address>

      <NumberedH2 number="07">Verbraucherstreitbeilegung</NumberedH2>
      <P>
        Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </P>

      <NumberedH2 number="08">Haftung für Inhalte</NumberedH2>
      <P>
        Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die
        Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir
        jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7
        Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen
        Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
        Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
        gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
        forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </P>

      <NumberedH2 number="09">Haftung für Links</NumberedH2>
      <P>
        Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf
        deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
        fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
        verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
        Seiten verantwortlich.
      </P>

      <NumberedH2 number="10">Urheberrecht</NumberedH2>
      <P>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
        Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
        Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
        jeweiligen Autors bzw. Erstellers.
      </P>

      <P>
        <span className="text-stone-500 text-[13.5px]">Stand: Mai 2026</span>
      </P>
    </LegalShell>
  );
}
