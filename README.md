# ISAIA Pinterest CSV Generator

Applicazione Next.js da deployare su Vercel per generare on demand un file CSV compatibile con Pinterest partendo dalle immagini presenti su SharePoint in `Shared Folder/02_Collezioni` del sito `https://isaia.sharepoint.com/sites/branding`.

## Cosa fa

- legge SharePoint via SharePoint REST con autenticazione applicativa
- parte da `Shared Folder/02_Collezioni`
- espone un explorer per navigare cartelle e file SharePoint
- fa selezionare stagione, una o piu sotto-cartelle e una o piu sotto-sotto-cartelle
- permette la scelta rapida `tutte` oppure la multiselezione manuale
- mostra un'anteprima reale dei pin prima della generazione
- seleziona una sola immagine per look, tenendo il file con il numero finale piu basso
- genera URL immagine pubblici serviti dall'app come proxy live da SharePoint, senza usare Blob
- genera il CSV Pinterest senza dipendere da Vercel Blob
- puo sincronizzare direttamente Pinterest via API, creando board/sezioni, creando nuovi Pin, aggiornando metadati, sostituendo Pin quando cambia l'immagine SharePoint ed eliminando Pin quando l'immagine sparisce dalla selezione
- include una vista di amministrazione Pinterest per navigare bacheche, sezioni e Pin gia presenti, vedere la privacy delle bacheche, spostare Pin in massa ed eliminare Pin senza eliminare bacheche o sezioni
- salva utenti, regole e impostazioni operative in file cifrati su SharePoint, senza dipendere da Vercel Blob
- restituisce il CSV pronto al download dalla dashboard

## Setup locale

```bash
npm install
npm run dev
```

## Variabili ambiente richieste

### SharePoint

- `SHAREPOINT_TENANT_ID`
- `SHAREPOINT_CLIENT_ID`
- `SHAREPOINT_CLIENT_SECRET` oppure, in alternativa, autenticazione a certificato con:
  - `SHAREPOINT_THUMBPRINT`
  - `SHAREPOINT_PRIVATE_KEY` oppure `SHAREPOINT_PRIVATE_KEY_BASE64`
- `SHAREPOINT_HOSTNAME=isaia.sharepoint.com`
- `SHAREPOINT_SITE_PATH=/sites/branding`
- `SHAREPOINT_DRIVE_NAME=Documenti condivisi`
- `SHAREPOINT_BASE_FOLDER=Shared Folder/02_Collezioni`
- `PUBLIC_APP_ORIGIN` opzionale, utile per fissare il dominio pubblico dell'app
- `MEDIA_SIGNING_SECRET` opzionale, per firmare i Media URL pubblici

### Output Pinterest

- `PINTEREST_TITLE_PREFIX=Isaia Napoli`
- `PINTEREST_DESCRIPTION_PREFIX=ISAIA Napoli`
- `PINTEREST_LINK_URL=https://www.isaia.it/` opzionale, puo restare vuoto o essere modificato da impostazioni
- `PINTEREST_THUMBNAIL_MODE=blank`
- `PINTEREST_ACCESS_TOKEN` opzionale se preferisci configurarlo da variabili ambiente invece che dalle impostazioni cifrate

### Sync Pinterest API

Il sync usa il manifest cifrato `pinterest-sync.store` nella cartella `APP_STORAGE_FOLDER` su SharePoint per ricordare quali asset sono gia stati pubblicati. La chiave principale e l'`UniqueId` SharePoint del file, quindi un rename dello stesso file aggiorna il manifest e i metadati senza creare duplicati. Se cambia il fingerprint dell'immagine, il Pin precedente viene eliminato e ricreato perche l'update del media di un Pin non e garantito dall'API Pinterest. Se un'immagine gia sincronizzata sparisce da una cartella selezionata, il relativo Pin viene eliminato.

La vista `Pinterest` usa l'API collegata per leggere le bacheche, le sezioni e i Pin esistenti. Le azioni massive aggiornano o cancellano solo i Pin selezionati: non eliminano mai il contenitore, quindi bacheche e sezioni restano disponibili.

### Login e utenti

- `AUTH_SECRET` consigliato per firmare la sessione
- `AUTH_BOOTSTRAP_USERNAME` e `AUTH_BOOTSTRAP_PASSWORD` per creare il primo amministratore
- `APP_STORAGE_FOLDER` opzionale, default `__PinterestAssetsManagement`, per cambiare la cartella SharePoint usata come storage cifrato di utenti, regole e impostazioni

Se non imposti `AUTH_BOOTSTRAP_*`, l'app puo usare in fallback `BASIC_AUTH_USERNAME` e `BASIC_AUTH_PASSWORD` solo per bootstrap iniziale del primo utente.

## Permessi SharePoint

Per questa implementazione servono permessi applicativi di lettura al sito/document library SharePoint per immagini ed explorer. Se vuoi anche utenti/regole/impostazioni persistenti direttamente su SharePoint, l'app registration deve poter scrivere nella document library usata dall'app.

## Deploy su Vercel

1. collega la repo a un progetto Vercel
2. imposta le environment variables
3. deploya

## Nota importante

Se usi il flusso a secret devi impostare il `client secret value`, non il `Secret ID` mostrato da Entra. Se invece usi il flusso a certificato, il solo thumbprint non basta e serve anche la chiave privata del certificato corrispondente.
