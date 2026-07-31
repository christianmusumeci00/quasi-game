# QUASI!

Un gioco web di precisione, stima, memoria e riflessi. Ogni partita seleziona 10 mini-sfide senza ripetizioni da un pool di 200 e produce una carta risultato condivisibile.

## Caratteristiche

- 200 mini-sfide in 16 famiglie, tutte giocabili con mouse e touch
- 10 meccaniche sempre diverse in ogni partita, con rotazione anti-ripetizione fra partite consecutive
- modalità Giocatore singolo, Sfida realtime tramite link e Allenamento libero
- stanze realtime private con presenza online, risultati del gruppo e rivincita senza un nuovo link
- profilo anonimo, classifica mondiale generale e record mondiali per ciascuno dei 200 livelli
- catalogo di allenamento con ricerca, filtri per famiglia e record locale per ciascuno dei 200 livelli
- conto alla rovescia di 5 secondi prima delle prove ad avvio automatico
- punteggio di accuratezza 0–100 e grado arcade da E a S+
- feedback immediato dopo ogni prova
- carta risultato generata interamente nel browser con Canvas
- condivisione tramite Web Share API e download PNG come fallback
- miglior punteggio e preferenza audio salvati in `localStorage`
- interfaccia responsive, navigabile anche da tastiera
- safe area, controlli e gesture ottimizzati per iPhone, Android e tablet
- nessun framework e nessuna build: frontend statico compatibile con GitHub Pages
- Supabase opzionale per realtime e classifica; il gioco singolo e l’allenamento restano disponibili anche offline

## Avvio in locale

Il progetto non richiede installazione né compilazione. Dalla cartella del repository avvia un server statico, per esempio:

```bash
python3 -m http.server 8080
```

Poi apri [http://localhost:8080](http://localhost:8080).

In alternativa, con Node.js:

```bash
npx serve .
```

> È consigliato un server HTTP invece dell'apertura diretta di `index.html`, perché il codice JavaScript usa moduli ES.

## Pubblicazione su GitHub Pages

1. Crea un repository GitHub e carica nella sua root tutti i file del progetto.
2. Apri **Settings → Pages** nel repository.
3. In **Build and deployment**, scegli **Deploy from a branch**.
4. Seleziona il branch `main`, cartella `/(root)`, quindi premi **Save**.
5. Dopo il primo deploy, GitHub mostrerà l'indirizzo pubblico nella stessa pagina.

Non serve configurare GitHub Actions. Il file `.nojekyll` fa pubblicare i file statici senza elaborazione Jekyll.

## Attivazione Supabase

Il frontend resta completamente statico. Supabase aggiunge accesso anonimo, stanze realtime private e classifica mondiale senza esporre segreti nel repository.

1. crea un progetto Supabase;
2. abilita gli accessi anonimi;
3. esegui [`supabase/schema.sql`](supabase/schema.sql) nel SQL Editor;
4. inserisci Project URL e **Publishable key** in [`js/supabase-config.js`](js/supabase-config.js);
5. pubblica su GitHub Pages e prova la stessa sfida da due dispositivi.

La procedura dettagliata e le impostazioni di sicurezza sono in [`supabase/SETUP.md`](supabase/SETUP.md). Non inserire mai nel frontend la chiave `service_role` o una Secret key.

## Struttura

```text
.
├── index.html          # struttura e schermate dell'app
├── styles.css          # identità visiva e layout responsive
├── js/
│   ├── app.js          # motore di gioco, input, scoring e carta finale
│   ├── challenge-mode.js # codifica link e casualità condivisa delle sfide
│   ├── challenges.js   # catalogo delle 200 mini-sfide
│   ├── online.js       # profilo, realtime, rivincite e classifica
│   └── supabase-config.js # sole chiavi pubbliche del progetto Supabase
├── supabase/
│   ├── schema.sql      # tabelle, funzioni, RLS e policy Realtime
│   └── SETUP.md        # configurazione guidata
├── .nojekyll           # pubblicazione statica diretta su GitHub Pages
├── LICENSE
└── README.md
```

## Estrazione delle sfide

Il pool contiene 20 meccaniche con almeno 5 varianti ciascuna. Ogni partita ne seleziona 10 senza duplicati, quindi ogni meccanica ha una probabilità media del 50% di apparire in una partita.

Per ridurre la monotonia, rispetto alla partita precedente vengono scelte 7 meccaniche nuove e al massimo 3 già viste. Le singole varianti giocate di recente vengono conservate in una breve cronologia locale ed escluse finché per quella meccanica esistono alternative.

## Sfida un amico

Chi crea la sfida condivide un link che contiene gli identificativi delle dieci prove e un seed casuale. I dati sono nel frammento `#challenge`: GitHub Pages riceve sempre la root esistente e non mostra pagine 404. Il creatore resta nella sala d’attesa senza scadenza, vede i partecipanti che entrano e può indicarsi come pronto. Quando ci sono almeno due giocatori e tutti i presenti sono pronti, Supabase Realtime avvia per tutti un countdown sincronizzato di 3 secondi.

Lo stesso link può essere aperto da più partecipanti: Presence mostra chi è online e chi è pronto. Avanzamento e risultati vengono sincronizzati sia tramite Presence sia tramite eventi realtime, così il pannello continua ad aggiornarsi anche se un singolo aggiornamento di stato arriva in ritardo. **Gioca ancora** invia una richiesta di rivincita a tutto il gruppo. Alla prima accettazione parte un nuovo countdown condiviso, senza generare né inviare un altro link. La modalità Sfida live richiede Supabase; Giocatore singolo e Allenamento restano disponibili anche offline.

## Classifica mondiale

Le partite complete da dieci livelli possono aggiornare la classifica globale. L’accesso è anonimo e persistente sul browser: il giocatore sceglie soltanto un nickname. Le scritture dirette sono bloccate da Row Level Security e i risultati passano da una funzione SQL che verifica quantità dei livelli, intervallo dei punteggi, media, durata e frequenza degli invii. È una valida protezione per un gioco statico casual, ma non sostituisce un server autorevole contro un attaccante determinato.

Ogni risultato alimenta anche la classifica mondiale dello specifico livello. In Allenamento, dopo ogni tentativo vengono mostrati record e posizione mondiale, con accesso immediato alla top del livello. Anche i risultati ottenuti nelle partite complete contribuiscono automaticamente ai relativi record individuali.

Le classifiche di sviluppo e produzione sono separate automaticamente. `localhost`, `127.0.0.1`, gli indirizzi della rete locale e i domini `.local` scrivono nell’ambiente `local`; GitHub Pages e gli altri domini pubblici leggono e scrivono soltanto nell’ambiente `production`. I test eseguiti in locale non possono quindi comparire agli utenti del sito pubblicato.

## Allenamento

La modalità **Allenamento** permette di cercare e filtrare l'intero catalogo, avviare una singola prova e ripeterla senza limiti. Il miglior risultato di ogni livello viene salvato sul dispositivo tramite `localStorage` e mostrato direttamente nella relativa scheda.

## Compatibilità

QUASI! usa API web moderne supportate dalle versioni recenti di Chrome, Edge, Firefox e Safari. La Web Share API con file dipende dal browser e dal contesto HTTPS; quando non è disponibile viene scaricato automaticamente il PNG.

## Personalizzazione

Le sfide sono dichiarate in `js/challenges.js`. Palette, tipografia e breakpoint sono raccolti all'inizio di `styles.css`. Non esiste un passaggio di build: ogni modifica pubblicata nei file è immediatamente effettiva.
