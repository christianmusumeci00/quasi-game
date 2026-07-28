const BASE_CHALLENGES = [
  { id: 'timer-3000', family: 'Timing', name: 'Tre secondi esatti', instruction: 'Ferma il cronometro il più vicino possibile a 3,000 secondi.', kind: 'timer', config: { target: 3, visible: true } },
  { id: 'timer-1500', family: 'Timing', name: 'Lampo da 1,5 secondi', instruction: 'Un battito di ciglia: fermati esattamente a 1,500 secondi.', kind: 'timer', config: { target: 1.5, visible: true } },
  { id: 'timer-7000', family: 'Timing', name: 'Lunga attesa', instruction: 'Sette secondi sembrano lunghi. Fermati a 7,000.', kind: 'timer', config: { target: 7, visible: true } },
  { id: 'timer-blind', family: 'Timing', name: 'Timer cieco', instruction: 'Il display sparirà dopo un secondo. Fidati del tuo ritmo interno.', kind: 'timer', config: { target: 4.5, visible: false } },
  { id: 'countdown-zero', family: 'Timing', name: 'Conto alla rovescia', instruction: 'Ferma la lancetta quando attraversa esattamente lo zero.', kind: 'sweep', config: { speed: 0.72 } },

  { id: 'hold-2500', family: 'Ritmo', name: 'Pressione precisa', instruction: 'Tieni premuto il pulsante per esattamente 2,500 secondi.', kind: 'hold', config: { target: 2.5 } },
  { id: 'hold-0750', family: 'Ritmo', name: 'Impulso breve', instruction: 'Tieni premuto per appena 750 millisecondi.', kind: 'hold', config: { target: 0.75 } },
  { id: 'metronome', family: 'Ritmo', name: 'Metronomo', instruction: 'Batti quattro volte mantenendo un intervallo di 700 ms.', kind: 'rhythm', config: { interval: 700, taps: 4, demo: false } },
  { id: 'rhythm-echo', family: 'Ritmo', name: 'Eco ritmico', instruction: 'Osserva tre impulsi, poi ripeti lo stesso ritmo.', kind: 'rhythm', config: { intervals: [420, 760, 520], taps: 4, demo: true } },
  { id: 'last-beat', family: 'Ritmo', name: 'Ultimo battito', instruction: 'Ascolta tre battiti regolari e anticipa il quarto.', kind: 'predictBeat', config: { interval: 780 } },

  { id: 'draw-circle', family: 'Disegno', name: 'Cerchio perfetto', instruction: 'Disegna un cerchio chiuso, regolare e senza ripensamenti.', kind: 'draw', config: { shape: 'circle' } },
  { id: 'draw-square', family: 'Disegno', name: 'Quadrato a mano libera', instruction: 'Disegna quattro lati uguali e quattro angoli retti.', kind: 'draw', config: { shape: 'square' } },
  { id: 'draw-line', family: 'Disegno', name: 'Linea dritta', instruction: 'Collega i due punti senza deviare dalla traiettoria.', kind: 'draw', config: { shape: 'line' } },
  { id: 'draw-spiral', family: 'Disegno', name: 'Spirale regolare', instruction: 'Segui la spirale mantenendo il tratto vicino alla guida.', kind: 'draw', config: { shape: 'spiral' } },
  { id: 'draw-eight', family: 'Disegno', name: 'Otto simmetrico', instruction: 'Disegna un 8 con due lobi il più possibile equivalenti.', kind: 'draw', config: { shape: 'eight' } },

  { id: 'split-vertical', family: 'Geometria', name: 'Metà verticale', instruction: 'Tocca il punto che divide il rettangolo in due metà verticali.', kind: 'split', config: { mode: 'vertical', target: 0.5 } },
  { id: 'split-horizontal', family: 'Geometria', name: 'Metà orizzontale', instruction: 'Dividi il rettangolo in due metà orizzontali.', kind: 'split', config: { mode: 'horizontal', target: 0.5 } },
  { id: 'split-diagonal', family: 'Geometria', name: 'Taglio diagonale', instruction: 'Posiziona una diagonale che attraversi esattamente il centro.', kind: 'split', config: { mode: 'diagonal', target: 0.5 } },
  { id: 'split-third', family: 'Geometria', name: 'Terzo esatto', instruction: 'Separa esattamente un terzo della barra.', kind: 'split', config: { mode: 'vertical', target: 1 / 3 } },
  { id: 'split-circle', family: 'Geometria', name: 'Cerchio a metà', instruction: 'Traccia un diametro che attraversi il centro del disco.', kind: 'split', config: { mode: 'circle', target: 0.5 } },

  { id: 'center-circle', family: 'Centro', name: 'Centro del cerchio', instruction: 'Piazza il punto nel centro geometrico del disco.', kind: 'center', config: { shape: 'circle' } },
  { id: 'center-triangle', family: 'Centro', name: 'Centro del triangolo', instruction: 'Trova il baricentro del triangolo irregolare.', kind: 'center', config: { shape: 'triangle' } },
  { id: 'center-blob', family: 'Centro', name: 'Centro della forma', instruction: 'Trova il centro visivo di questa forma irregolare.', kind: 'center', config: { shape: 'blob' } },
  { id: 'center-equal', family: 'Centro', name: 'Punto equidistante', instruction: 'Trova il punto alla stessa distanza dai tre riferimenti.', kind: 'center', config: { shape: 'circumcenter' } },
  { id: 'center-hidden', family: 'Centro', name: 'Bersaglio invisibile', instruction: 'Memorizza il centro: fra un attimo il bersaglio svanirà.', kind: 'center', config: { shape: 'hidden' } },

  { id: 'length-line', family: 'Misura', name: 'Copia la linea', instruction: 'Disegna una linea lunga esattamente quanto il riferimento.', kind: 'measure', config: { mode: 'line', target: 168, angle: 0 } },
  { id: 'length-diagonal', family: 'Misura', name: 'Lunghezza diagonale', instruction: 'Riproduci la lunghezza, ma su una direzione diversa.', kind: 'measure', config: { mode: 'line', target: 142, angle: -36 } },
  { id: 'length-memory', family: 'Misura', name: 'Misura a memoria', instruction: 'Osserva la linea: scomparirà prima del tuo tentativo.', kind: 'measure', config: { mode: 'memory', target: 155, angle: 0 } },
  { id: 'diameter-copy', family: 'Misura', name: 'Diametro gemello', instruction: 'Ridimensiona il cerchio per copiare il diametro campione.', kind: 'measure', config: { mode: 'diameter', target: 126 } },
  { id: 'height-copy', family: 'Misura', name: 'Altezza gemella', instruction: 'Regola la colonna per raggiungere la stessa altezza del modello.', kind: 'measure', config: { mode: 'height', target: 154 } },

  { id: 'angle-90', family: 'Angoli', name: 'Angolo retto', instruction: 'Ruota la lancetta fino a creare esattamente 90°.', kind: 'angle', config: { target: 90 } },
  { id: 'angle-45', family: 'Angoli', name: 'Quarantacinque gradi', instruction: 'Crea un angolo di 45° senza tacche di riferimento.', kind: 'angle', config: { target: 45 } },
  { id: 'angle-random', family: 'Angoli', name: 'Angolo misterioso', instruction: 'Riproduci l’angolo indicato nel modo più preciso possibile.', kind: 'angle', config: { target: 137 } },
  { id: 'angle-match', family: 'Angoli', name: 'Rotazione gemella', instruction: 'Orienta la lancetta come il modello colorato.', kind: 'angle', config: { target: 58, reference: true } },
  { id: 'angle-perpendicular', family: 'Angoli', name: 'Perpendicolare', instruction: 'Posiziona la seconda linea a 90° rispetto alla prima.', kind: 'angle', config: { target: 116, base: 26 } },

  { id: 'percent-37', family: 'Proporzioni', name: 'Riempi il 37%', instruction: 'Riempi esattamente il 37% della barra.', kind: 'percent', config: { target: 37, mode: 'bar' } },
  { id: 'percent-edge', family: 'Proporzioni', name: 'Percentuale estrema', instruction: 'Trova l’8%: vicino al bordo, ma non troppo.', kind: 'percent', config: { target: 8, mode: 'bar' } },
  { id: 'percent-area', family: 'Proporzioni', name: 'Area colorata', instruction: 'Colora il 64% del quadrato.', kind: 'percent', config: { target: 64, mode: 'grid' } },
  { id: 'ratio-two-one', family: 'Proporzioni', name: 'Rapporto 2:1', instruction: 'Regola la divisione: la parte gialla deve essere il doppio della viola.', kind: 'percent', config: { target: 66.667, mode: 'ratio' } },
  { id: 'percent-pie', family: 'Proporzioni', name: 'Torta precisa', instruction: 'Imposta una fetta pari al 42% del cerchio.', kind: 'percent', config: { target: 42, mode: 'pie' } },

  { id: 'trace-line', family: 'Coordinazione', name: 'Filo dritto', instruction: 'Trascina dal via all’arrivo senza toccare i bordi.', kind: 'trace', config: { path: 'line', width: 28 } },
  { id: 'trace-s', family: 'Coordinazione', name: 'Curva a S', instruction: 'Segui il corridoio sinuoso con mano ferma.', kind: 'trace', config: { path: 's', width: 34 } },
  { id: 'trace-spiral', family: 'Coordinazione', name: 'Spirale chirurgica', instruction: 'Raggiungi il centro restando dentro la spirale.', kind: 'trace', config: { path: 'spiral', width: 35 } },
  { id: 'trace-gates', family: 'Coordinazione', name: 'Porte mobili', instruction: 'Attraversa tutte le porte seguendo la traiettoria ondulata.', kind: 'trace', config: { path: 'gates', width: 31 } },
  { id: 'trace-steady', family: 'Coordinazione', name: 'Mano ferma', instruction: 'Mantieni il puntatore dentro il bersaglio fino alla fine.', kind: 'steady', config: { duration: 3200 } },

  { id: 'reaction-green', family: 'Riflessi', name: 'Verde!', instruction: 'Aspetta il verde. Toccare prima è una falsa partenza.', kind: 'reaction', config: { mode: 'green' } },
  { id: 'reaction-symbol', family: 'Riflessi', name: 'Solo il simbolo giusto', instruction: 'Tocca soltanto quando compare la stella. Ignora le esche.', kind: 'reaction', config: { mode: 'symbol' } },
  { id: 'reaction-intercept', family: 'Riflessi', name: 'Intercetta', instruction: 'Ferma il punto quando attraversa la zona centrale.', kind: 'reaction', config: { mode: 'intercept' } },

  { id: 'memory-grid', family: 'Memoria', name: 'Griglia lampo', instruction: 'Memorizza le celle illuminate e selezionale di nuovo.', kind: 'memory', config: { mode: 'grid', count: 5 } },
  { id: 'memory-sequence', family: 'Memoria', name: 'Sequenza di punti', instruction: 'Ripeti i punti nello stesso ordine in cui si illuminano.', kind: 'memory', config: { mode: 'sequence', count: 5 } },
];

const timerLevels = [
  ['timer-2250', 'Due e un quarto', 2.25, true],
  ['timer-4200', 'Quattro e due', 4.2, true],
  ['timer-8750', 'Otto e tre quarti', 8.75, true],
  ['timer-0900', 'Sotto il secondo', 0.9, true],
  ['timer-6100', 'Sei e un decimo', 6.1, true],
  ['timer-3333', 'Tre, tre, tre', 3.333, true],
  ['timer-5750', 'Cinque e tre quarti', 5.75, true],
  ['timer-12000', 'Dodici lunghi secondi', 12, true],
  ['timer-blind-2400', 'Buio rapido', 2.4, false],
  ['timer-blind-3800', 'Buio medio', 3.8, false],
  ['timer-blind-5250', 'Buio profondo', 5.25, false],
].map(([id, name, target, visible]) => ({
  id, family: 'Timing', name,
  instruction: `Ferma il tempo esattamente a ${target.toFixed(3)} secondi${visible ? '.' : ': il display svanirà dopo il primo secondo.'}`,
  kind: 'timer', config: { target, visible },
}));

const sweepLevels = [
  ['sweep-gentle', 'Passaggio morbido', .45], ['sweep-quick', 'Passaggio rapido', .92],
  ['sweep-faster', 'Lancetta nervosa', 1.28], ['sweep-lightning', 'Zero fulmineo', 1.65],
].map(([id, name, speed]) => ({ id, family: 'Timing', name, instruction: 'Ferma la lancetta esattamente quando attraversa lo zero centrale.', kind: 'sweep', config: { speed } }));

const rhythmLevels = [
  ...[
    ['hold-1200', 'Presa da 1,2', 1.2], ['hold-1800', 'Presa da 1,8', 1.8],
    ['hold-3200', 'Presa lunga', 3.2], ['hold-4100', 'Quattro secondi e un soffio', 4.1],
    ['hold-0550', 'Tocco piuma', 0.55],
  ].map(([id, name, target]) => ({ id, family: 'Ritmo', name, instruction: `Tieni premuto per esattamente ${target.toFixed(3)} secondi.`, kind: 'hold', config: { target } })),
  ...[
    ['rhythm-500', 'Passo veloce', 500, 5], ['rhythm-850', 'Passo calmo', 850, 4],
    ['rhythm-1100', 'Battito lento', 1100, 4], ['rhythm-360', 'Dita rapide', 360, 6],
    ['rhythm-625', 'Cinque colpi regolari', 625, 5],
  ].map(([id, name, interval, taps]) => ({ id, family: 'Ritmo', name, instruction: `Batti ${taps} volte mantenendo intervalli da ${interval} ms.`, kind: 'rhythm', config: { interval, taps, demo: false } })),
  ...[
    ['beat-560', 'Completa il ritmo rapido', 560], ['beat-920', 'Completa il ritmo lento', 920],
    ['beat-680', 'Il battito mancante', 680], ['beat-1250', 'Attesa musicale', 1250],
    ['beat-430', 'Quarto colpo sprint', 430],
  ].map(([id, name, interval]) => ({ id, family: 'Ritmo', name, instruction: 'Osserva tre battiti regolari e piazza il quarto al momento giusto.', kind: 'predictBeat', config: { interval } })),
];

const splitLevels = [
  ['split-v-25', 'Un quarto verticale', 'vertical', .25], ['split-v-60', 'Sessanta e quaranta', 'vertical', .6],
  ['split-v-75', 'Tre quarti verticali', 'vertical', .75], ['split-v-42', 'Taglio al quarantadue', 'vertical', .42],
  ['split-v-18', 'Fetta sottile', 'vertical', .18], ['split-h-30', 'Trenta dall’alto', 'horizontal', .3],
  ['split-h-65', 'Sessantacinque in basso', 'horizontal', .65], ['split-h-80', 'Quattro quinti', 'horizontal', .8],
  ['split-h-45', 'Quasi metà', 'horizontal', .45], ['split-h-12', 'Dodici percento', 'horizontal', .12],
].map(([id, name, mode, target]) => ({ id, family: 'Geometria', name, instruction: `Dividi la forma in ${Math.round(target * 100)}% e ${Math.round((1-target)*100)}%.`, kind: 'split', config: { mode, target } }));

const centerLevels = [
  ['center-orbit-left', 'Centro fuori asse', 'circle', -125, -20], ['center-orbit-right', 'Disco decentrato', 'circle', 145, 35],
  ['center-triangle-tall', 'Triangolo slanciato', 'triangle', -90, -12], ['center-triangle-low', 'Triangolo basso', 'triangle', 110, 28],
  ['center-blob-east', 'Ameba orientale', 'blob', 135, -5], ['center-blob-west', 'Ameba occidentale', 'blob', -130, 18],
  ['center-equal-high', 'Tre punti sospesi', 'circumcenter', 0, -45], ['center-equal-side', 'Tre punti laterali', 'circumcenter', 115, 20],
  ['center-hidden-left', 'Centro fantasma', 'hidden', -120, 15], ['center-hidden-high', 'Ricordo decentrato', 'hidden', 105, -38],
].map(([id, name, shape, offsetX, offsetY]) => ({ id, family: 'Centro', name, instruction: shape === 'hidden' ? 'Memorizza il centro prima che la figura scompaia.' : 'Trova il centro geometrico della figura decentrata.', kind: 'center', config: { shape, offsetX, offsetY } }));

const measureLevels = [
  ['measure-88', 'Linea tascabile', 'line', 88, 0], ['measure-112', 'Centododici pixel', 'line', 112, 22],
  ['measure-196', 'Linea lunga', 'line', 196, -18], ['measure-235', 'Misura extra large', 'line', 235, 34],
  ['measure-128-memory', 'Ricordo da 128', 'memory', 128, 0], ['measure-182-memory', 'Ricordo da 182', 'memory', 182, 0],
  ['measure-218-memory', 'La linea che fu', 'memory', 218, 0], ['diameter-82', 'Piccolo diametro', 'diameter', 82, 0],
  ['diameter-164', 'Grande diametro', 'diameter', 164, 0], ['diameter-205', 'Cerchio gigante', 'diameter', 205, 0],
  ['diameter-106', 'Cerchio medio', 'diameter', 106, 0], ['height-92', 'Colonna bassa', 'height', 92, 0],
  ['height-126', 'Colonna media', 'height', 126, 0], ['height-188', 'Colonna alta', 'height', 188, 0],
  ['height-224', 'Grattacielo', 'height', 224, 0],
].map(([id, name, mode, target, angle]) => ({ id, family: 'Misura', name, instruction: mode === 'memory' ? 'Memorizza la misura prima che il riferimento scompaia.' : `Riproduci esattamente la misura del modello ${mode === 'line' ? 'tracciando la tua linea' : 'regolando la forma'}.`, kind: 'measure', config: { mode, target, angle } }));

const angleLevels = [15, 25, 30, 60, 72, 105, 120, 135, 150, 165, 18, 54, 108, 144, 172].map((target, index) => ({
  id: `angle-extra-${target}`, family: 'Angoli',
  name: ['Quindici sottili','Venticinque gradi','Trenta netti','Sessanta precisi','Pentagono invisibile','Angolo ottuso','Centoventi','Tre quarti di giro','Centocinquanta','Quasi piatto','Diciotto gradi','Cinquantaquattro','Centootto','Centoquarantaquattro','Due gradi dal limite'][index],
  instruction: `Crea un angolo di ${target}° senza usare tacche.`, kind: 'angle', config: { target },
}));

const percentLevels = [
  ['percent-13', 'Tredici percento', 13, 'bar'], ['percent-22', 'Ventidue percento', 22, 'bar'],
  ['percent-49', 'Un soffio sotto metà', 49, 'bar'], ['percent-58', 'Cinquantotto percento', 58, 'bar'],
  ['percent-77', 'Settantasette percento', 77, 'bar'], ['percent-91', 'Quasi tutto', 91, 'bar'],
  ['grid-23', 'Ventitré celle', 23, 'grid'], ['grid-46', 'Mosaico al quarantasei', 46, 'grid'],
  ['grid-72', 'Mosaico al settantadue', 72, 'grid'], ['ratio-40', 'Rapporto due a tre', 40, 'ratio'],
  ['pie-18', 'Spicchio piccolo', 18, 'pie'],
].map(([id, name, target, mode]) => ({ id, family: 'Proporzioni', name, instruction: `Imposta con un solo gesto esattamente il ${target}%${mode === 'ratio' ? ' della parte gialla' : ''}.`, kind: 'percent', config: { target, mode } }));

const traceLevels = [
  ['trace-line-narrow', 'Filo sottilissimo', 'line', 17], ['trace-line-wide', 'Rettilineo sprint', 'line', 42],
  ['trace-s-tight', 'Serpente stretto', 's', 22], ['trace-s-soft', 'Onda morbida', 's', 46],
  ['trace-s-needle', 'Esse chirurgica', 's', 18], ['trace-spiral-tight', 'Spirale millimetrica', 'spiral', 23],
  ['trace-spiral-soft', 'Spirale larga', 'spiral', 49], ['trace-gates-tight', 'Porte strette', 'gates', 21],
  ['trace-gates-wide', 'Slalom controllato', 'gates', 44], ['trace-gates-needle', 'Quattro crune', 'gates', 17],
].map(([id, name, path, width]) => ({ id, family: 'Coordinazione', name, instruction: 'Parti dall’arancione e raggiungi il verde senza uscire dal percorso.', kind: 'trace', config: { path, width } }));

const steadyLevels = [
  ['steady-slow', 'Orbita lenta', 3600, 185, 1.55, 48], ['steady-tight', 'Bersaglio stretto', 3200, 245, 2.15, 31],
  ['steady-vertical', 'Ascensore instabile', 3400, 115, 3.4, 39], ['steady-wide', 'Grande oscillazione', 3800, 315, 2.55, 42],
].map(([id, name, duration, amplitudeX, speedY, radius]) => ({ id, family: 'Coordinazione', name, instruction: 'Tieni premuto e resta dentro il bersaglio in movimento fino alla fine.', kind: 'steady', config: { duration, amplitudeX, speedY, radius } }));

const reactionLevels = [
  ['react-green-short', 'Verde improvviso', 'green', 700, 0], ['react-green-long', 'Verde paziente', 'green', 2200, 0],
  ['react-green-jitter', 'Semaforo nervoso', 'green', 1200, 0], ['react-star-fast', 'Stella lampo', 'symbol', 360, 0],
  ['react-star-slow', 'Stella paziente', 'symbol', 720, 0], ['react-diamond', 'Solo il diamante', 'symbol', 500, 0, '◆'],
  ['react-circle', 'Solo il cerchio', 'symbol', 430, 0, '●'], ['intercept-fast', 'Intercetto veloce', 'intercept', 0, 1600],
  ['intercept-slow', 'Intercetto lento', 'intercept', 0, 3100], ['intercept-needle', 'Zona microscopica', 'intercept', 0, 2250, null, 7],
].map(([id, name, mode, pace, duration, targetSymbol, band]) => ({ id, family: 'Riflessi', name, instruction: mode === 'intercept' ? 'Ferma il punto dentro la zona centrale.' : mode === 'green' ? 'Aspetta il verde e reagisci senza anticipare.' : `Tocca soltanto quando appare ${targetSymbol || '★'}.`, kind: 'reaction', config: { mode, pace, duration, targetSymbol, band } }));

const memoryLevels = [
  ['memory-grid-3', 'Tre celle fantasma', 'grid', 3, 1900, 16], ['memory-grid-4-fast', 'Quattro celle lampo', 'grid', 4, 900, 16],
  ['memory-grid-6', 'Sei celle', 'grid', 6, 1700, 16], ['memory-grid-7-fast', 'Sette in un lampo', 'grid', 7, 1050, 16],
  ['memory-grid-8', 'Mezza griglia', 'grid', 8, 1800, 16], ['memory-seq-3', 'Terzetto ordinato', 'sequence', 3, 600, 16],
  ['memory-seq-4-fast', 'Quartetto rapido', 'sequence', 4, 330, 16], ['memory-seq-6', 'Catena da sei', 'sequence', 6, 500, 16],
  ['memory-seq-7', 'Sette passi', 'sequence', 7, 440, 16], ['memory-seq-8-fast', 'Otto fulmini', 'sequence', 8, 320, 16],
].map(([id, name, mode, count, pace, cells]) => ({ id, family: 'Memoria', name, instruction: mode === 'grid' ? `Memorizza le ${count} celle illuminate.` : `Ripeti una sequenza di ${count} punti nello stesso ordine.`, kind: 'memory', config: { mode, count, pace, cells } }));

const precisionLevels = [
  ['precision-pin', 'Testa di spillo', 695, 92, 13, 8], ['precision-corner', 'Angolo lontano', 170, 255, 16, 10],
  ['precision-crowd', 'Uno fra molti', 470, 170, 18, 22], ['precision-edge', 'Sul bordo', 790, 165, 14, 14],
  ['precision-center', 'Centro microscopico', 450, 165, 10, 16],
].map(([id, name, x, y, radius, distractors]) => ({ id, family: 'Mira', name, instruction: 'Tocca il piccolo bersaglio arancione con la massima precisione.', kind: 'precision', config: { x, y, radius, distractors } }));

const symmetryLevels = [
  ['mirror-v-left', 'Specchio verticale', 'vertical', 285, 92], ['mirror-v-low', 'Riflesso in basso', 'vertical', 330, 255],
  ['mirror-h-high', 'Specchio orizzontale', 'horizontal', 610, 74], ['mirror-h-side', 'Riflesso laterale', 'horizontal', 245, 112],
  ['mirror-diagonal', 'Specchio diagonale', 'diagonal', 315, 95],
].map(([id, name, axis, x, y]) => ({ id, family: 'Simmetria', name, instruction: 'Piazza il secondo punto nella posizione perfettamente speculare.', kind: 'symmetry', config: { axis, x, y } }));

const balanceLevels = [
  ['balance-twins', 'Pesi gemelli', [[180,2],[720,2]]], ['balance-heavy-left', 'Peso massimo a sinistra', [[190,4],[680,1]]],
  ['balance-three', 'Tre pesi', [[155,1],[430,2],[760,3]]], ['balance-cluster', 'Carico sbilanciato', [[180,2],[310,3],[735,2]]],
  ['balance-four', 'Equilibrio a quattro', [[130,1],[315,2],[620,3],[790,1]]],
].map(([id, name, weights]) => ({ id, family: 'Equilibrio', name, instruction: 'Sposta il fulcro nel punto esatto in cui la trave resterebbe in equilibrio.', kind: 'balance', config: { weights } }));

const colorLevels = [
  ['color-light-orange', 'Luce arancione', 'lightness', 10, 78, 58], ['color-light-violet', 'Luce viola', 'lightness', 254, 82, 45],
  ['color-hue-mint', 'Trova il verde', 'hue', 158, 72, 50], ['color-hue-pink', 'Trova il rosa', 'hue', 337, 82, 61],
  ['color-saturation', 'Intensità del blu', 'saturation', 207, 64, 52],
].map(([id, name, mode, hue, saturation, lightness]) => ({ id, family: 'Colore', name, instruction: `Regola ${mode === 'hue' ? 'la tonalità' : mode === 'saturation' ? 'l’intensità' : 'la luminosità'} finché i due colori sembrano identici.`, kind: 'colorMatch', config: { mode, hue, saturation, lightness } }));

const countingLevels = [
  ['count-7', 'Sette lampi', 7, 360, false], ['count-11', 'Undici lampi', 11, 260, false],
  ['count-14-fast', 'Quattordici scintille', 14, 185, false], ['count-9-fakes', 'Lampi con esche', 9, 330, true],
  ['count-16-fakes', 'Tempesta di lampi', 16, 180, true],
].map(([id, name, count, pace, distractors]) => ({ id, family: 'Conteggio', name, instruction: distractors ? 'Conta soltanto i lampi gialli, ignorando quelli viola.' : 'Conta quanti lampi appaiono sullo schermo.', kind: 'countFlash', config: { count, pace, distractors } }));

export const CHALLENGES = [
  ...BASE_CHALLENGES,
  ...timerLevels,
  ...sweepLevels,
  ...rhythmLevels,
  ...splitLevels,
  ...centerLevels,
  ...measureLevels,
  ...angleLevels,
  ...percentLevels,
  ...traceLevels,
  ...steadyLevels,
  ...reactionLevels,
  ...memoryLevels,
  ...precisionLevels,
  ...symmetryLevels,
  ...balanceLevels,
  ...colorLevels,
  ...countingLevels,
];

export const FAMILY_COLORS = {
  Timing: '#ff5b3d', Ritmo: '#ffb800', Disegno: '#7856ff', Geometria: '#1fc8a5',
  Centro: '#ff6f91', Misura: '#168be8', Angoli: '#ec5fff', Proporzioni: '#f1a51a',
  Coordinazione: '#22b983', Riflessi: '#ff493d', Memoria: '#6055e8',
  Mira: '#ff5b3d', Simmetria: '#7856ff', Equilibrio: '#ffc93d', Colore: '#26c9a7', Conteggio: '#168be8',
};

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]];
  }
  return shuffled;
}

export function buildDeck(count = 10, { excludedKinds = [], excludedIds = [] } = {}) {
  const byKind = new Map();
  CHALLENGES.forEach((challenge) => {
    if (!byKind.has(challenge.kind)) byKind.set(challenge.kind, []);
    byKind.get(challenge.kind).push(challenge);
  });

  const recentKinds = new Set(excludedKinds);
  const recentIds = new Set(excludedIds);
  const allKinds = shuffle([...byKind.keys()]);
  const freshKinds = allKinds.filter((kind) => !recentKinds.has(kind));
  const returningKinds = allKinds.filter((kind) => recentKinds.has(kind));
  const returningCount = returningKinds.length ? Math.min(3, count) : 0;
  const selectedKinds = shuffle([
    ...freshKinds.slice(0, count - returningCount),
    ...returningKinds.slice(0, returningCount),
  ]);

  return selectedKinds.slice(0, Math.min(count, selectedKinds.length)).map((kind) => {
    const candidates = byKind.get(kind);
    const unseen = candidates.filter((challenge) => !recentIds.has(challenge.id));
    return shuffle(unseen.length ? unseen : candidates)[0];
  });
}
