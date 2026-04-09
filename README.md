# Scopa da Solo

Web app standalone in HTML, CSS e JavaScript puro.

## Avvio

Apri `index.html` nel browser.

Non servono dipendenze o build.

## Esperienza

- Menu iniziale compatto in stile solitario.
- Tavolo centrale con layout responsive per desktop, tablet e telefono.
- Selezione del mazzo tra `Napoletane`, `Trevisane` e `Piacentine`.
- Interazione principale via drag-and-drop: trascini una carta dalla mano e la rilasci sulla presa valida.
- L'app usa gli asset immagine generati in `assets/decks` a partire dalle cartelle `napoletane`, `trevisane` e `piacentine`.

## Regole implementate

- Mano iniziale da 3 carte.
- Tavolo iniziale con 4 carte scoperte.
- Coppia: una carta in mano prende una carta sul tavolo con lo stesso valore.
- Somma: due carte sul tavolo possono essere prese se la loro somma corrisponde alla carta in mano.
- Somma speciale: una carta sul tavolo puo essere presa insieme ad altre se il suo valore corrisponde alla carta in mano piu una o piu carte del tavolo.
- Valori: 1-7 valgono il numero, le tre figure italiane valgono 8, 9 e 10.
- Se una carta puo fare presa, non puo essere semplicemente lasciata sul tavolo.
- Ogni pulizia completa del tavolo vale una Scopa.

## File principali

- `index.html`
- `styles.css`
- `game-logic.js`
- `app.js`
