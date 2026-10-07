// Service for direct integration with Google Drive (drive.file scope)
// Creates and manages the dedicated folder "ONE Estudio Gráfico - Cotizaciones" in the user's Drive

export interface GoogleDriveFolder {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
}

const DRIVE_FOLDER_NAME = "ONE Estudio Gráfico - Cotizaciones";

/**
 * Searches for or creates the dedicated quotation folder in the user's Google Drive.
 */
export async function getOrCreateDriveFolder(accessToken: string): Promise<GoogleDriveFolder> {
  // 1. Try to find existing folder
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${DRIVE_FOLDER_NAME}' and trashed = false`);
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return {
        id: searchData.files[0].id,
        name: searchData.files[0].name,
        webViewLink: searchData.files[0].webViewLink,
      };
    }
  }

  // 2. Create the folder if not found
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      description: "Carpeta oficial de cotizaciones y archivos del sistema ONE estudio gráfico",
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || "No se pudo crear la carpeta en Google Drive");
  }

  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name,
    webViewLink: created.webViewLink,
  };
}

/**
 * Uploads or updates a quotation JSON/metadata file directly into the designated Google Drive folder.
 */
export async function saveQuoteToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  quoteData: any
): Promise<GoogleDriveFile> {
  const jsonContent = JSON.stringify(quoteData, null, 2);
  
  // Check if a file with this name already exists in the folder
  const checkQuery = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
  const checkRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${checkQuery}&fields=files(id,name,webViewLink)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  let existingFileId: string | null = null;
  if (checkRes.ok) {
    const checkData = await checkRes.json();
    if (checkData.files && checkData.files.length > 0) {
      existingFileId = checkData.files[0].id;
    }
  }

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = existingFileId
    ? { mimeType: "application/json" }
    : {
        name: fileName,
        mimeType: "application/json",
        parents: [folderId],
        description: `Cotización ${quoteData.id || ''} - ONE estudio gráfico`,
      };

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    jsonContent +
    closeDelimiter;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";

  const method = existingFileId ? "PATCH" : "POST";

  const uploadRes = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al subir cotización a Google Drive");
  }

  return await uploadRes.json();
}

/**
 * Lists all quotation files currently saved inside the Google Drive folder.
 */
export async function listQuotesFromDrive(accessToken: string, folderId: string): Promise<any[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/json' and trashed = false`);
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    throw new Error("No se pudo listar los archivos de la carpeta en Google Drive");
  }

  const listData = await listRes.json();
  const files = listData.files || [];

  // Download content of each quotation file
  const quotes: any[] = [];
  for (const file of files) {
    try {
      const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (getRes.ok) {
        const quoteObj = await getRes.json();
        quoteObj.driveFileId = file.id;
        quoteObj.driveWebViewLink = file.webViewLink;
        quotes.push(quoteObj);
      }
    } catch (e) {
      console.warn(`Error reading Drive file ${file.name}:`, e);
    }
  }

  return quotes;
}
