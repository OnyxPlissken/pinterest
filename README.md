# ISAIA Pinterest CSV Generator

Applicazione Next.js da deployare su Vercel per generare on demand un file CSV compatibile con Pinterest partendo dalle immagini presenti su SharePoint in `Shared Folder/02_Collezioni` del sito `https://isaia.sharepoint.com/sites/branding`.

## Cosa fa

- legge SharePoint via Microsoft Graph con autenticazione applicativa a certificato
- parte da `Shared Folder/02_Collezioni`
- supporta un sotto-percorso opzionale da UI, ad esempio `SS26/Lookbook`
- seleziona una sola immagine per look, tenendo il file con il numero finale piu basso
- carica le immagini selezionate in Vercel Blob pubblico
- genera il CSV Pinterest con URL immagine realmente pubblici
- restituisce un link per scaricare il CSV generato

## Setup locale

```bash
npm install
npm run dev
```

## Variabili ambiente richieste

### SharePoint

- `SHAREPOINT_TENANT_ID`
- `SHAREPOINT_CLIENT_ID`
- `SHAREPOINT_THUMBPRINT`
- `SHAREPOINT_PRIVATE_KEY` oppure `SHAREPOINT_PRIVATE_KEY_BASE64`
- `SHAREPOINT_HOSTNAME=isaia.sharepoint.com`
- `SHAREPOINT_SITE_PATH=/sites/branding`
- `SHAREPOINT_DRIVE_NAME=Documenti condivisi`
- `SHAREPOINT_BASE_FOLDER=Shared Folder/02_Collezioni`

### Output Pinterest

- `PINTEREST_TITLE_PREFIX=Isaia Napoli`
- `PINTEREST_DESCRIPTION_PREFIX=ISAIA Napoli`
- `PINTEREST_LINK_URL=https://www.isaia.it/`
- `PINTEREST_THUMBNAIL_MODE=blank`

### Protezione app

- `BASIC_AUTH_USERNAME`
- `BASIC_AUTH_PASSWORD`

### Vercel Blob

- `BLOB_READ_WRITE_TOKEN`

## Permessi Microsoft Graph

Per questa implementazione basta accesso in lettura al sito/document library SharePoint, perche i link pubblici delle immagini vengono serviti da Vercel Blob e non da SharePoint.

L'app Entra ID deve quindi avere permessi applicativi con admin consent per leggere sito, libreria e file necessari.

## Deploy su Vercel

1. collega la repo a un progetto Vercel
2. crea e collega un Blob store pubblico
3. imposta le environment variables
4. deploya

## Nota importante

Il solo thumbprint non basta per autenticare l'app su Vercel. Serve anche la chiave privata del certificato corrispondente, da caricare come `SHAREPOINT_PRIVATE_KEY` oppure `SHAREPOINT_PRIVATE_KEY_BASE64`.
