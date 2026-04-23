function extractMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || "");
}

export function normalizeOperationalError(error, fallbackMessage = "Operazione non completata.") {
  const rawMessage = extractMessage(error);
  const lowerMessage = rawMessage.toLowerCase();

  if (
    lowerMessage.includes("autenticazione microsoft fallita") ||
    ((lowerMessage.includes("sharepoint") || lowerMessage.includes("microsoft graph")) &&
      (lowerMessage.includes("401") || lowerMessage.includes("403")))
  ) {
    return {
      status: 403,
      message:
        "L'app non ha accesso ai contenuti SharePoint richiesti. Verifica permessi applicativi, consenso amministratore e libreria selezionata."
    };
  }

  if (
    lowerMessage.includes("non punta a una cartella sharepoint") ||
    (lowerMessage.includes("sharepoint rest 404") && lowerMessage.includes("getfolder"))
  ) {
    return {
      status: 404,
      message:
        "La cartella SharePoint selezionata non e stata trovata. Controlla stagione, cartella e sotto-cartella prima di riprovare."
    };
  }

  if (lowerMessage.includes("nessuna immagine valida trovata")) {
    return {
      status: 422,
      message:
        "Nelle cartelle selezionate non risultano immagini utilizzabili per il CSV. Controlla naming dei file, presenza dei LOOK e struttura della selezione."
    };
  }

  if (
    lowerMessage.includes("regola richiesta non disponibile") ||
    lowerMessage.includes("regola non compatibile") ||
    lowerMessage.includes("regola non trovata") ||
    lowerMessage.includes("regola inattiva")
  ) {
    return {
      status: 400,
      message:
        "La regola selezionata non e compatibile con l'operazione richiesta. Scegli una regola attiva oppure aggiorna la configurazione."
    };
  }

  if (
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("aborted") ||
    lowerMessage.includes("etimedout") ||
    lowerMessage.includes("connect timeout")
  ) {
    return {
      status: 504,
      message:
        "SharePoint non ha risposto nei tempi previsti. Riprova tra qualche minuto o riduci la selezione da elaborare."
    };
  }

  if (lowerMessage.includes("sharepoint rest") || lowerMessage.includes("sharepoint")) {
    return {
      status: 502,
      message:
        "SharePoint ha restituito un errore durante la lettura dei contenuti. Verifica il percorso oppure riprova piu tardi."
    };
  }

  return {
    status: 500,
    message: rawMessage || fallbackMessage
  };
}
