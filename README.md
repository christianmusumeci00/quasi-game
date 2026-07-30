# QUASI!

Un gioco web di precisione, stima, memoria e riflessi. Ogni partita seleziona 10 mini-sfide senza ripetizioni da un pool di 200 e produce una carta risultato condivisibile.

## Caratteristiche

- 200 mini-sfide in 16 famiglie, tutte giocabili con mouse e touch
- 10 meccaniche sempre diverse in ogni partita, con rotazione anti-ripetizione fra partite consecutive
- modalità Giocatore singolo, Sfida un amico tramite link e Allenamento libero
- catalogo di allenamento con ricerca, filtri per famiglia e record locale per ciascuno dei 200 livelli
- conto alla rovescia di 5 secondi prima delle prove ad avvio automatico
- punteggio di accuratezza 0–100 e grado arcade da E a S+
- feedback immediato dopo ogni prova
- carta risultato generata interamente nel browser con Canvas
- condivisione tramite Web Share API e download PNG come fallback
- miglior punteggio e preferenza audio salvati in `localStorage`
- interfaccia responsive, navigabile anche da tastiera
- safe area, controlli e gesture ottimizzati per iPhone, Android e tablet
- nessun cookie, backend, framework o servizio esterno

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

## Struttura

```text
.
├── index.html          # struttura e schermate dell'app
├── styles.css          # identità visiva e layout responsive
├── js/
│   ├── app.js          # motore di gioco, input, scoring e carta finale
│   ├── challenge-mode.js # codifica link e casualità condivisa delle sfide
│   └── challenges.js   # catalogo delle 200 mini-sfide
├── .nojekyll           # pubblicazione statica diretta su GitHub Pages
├── LICENSE
└── README.md
```

## Estrazione delle sfide

Il pool contiene 20 meccaniche con almeno 5 varianti ciascuna. Ogni partita ne seleziona 10 senza duplicati, quindi ogni meccanica ha una probabilità media del 50% di apparire in una partita.

Per ridurre la monotonia, rispetto alla partita precedente vengono scelte 7 meccaniche nuove e al massimo 3 già viste. Le singole varianti giocate di recente vengono conservate in una breve cronologia locale ed escluse finché per quella meccanica esistono alternative.

## Sfida un amico

La modalità sfida non richiede account o server. Chi crea la sfida condivide subito un link che contiene gli identificativi delle dieci prove, un seed casuale e l'orario comune di partenza. I dati della sfida sono salvati nel frammento `#challenge` del link: GitHub Pages riceve sempre il percorso statico della home e non deve interpretare una rotta dinamica. Aprendo l'invito si entra direttamente nella schermata di gioco e nel countdown sincronizzato, senza passaggi intermedi. Lo stesso link può essere aperto da più partecipanti: tutti ricevono gli stessi livelli, configurazioni casuali e orario di partenza. Al termine ciascun giocatore può condividere il proprio risultato; gli altri possono aprirlo oppure incollarlo nel pannello **Confronta con un amico** per vedere vittoria, sconfitta, pareggio e differenza punti.

## Allenamento

La modalità **Allenamento** permette di cercare e filtrare l'intero catalogo, avviare una singola prova e ripeterla senza limiti. Il miglior risultato di ogni livello viene salvato sul dispositivo tramite `localStorage` e mostrato direttamente nella relativa scheda.

## Compatibilità

QUASI! usa API web moderne supportate dalle versioni recenti di Chrome, Edge, Firefox e Safari. La Web Share API con file dipende dal browser e dal contesto HTTPS; quando non è disponibile viene scaricato automaticamente il PNG.

## Personalizzazione

Le sfide sono dichiarate in `js/challenges.js`. Palette, tipografia e breakpoint sono raccolti all'inizio di `styles.css`. Non esiste un passaggio di build: ogni modifica pubblicata nei file è immediatamente effettiva.
