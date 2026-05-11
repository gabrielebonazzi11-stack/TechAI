export const MECHANICAL_VERIFICATION_KNOWLEDGE = `
## CONOSCENZA DI VERIFICA MECCANICA - TECHAI

OBIETTIVO
Rispondere alle richieste di verifica/dimensionamento meccanico con metodo da costruzione di macchine, non con risposte generiche.
Il modello deve sempre separare: dati, ipotesi, schema di calcolo, formule, sostituzione numerica, esito, limiti della verifica.

UNITA E CONVENZIONI
- Quote geometriche: mm.
- Tensioni: MPa = N/mm^2.
- Forze: N.
- Momenti: Nmm, salvo richiesta diversa.
- Potenza: kW.
- Velocita di rotazione: rpm.
- Se mancano dati essenziali, non inventare. Dichiarare quali dati servono.

REGOLE GENERALI DI RISPOSTA
1. Non dichiarare un componente OK se mancano materiale, carichi, geometria o coefficiente di sicurezza.
2. Per ogni verifica indicare il criterio usato: Von Mises, Tresca, Goodman, Soderberg, pressione specifica, taglio, rifollamento, instabilita, ecc.
3. Distinguere sempre verifica statica e verifica a fatica.
4. In caso di dubbio usare il criterio piu prudente e dirlo esplicitamente.
5. Dove possibile ricavare prima la formula simbolica, poi sostituire i numeri.

SCHEMA MINIMO PER VERIFICHE
- Dati noti.
- Dati mancanti.
- Ipotesi adottate.
- Schema del componente o modello equivalente.
- Calcolo delle sollecitazioni.
- Calcolo delle tensioni.
- Confronto con ammissibile o criterio scelto.
- Esito: OK / NON OK / DA VERIFICARE.
- Suggerimenti di modifica: aumentare sezione, cambiare materiale, ridurre intaglio, migliorare raccordo, trattamenti, ecc.

SEZIONI E FORMULE BASE
Sezione circolare piena:
- Area A = pi d^2 / 4
- Momento d'inerzia flessionale Jf = pi d^4 / 64
- Modulo resistente flessionale Wf = pi d^3 / 32
- Momento polare Jp = pi d^4 / 32
- Modulo torsionale Wt = pi d^3 / 16

Sezione circolare cava:
- A = pi (D^2 - d^2) / 4
- Jf = pi (D^4 - d^4) / 64
- Wf = Jf / (D/2)
- Jp = pi (D^4 - d^4) / 32
- Wt = Jp / (D/2)

Sezione rettangolare:
- A = b h
- Jf = b h^3 / 12 rispetto all'asse coerente
- Wf = b h^2 / 6

TENSIONI BASE
- Trazione/compressione: sigma = F / A
- Taglio medio: tau = F / A
- Flessione: sigma_f = Mf / Wf
- Torsione: tau_t = Mt / Wt
- Pressione specifica: p = F / A_contatto

CRITERI STATICI
Von Mises:
- sigma_vm = sqrt(sigma^2 + 3 tau^2)
- Verifica: sigma_vm <= sigma_amm

Tresca:
- sigma_eq_tresca = sqrt(sigma^2 + 4 tau^2)
- Piu prudente di Von Mises nei casi duttili semplici.

Tensione ammissibile:
- sigma_amm = Re / n per snervamento, se si usa coefficiente di sicurezza n.
- Per materiali fragili o dati incerti considerare Rm e criterio piu prudente.

ALBERI IN FLESSIONE E TORSIONE
Dati tipici necessari:
- Potenza P [kW]
- Velocita n [rpm]
- Forze su pulegge/ingranaggi
- Distanze tra supporti e carichi
- Diametri e raggi di raccordo
- Materiale: Re, Rm, Sn/Se

Momento torcente:
- Mt [Nm] = 9550 P[kW] / n[rpm]
- Convertire in Nmm moltiplicando per 1000.

Tensioni:
- sigma_f = Mf / Wf
- tau_t = Mt / Wt
- sigma_vm = sqrt(sigma_f^2 + 3 tau_t^2)

Metodo con momento ideale per alberi:
- Mid = sqrt(Mf^2 + 0.75 Mt^2)
- d >= cuberoot(32 Mid / (pi sigma_amm))
Usarlo come stima rapida, ma per verifica completa riportare anche sigma_f, tau_t e sigma_vm.

FATICA - METODO RICHIESTO
Quando la richiesta riguarda fatica, carichi alternati, rotazione, alberi, cicli, urti ripetuti o sollecitazione variabile, usare il metodo:
S'n -> Sn con coefficienti correttivi.

Passaggi:
1. Ricavare o stimare S'n, limite di fatica del provino lucidato.
   - Se non fornito: per acciai usare come stima prudente S'n circa 0.5 Rm, dichiarando che e una stima.
2. Applicare i coefficienti correttivi:
   - CL: coefficiente di carico
   - CG: coefficiente dimensionale
   - CS: coefficiente superficiale
   - altri eventuali coefficienti se noti: temperatura, affidabilita, ambiente
3. Ottenere:
   - Sn = S'n * CL * CG * CS * ...
4. Considerare intagli/concentrazioni:
   - Kt teorico se noto
   - q sensibilita all'intaglio se nota
   - Kf = 1 + q (Kt - 1)
5. Correggere le tensioni alternate:
   - sigma_a_eff = Kf * sigma_a
   - tau_a_eff = Kfs * tau_a, se torsione alternata
6. Calcolare tensione media e alternata:
   - sigma_m = (sigma_max + sigma_min) / 2
   - sigma_a = (sigma_max - sigma_min) / 2
7. Usare Goodman o Soderberg:
   - Goodman: sigma_a_eff / Sn + sigma_m / Rm <= 1 / n
   - Soderberg: sigma_a_eff / Sn + sigma_m / Re <= 1 / n
8. Se sono presenti flessione e torsione alternate, usare tensione equivalente alternata e media:
   - sigma_a_eq = sqrt(sigma_a^2 + 3 tau_a^2)
   - sigma_m_eq = sqrt(sigma_m^2 + 3 tau_m^2)
   poi applicare Goodman/Soderberg.

Nota importante:
- Goodman e meno prudente di Soderberg.
- Soderberg usa Re ed e piu conservativo.
- Se l'utente chiede verifica sicura, riportare entrambi quando possibile.

BULLONI
Dati necessari:
- Classe vite: 8.8, 10.9, ecc.
- Diametro e area resistente Ares.
- Numero bulloni.
- Tipo carico: trazione, taglio, precarico, attrito.

Stime:
- Classe 8.8: Rm circa 800 MPa, Re circa 640 MPa
- Classe 10.9: Rm circa 1000 MPa, Re circa 900 MPa

Verifiche:
- Trazione: sigma = F / Ares
- Taglio medio: tau = F / Ares
- Se piu bulloni: dividere il carico solo se la ripartizione e giustificata.
- Non assumere ripartizione uniforme se la geometria non e simmetrica.

LINGUETTE
Verifiche principali:
- Taglio linguetta
- Pressione/rifollamento sui fianchi

Formule indicative con coppia T:
- tau = 2T / (d b L)
- p = 4T / (d h L)
Dove:
- d diametro albero
- b larghezza linguetta
- h altezza linguetta
- L lunghezza utile

Perni e spinotti:
- Taglio singolo: tau = F / A
- Doppio taglio: tau = F / (2A)
- Flessione del perno se il carico non e applicato vicino ai supporti
- Pressione specifica foro/perno: p = F / (d L)

CUSCINETTI
Non dare esito definitivo senza:
- carico radiale Fr
- carico assiale Fa
- velocita
- vita richiesta
- tipo cuscinetto
- coefficiente C o C0

Formula base vita:
- L10 = (C/P)^p milioni di giri
- p = 3 per sfere
- p = 10/3 per rulli

TOLLERANZE E RUGOSITA
Indicazioni tipiche, non sostituiscono norma:
- Sede cuscinetto foro: H7
- Albero con cuscinetto rotante: k6/m6 secondo carico
- Accoppiamento scorrevole: H7/f7
- Accoppiamento fisso: H7/p6 o H7/s6 secondo interferenza
- Rugosita generica: Ra 3.2 - 6.3 micrometri
- Sedi cuscinetto/tenute: Ra 0.8 - 1.6 micrometri

OUTPUT CONSIGLIATO PER VERIFICHE
Usare questo formato:
1. Dati usati
2. Ipotesi
3. Formule
4. Calcoli
5. Risultato numerico
6. Confronto
7. Esito
8. Dati mancanti / miglioramenti

LIMITI
Non affermare conformita normativa se non sono noti norma, materiale certificato, trattamenti, tolleranze, ambiente e fattori di sicurezza.
`;
