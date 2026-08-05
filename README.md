# ISMS Portál – CDV (React)

React implementace návrhu **„ISMS Portal.dc.html"** z Claude Design projektu
*ISO 27001 security system*. Vygenerováno jako Vite + React 19 projekt.

## Spuštění

```bash
npm install
npm run dev      # vývojový server
npm run build    # produkční build do dist/
```

## Struktura

```
src/
  main.jsx              vstupní bod (mount + globální styly)
  App.jsx               stav aktivní sekce, layout
  data.js               data všech sekcí (v produkci nahradí API)
  lib/status.js         mapování stavů na badge varianty a barvy
  styles/tokens.css     design tokeny (gov.cz design systém)
  styles/portal.css     layout a vzhled komponent
  components/
    Header.jsx          hlavička s logem a uživatelem
    Sidebar.jsx         postranní navigace
    Footer.jsx          patička
    Badge.jsx           gov.cz badge (default/success/warning/alert/neutral)
    Button.jsx          primární tlačítko
    ProgressBar.jsx     ukazatel průběhu
    Accordion.jsx       akordeon (FAQ)
    PageHeader.jsx      titulek sekce s akčním tlačítkem
    LionLogo.jsx        zjednodušený znak (nahradit oficiálním logem)
  sections/
    Dashboard.jsx       Přehled – KPI, upozornění, shoda domén, termíny
    Controls.jsx        Přílohy A – katalog opatření
    Risks.jsx           Registr rizik
    Policies.jsx        Knihovna dokumentů
    Audits.jsx          Audity a nápravná opatření (CAPA)
    Changes.jsx         Řízení změn (ITIL, A.8.32)
    Incidents.jsx       Řízení incidentů bezpečnosti informací (ITIL, A.5.24–A.5.30)
    Training.jsx        Školení a povědomí + FAQ (vč. interaktivního kvízu)
    AuditLog.jsx        Auditní stopa – historie změn (jen manažer)
    Users.jsx           Správa uživatelů – účty, role, (de)aktivace (jen manažer)
```

## Přihlašování a role

Aplikace vyžaduje přihlášení (session cookie z API). Vývojové účty:
`j.kovarova / Isms.2026` (manažer — vše), `p.dvorak / Editor.2026`
(editor — přidává a upravuje), `zamestnanec / Cdv.2026` (čtenář — jen prohlíží).
UI skrývá akce, na které role nemá právo; server je vynucuje nezávisle (401/403).

## Napojení na API

Aplikace čte a zapisuje data přes REST API (`../isms-api`, výchozí adresa
`http://localhost:3001`; lze přepsat proměnnou `VITE_API_URL`). Před spuštěním
frontendu musí běžet API server (`cd ../isms-api && npm run dev`).

- **Dashboard** – vše počítá server živě z databáze (`GET /api/dashboard`):
  shoda domén, otevřená rizika, zjištění po termínu i upozornění.
- **Exportovat SoA** (Přílohy A) – stáhne XLSX generovaný serverem
  (`GET /api/controls/export.xlsx`); sloupec „Odpovědná osoba" má v Excelu
  rozbalovací seznam se stejným číselníkem vlastníků jako formuláře v portálu.
- **Přidat riziko** – `POST /api/risks`; skóre a úroveň počítá server.
- **Nahrát dokument** – `POST /api/policies` jako `multipart/form-data` (soubor + metadata);
  vznikne se stavem „Návrh". Úprava dokumentu umožňuje soubor volitelně nahradit;
  karta dokumentu nabízí odkaz na stažení (`GET /api/policies/:id/file`).
- **Nové zjištění** – `POST /api/findings`; vznikne se stavem „Nové".
- **Řízení změn / incidentů** – `POST /api/changes` a `POST /api/incidents`;
  formulář nabízí volitelnou vazbu na konkrétní opatření přílohy A nebo riziko
  (výběr ze skutečných záznamů přes `GET /api/controls` / `GET /api/risks`).
- **Školení – kvíz** – tlačítko „Spustit školení" (jen u školení s obsahem,
  `hasQuiz: true`, a jen pokud je uživatel v jeho cílové skupině — jinak
  se školení v seznamu vůbec neobjeví) načte otázky (`GET
  /api/trainings/:id/quiz`, bez správných odpovědí), po odeslání (`POST
  /api/trainings/:id/complete`) zobrazí skóre a průběžně se promítne do
  stavu „Vy: …" i do live počítané `pct`.
- **Školení – administrace** (jen manažer) – tlačítko „Nové školení" otevře
  editor kvízu: dynamické přidávání/odebírání otázek i možností, rádio pro
  správnou odpověď, a zaškrtávací **cílová skupina podle role** (Čtenáři /
  Editoři / Manažeři — nahrazuje dřívější volný text, viditelnost i `pct`
  se pak počítají jen vůči zaškrtnutým rolím). Úprava existujícího školení
  nejdřív natáhne plný obsah vč. správných odpovědí a `targetRoles` (`GET
  /api/trainings/:id`, na rozdíl od `.../quiz` určeného k absolvování).
  „Výsledky uživatelů" zobrazí roster (`GET .../completions`) se stavem/
  skóre uživatelů v cílové skupině; manažer v administraci vidí a spravuje
  všechna školení bez ohledu na to, komu jsou určená.
- **Auditní stopa** – `GET /api/audit-log` (jen manažer, nav položka je pro
  ostatní role skrytá); u úprav zobrazuje diff změněných polí.
- **Uživatelé** (jen manažer) – vytváření účtů a reset hesel (`POST`/`PUT
  /api/users`), změna role, (de)aktivace tlačítkem „Aktivovat"/„Deaktivovat"
  (ne mazání — účty se v API nemažou). Vlastní řádek přihlášeného manažera
  tlačítko (de)aktivace nezobrazuje (nejde deaktivovat sám sebe); server
  navíc hlídá, aby nezůstal portál bez jediného aktivního manažera.

Stavy načítání a chyb řeší komponenta `DataState` (s tlačítkem „Zkusit znovu").

## Poznámky

- Komponenty Badge/Button/Accordion jsou napsané ručně nad tokeny podkladového
  gov.cz Figma kitu (bundle design systému nebylo možné stáhnout celý —
  limit 256 KiB na soubor).
- Stejná statická verze bez build kroku je ve složce `../isms-portal`.
