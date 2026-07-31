# Configurazione Supabase per QUASI!

Il sito continuerà a essere pubblicato da GitHub Pages. Supabase fornisce soltanto autenticazione anonima, database e realtime.

1. Crea un progetto su Supabase e attendi che sia pronto.
2. Apri **Authentication → Providers → Anonymous Sign-Ins** e abilita gli accessi anonimi.
3. Apri **SQL Editor**, crea una nuova query, incolla tutto `schema.sql` ed eseguila. Puoi rieseguire l’intero file anche dopo un aggiornamento: crea o aggiorna in modo sicuro funzioni, policy, classifiche e risultati temporanei delle stanze live.
4. Nelle impostazioni **Realtime**, disabilita l’accesso pubblico ai canali: QUASI! usa esclusivamente canali privati protetti dalle policy SQL.
5. Apri il pannello **Connect** e copia:
   - Project URL;
   - Publishable key (`sb_publishable_…`). Anche la vecchia chiave pubblica `anon` è compatibile.
6. Incolla i due valori in `js/supabase-config.js`. Non usare mai una chiave `sb_secret_…` o `service_role` nel sito.
7. Pubblica normalmente su GitHub Pages e prova una sfida da due browser o dispositivi diversi.

## Collaudo consigliato

1. Apri il sito in due browser diversi o in una finestra normale e una privata.
2. Nel primo scegli **Sfida un amico**, copia il link e aprilo nel secondo.
3. Verifica che il primo browser resti nella sala d’attesa senza scadenza, che il secondo compaia nell’elenco e che entrambi possano premere **Sono pronto**. La partita deve cominciare subito, e soltanto quando tutti i partecipanti sono pronti.
4. Completa una partita da almeno tre browser o dispositivi e controlla che **Risultati live** mostri l’avanzamento e il punteggio finale di ciascun partecipante.
5. Termina la partita sui due dispositivi: entrambi devono mostrare i punteggi live.
6. Premi **Gioca ancora**, accetta dall’altro dispositivo e verifica che la rivincita parta senza un nuovo link.
7. Dalla home apri **Classifica mondiale** e verifica record e nickname.
8. Completa un livello in **Allenamento**, apri **Classifica del livello** e verifica che record e posizione mondiale siano presenti.
9. Ricorda che il collaudo su `localhost`, indirizzi LAN o domini `.local` usa una classifica `local` separata: per verificare i dati pubblici esegui anche una prova dal dominio GitHub Pages.

## Sicurezza e manutenzione

- Le tabelle pubbliche hanno Row Level Security attiva.
- I risultati delle stanze live vengono salvati per sei ore e sono leggibili soltanto tramite una funzione protetta, dopo che il giocatore ha terminato lo stesso round.
- I punteggi vengono scritti soltanto tramite `submit_score`, che verifica 10 risultati, media, durata e frequenza degli invii.
- Gli utenti anonimi Supabase persistono finché il browser conserva i dati locali. Supabase non li elimina automaticamente: valuta una pulizia periodica degli account anonimi inattivi seguendo la documentazione ufficiale.
- Per limitare creazioni abusive di utenti, abilita Cloudflare Turnstile nelle impostazioni Auth prima di una promozione su larga scala.
