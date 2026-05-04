import type { Metadata } from "next";
import {
  LegalShell,
  H2,
  P,
  UL,
} from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "AGB — Knöllchen-Pilot",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung der SaaS-Anwendung Knöllchen-Pilot der Southern Phoenix GmbH.",
};

export default function AGBPage() {
  return (
    <LegalShell
      title="Allgemeine Geschäfts­bedingungen"
      subtitle="Diese AGB gelten für alle Verträge zwischen der Southern Phoenix GmbH und ihren Geschäftskunden über die Nutzung der SaaS-Anwendung Knöllchen-Pilot."
    >
      <H2>§ 1 Geltungsbereich, Vertragspartner</H2>
      <P>
        (1) Diese Allgemeinen Geschäftsbedingungen („AGB“) gelten für alle
        Verträge zwischen der Southern Phoenix GmbH, Steinmetzstr. 2, 86165
        Augsburg, eingetragen im Handelsregister des Amtsgerichts Augsburg unter
        HRB 29164 („Anbieter“) und ihren Kunden („Kunde“) über die Nutzung der
        Software-as-a-Service-Anwendung Knöllchen-Pilot („Anwendung“) sowie
        damit verbundener Leistungen.
      </P>
      <P>
        (2) Das Angebot des Anbieters richtet sich ausschließlich an Unternehmer
        im Sinne des § 14 BGB, juristische Personen des öffentlichen Rechts und
        öffentlich-rechtliche Sondervermögen. Verbraucher im Sinne des § 13 BGB
        sind von der Nutzung ausgeschlossen.
      </P>
      <P>
        (3) Abweichende, entgegenstehende oder ergänzende Allgemeine
        Geschäftsbedingungen des Kunden werden nicht Vertragsbestandteil, es sei
        denn, ihrer Geltung wird ausdrücklich schriftlich zugestimmt.
      </P>

      <H2>§ 2 Vertragsgegenstand und Leistungsumfang</H2>
      <P>
        (1) Der Anbieter stellt dem Kunden die Anwendung Knöllchen-Pilot über das
        Internet als Software-as-a-Service zur Nutzung bereit. Der konkrete
        Leistungsumfang ergibt sich aus der jeweils gewählten Tarifstufe
        (Starter, Professional, Enterprise) und der zugehörigen Leistungs-
        beschreibung auf der Website des Anbieters zum Zeitpunkt des
        Vertragsschlusses.
      </P>
      <P>
        (2) Die Anwendung dient insbesondere der Verwaltung von Mietverträgen,
        Fahrzeugen und Kunden sowie der automatisierten Verarbeitung von
        Bußgeld- und Anhörungsbescheiden mittels künstlicher Intelligenz.
      </P>
      <P>
        (3) Der Anbieter ist berechtigt, die Anwendung weiterzuentwickeln und
        Funktionen anzupassen, soweit dies dem Kunden zumutbar ist und der
        vereinbarte Leistungsumfang im Wesentlichen erhalten bleibt.
      </P>

      <H2>§ 3 Vertragsschluss, Testphase</H2>
      <P>
        (1) Die Darstellung der Tarife auf der Website stellt kein bindendes
        Angebot dar. Mit Absenden des Registrierungsformulars gibt der Kunde ein
        verbindliches Angebot zum Abschluss eines Nutzungsvertrags ab. Der
        Anbieter nimmt das Angebot durch Freischaltung des Zugangs an.
      </P>
      <P>
        (2) Der Anbieter kann eine kostenlose Testphase anbieten. Diese endet
        automatisch nach Ablauf des angegebenen Zeitraums, ohne dass es einer
        Kündigung bedarf, sofern der Kunde nicht zuvor einen kostenpflichtigen
        Tarif bucht.
      </P>

      <H2>§ 4 Verfügbarkeit, Service Level</H2>
      <P>
        (1) Der Anbieter stellt die Anwendung mit einer Verfügbarkeit von 99,0 %
        im Jahresmittel zur Verfügung. Im Tarif Enterprise gilt eine
        Verfügbarkeit von 99,9 % im Jahresmittel.
      </P>
      <P>
        (2) Nicht in die Verfügbarkeit einberechnet werden geplante
        Wartungsarbeiten, höhere Gewalt sowie Ausfälle, die der Anbieter nicht
        zu vertreten hat (z. B. Ausfälle bei Vorleistungserbringern, Internet-
        Provider-Ausfälle, DDoS-Angriffe).
      </P>
      <P>
        (3) Geplante Wartungsarbeiten kündigt der Anbieter mit einer Frist von
        mindestens 48 Stunden in geeigneter Weise (z. B. per E-Mail oder
        In-App-Mitteilung) an.
      </P>

      <H2>§ 5 Pflichten des Kunden</H2>
      <P>(1) Der Kunde verpflichtet sich:</P>
      <UL>
        <li>
          Zugangsdaten geheim zu halten und vor unbefugtem Zugriff Dritter zu
          schützen;
        </li>
        <li>
          die Anwendung nicht missbräuchlich zu nutzen, insbesondere keine
          rechtswidrigen Inhalte hochzuladen;
        </li>
        <li>
          sicherzustellen, dass er zur Verarbeitung der durch ihn in die
          Anwendung eingespielten personenbezogenen Daten datenschutzrechtlich
          berechtigt ist und die betroffenen Personen ordnungsgemäß informiert
          hat;
        </li>
        <li>
          regelmäßig eigene Sicherungskopien seiner für ihn relevanten Daten
          anzufertigen, soweit dies aus eigenen Compliance-Gründen erforderlich
          ist;
        </li>
        <li>
          dem Anbieter Mängel der Anwendung unverzüglich nach Kenntnisnahme in
          Textform anzuzeigen.
        </li>
      </UL>
      <P>
        (2) Der Kunde stellt den Anbieter von Ansprüchen Dritter frei, die auf
        einer rechtswidrigen Nutzung der Anwendung durch den Kunden oder auf
        einer Verletzung dieser AGB beruhen, einschließlich angemessener Kosten
        der Rechtsverteidigung.
      </P>

      <H2>§ 6 Preise und Zahlung</H2>
      <P>
        (1) Es gelten die im Zeitpunkt des Vertragsschlusses auf der Website
        ausgewiesenen Preise. Sämtliche Preise verstehen sich zuzüglich der
        jeweils gesetzlich geltenden Umsatzsteuer.
      </P>
      <P>
        (2) Die Vergütung wird monatlich im Voraus fällig. Die Abrechnung
        erfolgt im Lastschrift- oder Kartenverfahren über den jeweiligen
        Zahlungsdienstleister (z. B. Stripe).
      </P>
      <P>
        (3) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zur
        Anwendung nach vorheriger Mahnung mit angemessener Fristsetzung zu
        sperren. Weitergehende gesetzliche Rechte bleiben unberührt.
      </P>
      <P>
        (4) Preisanpassungen werden dem Kunden mit einer Frist von mindestens
        sechs Wochen vor Inkrafttreten in Textform angekündigt. Der Kunde hat
        das Recht, den Vertrag zum Zeitpunkt des Inkrafttretens der
        Preisanpassung zu kündigen.
      </P>

      <H2>§ 7 Laufzeit und Kündigung</H2>
      <P>
        (1) Der Vertrag wird auf unbestimmte Zeit geschlossen und kann von
        beiden Seiten mit einer Frist von einem Monat zum Ende eines
        Abrechnungszeitraums in Textform gekündigt werden, sofern nicht im
        Einzelvertrag eine abweichende Laufzeit vereinbart ist.
      </P>
      <P>
        (2) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt
        unberührt. Ein wichtiger Grund liegt für den Anbieter insbesondere
        dann vor, wenn der Kunde mit der Zahlung von Vergütungen in Höhe von
        zwei Monatsbeiträgen in Verzug ist oder die Anwendung erheblich
        missbraucht.
      </P>
      <P>
        (3) Nach Vertragsende werden die Daten des Kunden 30 Tage zur
        Datenmitnahme bereitgehalten und anschließend unwiderruflich gelöscht,
        soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
      </P>

      <H2>§ 8 Datenschutz und Auftragsverarbeitung</H2>
      <P>
        (1) Soweit der Anbieter im Rahmen der Bereitstellung der Anwendung
        personenbezogene Daten im Auftrag des Kunden verarbeitet, schließen die
        Parteien einen separaten Vertrag zur Auftragsverarbeitung gemäß
        Art. 28 DSGVO ab. Der Anbieter stellt hierfür einen entsprechenden
        Vertragsentwurf bereit.
      </P>
      <P>
        (2) Im Übrigen gelten die Datenschutzhinweise des Anbieters, abrufbar
        unter{" "}
        <a href="/datenschutz" className="text-teal-700 hover:underline">
          knoellchen-pilot.de/datenschutz
        </a>
        .
      </P>

      <H2>§ 9 Gewährleistung</H2>
      <P>
        (1) Der Anbieter gewährleistet die im Vertrag vereinbarte
        Beschaffenheit der Anwendung. Der Anbieter weist ausdrücklich darauf
        hin, dass nach dem Stand der Technik eine durchgehend fehlerfreie
        Bereitstellung von Software nicht möglich ist.
      </P>
      <P>
        (2) Soweit die Anwendung KI-gestützte Funktionen (insbesondere die
        automatisierte Auslesung von Bußgeldbescheiden) bereitstellt, schuldet
        der Anbieter keine bestimmte inhaltliche Richtigkeit der durch die KI
        erzeugten Ergebnisse. Der Kunde ist verpflichtet, die Ergebnisse vor
        weiterer Verwendung — insbesondere vor Versendung an Behörden,
        Mieter:innen oder Dritte — auf Plausibilität und Richtigkeit zu prüfen.
      </P>
      <P>
        (3) Mängelrechte bestehen nicht bei nur unerheblicher Abweichung von
        der vereinbarten Beschaffenheit oder bei Mängeln, die durch
        unsachgemäße Nutzung des Kunden verursacht wurden.
      </P>

      <H2>§ 10 Haftung</H2>
      <P>
        (1) Der Anbieter haftet uneingeschränkt für Schäden aus der Verletzung
        des Lebens, des Körpers oder der Gesundheit, die auf einer fahrlässigen
        oder vorsätzlichen Pflichtverletzung des Anbieters, seiner gesetzlichen
        Vertreter oder Erfüllungsgehilfen beruhen, sowie für Schäden, die von
        der Haftung nach dem Produkthaftungsgesetz umfasst werden, sowie für
        alle Schäden, die auf vorsätzlichen oder grob fahrlässigen
        Vertragsverletzungen sowie Arglist des Anbieters, seiner gesetzlichen
        Vertreter oder Erfüllungsgehilfen beruhen.
      </P>
      <P>
        (2) Der Anbieter haftet auch für Schäden, die durch einfache
        Fahrlässigkeit verursacht werden, soweit diese auf der Verletzung
        solcher Vertragspflichten beruhen, deren Einhaltung für die Erreichung
        des Vertragszwecks von besonderer Bedeutung ist (Kardinalpflichten). In
        diesem Fall haftet der Anbieter jedoch nur, soweit die Schäden
        typischerweise mit dem Vertrag verbunden und vorhersehbar sind.
      </P>
      <P>
        (3) Im Übrigen ist die Haftung — gleich aus welchem Rechtsgrund —
        ausgeschlossen. Dies gilt insbesondere für Schäden aus der Nutzung
        oder Nicht-Nutzung der durch die KI erzeugten Ergebnisse, soweit der
        Kunde seiner Prüfpflicht nach § 9 Abs. 2 nicht nachgekommen ist.
      </P>
      <P>
        (4) Die Haftung des Anbieters für einfache Fahrlässigkeit ist der Höhe
        nach begrenzt auf den vom Kunden in den letzten zwölf Monaten vor dem
        schadensauslösenden Ereignis tatsächlich gezahlten Nettoentgelt.
      </P>
      <P>
        (5) Die vorstehenden Haftungsbeschränkungen gelten auch zugunsten der
        gesetzlichen Vertreter, Mitarbeiter und Erfüllungsgehilfen des
        Anbieters.
      </P>

      <H2>§ 11 Geheimhaltung</H2>
      <P>
        Die Parteien verpflichten sich, alle ihnen im Rahmen der
        Vertragsdurchführung bekannt werdenden vertraulichen Informationen der
        jeweils anderen Partei vertraulich zu behandeln und Dritten nicht
        zugänglich zu machen, soweit nicht eine gesetzliche Offenlegungspflicht
        besteht. Diese Verpflichtung gilt auch für die Dauer von drei Jahren
        nach Vertragsende.
      </P>

      <H2>§ 12 Änderung dieser AGB</H2>
      <P>
        (1) Der Anbieter behält sich vor, diese AGB anzupassen, soweit dies aus
        triftigen Gründen, insbesondere aufgrund einer geänderten Rechtslage,
        höchstrichterlicher Rechtsprechung, technischer Änderungen oder einer
        Erweiterung des Leistungsangebots, erforderlich wird.
      </P>
      <P>
        (2) Änderungen werden dem Kunden mindestens sechs Wochen vor
        Inkrafttreten in Textform angekündigt. Widerspricht der Kunde nicht
        innerhalb von vier Wochen nach Zugang der Änderungsmitteilung, gelten
        die Änderungen als genehmigt. Auf diese Folge wird der Kunde in der
        Mitteilung gesondert hingewiesen.
      </P>

      <H2>§ 13 Schlussbestimmungen</H2>
      <P>
        (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss
        des UN-Kaufrechts.
      </P>
      <P>
        (2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im
        Zusammenhang mit diesem Vertrag ist Augsburg, sofern der Kunde
        Kaufmann, juristische Person des öffentlichen Rechts oder
        öffentlich-rechtliches Sondervermögen ist.
      </P>
      <P>
        (3) Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurch-
        führbar sein oder werden, so wird hiervon die Wirksamkeit der übrigen
        Bestimmungen nicht berührt. An die Stelle der unwirksamen oder undurch-
        führbaren Bestimmung tritt die gesetzliche Regelung.
      </P>

      <P>
        <span className="text-stone-500 text-[13.5px]">
          Stand: Mai 2026
        </span>
      </P>
    </LegalShell>
  );
}
