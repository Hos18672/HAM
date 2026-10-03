import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getSettings } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { pageMetadata } from '@/lib/page-meta';
import { isolate } from '@/lib/i18n/format';
import { locales } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { ...(await pageMetadata('privacy', locale, '/privacy')), robots: { index: false } };
}

/**
 * Privacy policy.
 *
 * This text describes what the application actually does — there is no
 * analytics, no tracker and no font CDN anywhere in the codebase, so the
 * policy can say so plainly. Two outside services are named because two are
 * used: the Aladhan prayer-times API, which the *server* calls (`lib/aladhan`),
 * and OpenStreetMap's tiles, which the *reader's browser* fetches on the qibla
 * map (`components/site/qibla-street`) — the only third-party request this
 * site makes from the browser, and the section on location says exactly what
 * reaches them and how to avoid it. If any of that changes, this page has to
 * change with it.
 */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const [header, settings] = await Promise.all([getPageHeader('privacy', typed), getSettings()]);
  if (!header) notFound();

  const de = typed === 'de';
  const contact = settings.contactEmail;

  const sections: { title: string; body: string[] }[] = de
    ? [
        {
          title: 'Verantwortlich',
          body: [
            `Verantwortlich für die Datenverarbeitung auf dieser Website ist der Verein Ansar al-Mahdi (a.j.) – Haus aller Menschen, ${isolate(settings.address)}. Bei Fragen zum Datenschutz erreichen Sie uns unter ${isolate(contact)}.`,
          ],
        },
        {
          title: 'Keine Analyse, kein Tracking',
          body: [
            'Diese Website verwendet keine Analysedienste, keine Werbenetzwerke und keine Tracking-Cookies. Wir binden keine Schriften, Karten, Videos oder Schaltflächen von fremden Servern ein — alle Schriftdateien liegen auf unserem eigenen Server. Deshalb gibt es hier auch keinen Cookie-Banner: es gibt nichts einzuwilligen.',
          ],
        },
        {
          title: 'Cookies',
          body: [
            'Wir setzen zwei technisch notwendige Cookies: eines speichert, ob Sie die helle oder dunkle Darstellung gewählt haben, das andere besteht nur für angemeldete Redaktionsmitglieder während einer Bearbeitungssitzung. Beide enthalten keine personenbezogenen Daten und werden nicht an Dritte übermittelt.',
          ],
        },
        {
          title: 'Kontakt- und Mitgliedsformulare',
          body: [
            'Wenn Sie uns über ein Formular schreiben, speichern wir Ihren Namen, Ihre E-Mail-Adresse, gegebenenfalls Ihre Telefonnummer, Ihr Anliegen und Ihre Nachricht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und lit. f DSGVO: wir brauchen diese Angaben, um Ihre Anfrage zu beantworten.',
            'Zusätzlich speichern wir einen Prüfwert Ihrer IP-Adresse (einen gesalzenen Hash). Die Adresse selbst wird nicht gespeichert. Der Prüfwert dient ausschließlich dazu, massenhaft abgeschickte Formulare zu erkennen.',
            'Aufbewahrungsfrist: Anfragen werden nach der Erledigung archiviert und spätestens nach 24 Monaten gelöscht. Angaben zu einer Mitgliedschaft bewahren wir für die Dauer der Mitgliedschaft und darüber hinaus sieben Jahre auf, soweit steuer- und vereinsrechtliche Aufbewahrungspflichten das verlangen.',
          ],
        },
        {
          title: 'Versand von Benachrichtigungen',
          body: [
            'Zur Zustellung der Formularbenachrichtigungen an unser Postfach nutzen wir den Dienst Resend (Resend, Inc., USA) als Auftragsverarbeiter. Übermittelt werden dabei die Angaben, die Sie im Formular gemacht haben.',
          ],
        },
        {
          title: 'Hosting und Datenbank',
          body: [
            'Die Website wird bei Vercel Inc. gehostet; Datenbank und Bilddateien liegen bei Supabase. Beide verarbeiten Daten in unserem Auftrag. Beim Aufruf einer Seite fallen serverseitige Protokolldaten an (Zeitpunkt, angeforderte Adresse, Browserkennung), die der Betriebssicherheit dienen und kurzfristig gelöscht werden.',
          ],
        },
        {
          title: 'Gebetszeiten',
          body: [
            'Die Gebetszeiten beziehen wir vom Dienst Aladhan (aladhan.com). Die Anfrage stellt unser Server, nicht Ihr Browser: Aladhan erfährt dabei weder Ihre IP-Adresse noch sonst etwas über Sie. Ist der Dienst nicht erreichbar, berechnet unser Server die Zeiten selbst.',
          ],
        },
        {
          title: 'Standort und Kompass',
          body: [
            'Die Qibla-Seite fragt Ihren Browser beim Öffnen nach Ihrem Standort, damit die Gebetsrichtung von dort aus berechnet wird, wo Sie gerade stehen. Diese Berechnung findet ausschließlich in Ihrem Browser statt; Ihr Standort wird weder an uns noch an Dritte übermittelt. Lehnen Sie die Abfrage ab, rechnet die Seite vom Vereinshaus in Hernals aus und sagt Ihnen das.',
            'Die Kartenansicht dieser Seite zeigt Ihre Umgebung mit Kartenkacheln von OpenStreetMap (openstreetmap.org). Diese Bilder lädt Ihr Browser direkt bei deren Server; dabei erfährt OpenStreetMap Ihre IP-Adresse und — aus den angeforderten Kacheln — ungefähr, welchen Ausschnitt der Erde Sie ansehen. Es werden ausschließlich Bilder angefordert: kein Skript, kein Cookie, keine Kennung von uns. Ihre genauen Koordinaten werden nicht übermittelt.',
            'Die Startseite und die Kontaktseite zeigen außerdem eine kleine Karte der Straße rund um das Vereinshaus, aus denselben OpenStreetMap-Kacheln. Sie wird erst geladen, wenn Sie zu ihr scrollen; auch dabei erfährt OpenStreetMap Ihre IP-Adresse, aber nichts über Ihren Standort — gezeigt wird immer derselbe Ausschnitt in Hernals.',
            'Wenn Sie das nicht möchten: Die Ansichten „Mein Standort“ und „Weltkugel“ auf derselben Seite zeigen dieselbe Richtung und werden vollständig aus Daten gezeichnet, die diese Seite selbst mitbringt — dabei verlässt keine einzige Anfrage unseren Server.',
            'Auf der Seite der Gebetszeiten können Sie Ihren Standort ebenfalls freigeben, um die Zeiten für Ihren Aufenthaltsort zu sehen. Dafür sendet Ihr Browser Ihre Koordinaten, auf etwa einen Kilometer gerundet, zusammen mit Ihrer Zeitzone an unseren Server, der damit die Zeiten bei Aladhan abfragt. Die Koordinaten werden nur für diese Abfrage verwendet und weder von uns gespeichert noch mit Ihrer Person verknüpft. Zum Schutz vor Missbrauch zählen wir die Abfragen je Prüfwert Ihrer IP-Adresse (siehe oben) für eine Stunde.',
          ],
        },
        {
          title: 'Ihre Rechte',
          body: [
            'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wenden Sie sich dafür an die oben genannte Adresse.',
            'Wenn Sie der Ansicht sind, dass wir Ihre Daten nicht rechtmäßig verarbeiten, können Sie sich bei der Österreichischen Datenschutzbehörde (Barichgasse 40–42, 1030 Wien) beschweren.',
          ],
        },
      ]
    : [
        {
          title: 'مسئول پردازش داده‌ها',
          body: [
            `مسئول پردازش داده‌ها در این وب‌سایت، انجمن انصار المهدی (عج) — خانهٔ همهٔ انسان‌ها، ${isolate(settings.address)} است. برای پرسش‌های مربوط به حریم خصوصی با ${isolate(contact)} تماس بگیرید.`,
          ],
        },
        {
          title: 'بدون تحلیل آماری و بدون ردیابی',
          body: [
            'این وب‌سایت از هیچ سرویس تحلیل آماری، شبکهٔ تبلیغاتی یا کوکی ردیابی استفاده نمی‌کند. هیچ قلم، نقشه، ویدیو یا دکمه‌ای از سرورهای بیرونی بارگذاری نمی‌شود — همهٔ فایل‌های قلم روی سرور خود ما قرار دارند. به همین دلیل نوار پذیرش کوکی هم وجود ندارد: چیزی برای رضایت دادن نیست.',
          ],
        },
        {
          title: 'کوکی‌ها',
          body: [
            'ما تنها دو کوکی فنی لازم به کار می‌بریم: یکی حالت روشن یا تیرهٔ انتخابی شما را نگه می‌دارد و دیگری فقط برای اعضای مدیریت در هنگام ویرایش سایت وجود دارد. هیچ‌کدام دادهٔ شخصی ندارند و به کسی داده نمی‌شوند.',
          ],
        },
        {
          title: 'فرم‌های تماس و عضویت',
          body: [
            'اگر از راه فرم برای ما بنویسید، نام، نشانی رایانامه، در صورت لزوم شمارهٔ تلفن، موضوع و متن پیام شما را ذخیره می‌کنیم. مبنای قانونی مادهٔ ۶ بند ۱ (ب) و (و) مقررات عمومی حفاظت داده‌هاست: این اطلاعات را برای پاسخ دادن به شما لازم داریم.',
            'افزون بر آن، یک مقدار کنترلی از نشانی IP شما (هش نمک‌زده) را نگه می‌داریم. خود نشانی ذخیره نمی‌شود. این مقدار تنها برای تشخیص ارسال انبوه فرم به کار می‌رود.',
            'مدت نگهداری: پرسش‌ها پس از رسیدگی بایگانی و حداکثر پس از ۲۴ ماه حذف می‌شوند. اطلاعات مربوط به عضویت تا پایان عضویت و پس از آن هفت سال نگهداری می‌شود، تا جایی که قوانین مالیاتی و انجمنی ایجاب می‌کنند.',
          ],
        },
        {
          title: 'ارسال اعلان‌ها',
          body: [
            'برای رساندن اعلان فرم‌ها به صندوق پستی خود از سرویس Resend (شرکت Resend در آمریکا) به عنوان پردازشگر استفاده می‌کنیم. آنچه در فرم نوشته‌اید به این سرویس منتقل می‌شود.',
          ],
        },
        {
          title: 'میزبانی و پایگاه داده',
          body: [
            'وب‌سایت روی Vercel میزبانی می‌شود و پایگاه داده و تصاویر نزد Supabase قرار دارند. هر دو به سفارش ما داده‌ها را پردازش می‌کنند. هنگام بازدید از هر صفحه، داده‌های ثبت سرور (زمان، نشانی درخواست‌شده، شناسهٔ مرورگر) پدید می‌آید که برای امنیت کارکرد لازم است و در کوتاه‌مدت پاک می‌شود.',
          ],
        },
        {
          title: 'اوقات شرعی',
          body: [
            'اوقات شرعی را از سرویس Aladhan (aladhan.com) می‌گیریم. این درخواست را سرور ما می‌فرستد، نه مرورگر شما: Aladhan نه نشانی IP شما را می‌بیند و نه چیز دیگری دربارهٔ شما. اگر این سرویس در دسترس نباشد، سرور ما خود اوقات را محاسبه می‌کند.',
          ],
        },
        {
          title: 'موقعیت مکانی و قطب‌نما',
          body: [
            'صفحهٔ قبله هنگام باز شدن از مرورگر شما موقعیتتان را می‌پرسد تا جهت قبله از همان‌جا که ایستاده‌اید محاسبه شود. این محاسبه تنها در مرورگر شما انجام می‌گیرد و موقعیت شما نه به ما و نه به کسی دیگر فرستاده می‌شود. اگر نپذیرید، صفحه از خانهٔ انجمن در هرنالس حساب می‌کند و همین را به شما می‌گوید.',
            'نمای نقشهٔ این صفحه محیط اطراف شما را با کاشی‌های نقشهٔ OpenStreetMap (openstreetmap.org) نشان می‌دهد. این تصویرها را مرورگر شما مستقیم از سرور آنان می‌گیرد و در این میان OpenStreetMap نشانی IP شما و — از روی کاشی‌های درخواستی — تقریباً محدوده‌ای را که می‌بینید می‌داند. تنها تصویر درخواست می‌شود: نه اسکریپتی، نه کوکی‌ای و نه شناسه‌ای از سوی ما. مختصات دقیق شما فرستاده نمی‌شود.',
            'صفحهٔ نخست و صفحهٔ تماس هم نقشهٔ کوچکی از خیابان پیرامون خانهٔ انجمن نشان می‌دهند که از همان کاشی‌های OpenStreetMap ساخته می‌شود. این نقشه تنها وقتی بار می‌شود که به آن برسید؛ در این حالت هم OpenStreetMap نشانی IP شما را می‌بیند اما چیزی دربارهٔ موقعیت شما نمی‌داند — همیشه همان بخش از هرنالس نشان داده می‌شود.',
            'اگر این را نمی‌خواهید: نماهای «موقعیت من» و «کرهٔ زمین» در همان صفحه همان جهت را نشان می‌دهند و تماماً از داده‌هایی رسم می‌شوند که خود این صفحه همراه دارد؛ در آن حالت هیچ درخواستی بیرون نمی‌رود.',
            'در صفحهٔ اوقات شرعی نیز می‌توانید موقعیت خود را در اختیار بگذارید تا اوقات محل خود را ببینید. برای این کار مرورگر شما مختصات شما را، گردشده تا حدود یک کیلومتر، همراه با منطقهٔ زمانی‌تان به سرور ما می‌فرستد و سرور با آن اوقات را از Aladhan می‌پرسد. این مختصات تنها برای همین درخواست به کار می‌رود، نزد ما ذخیره نمی‌شود و به شخص شما پیوند نمی‌خورد. برای جلوگیری از سوءاستفاده، شمار درخواست‌ها را بر پایهٔ مقدار کنترلی نشانی IP شما (بالا را ببینید) برای یک ساعت می‌شماریم.',
          ],
        },
        {
          title: 'حقوق شما',
          body: [
            'شما حق دسترسی، اصلاح، حذف، محدود کردن پردازش، انتقال داده و اعتراض دارید. برای این کار با نشانی بالا تماس بگیرید.',
            'اگر بر این باورید که داده‌های شما را به‌درستی پردازش نمی‌کنیم، می‌توانید به مرجع حفاظت داده‌های اتریش (Barichgasse 40–42, 1030 Wien) شکایت کنید.',
          ],
        },
      ];

  return (
    <>
      <PageHead header={header} locale={typed} />
      <section className="section" data-rise>
        <div className="page">
          <div className="prose" style={{ maxInlineSize: 'var(--measure)' }}>
            {sections.map((section) => (
              <section key={section.title} style={{ marginBlockEnd: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)', marginBlockEnd: 'var(--space-2)' }}>
                  {section.title}
                </h2>
                {section.body.map((paragraph, index) => (
                  <p key={index} style={{ marginBlockEnd: 'var(--space-2)' }}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
