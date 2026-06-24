// Bsale DTE client — emite boletas y facturas electrónicas en nombre del negocio.
// Cada negocio usa su propia API Key; AgendaMok nunca la almacena en texto plano
// fuera de la columna businesses.bsaleApiKey.

const BSALE_API = "https://api.bsale.io/v1"

export interface BsaleDocumentInput {
  apiKey: string
  docType: "BOLETA" | "FACTURA"
  amount: number          // monto bruto en CLP (sin decimales)
  clientName?: string
  clientRut?: string
  clientEmail?: string
  description: string     // nombre del servicio / concepto
  date?: Date
}

export interface BsaleDocumentResult {
  bsaleId: number
  number: number
  pdfUrl: string
  xmlUrl?: string
}

// Bsale usa document_type_id para distinguir boletas de facturas.
// 1 = Boleta electrónica (39), 6 = Factura electrónica (33) — los IDs varían
// por cuenta, pero la convención más común es obtenerlos dinámicamente.
// Para simplificar el primer ciclo usamos los IDs estándar de Bsale Chile.
const DOC_TYPE_ID: Record<"BOLETA" | "FACTURA", number> = {
  BOLETA:  1,
  FACTURA: 6,
}

async function bsaleFetch(
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${BSALE_API}${path}`, {
    ...options,
    headers: {
      "access_token": apiKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })
}

/**
 * Verifica que la API Key sea válida consultando el perfil de la cuenta.
 * Retorna true si la conexión es exitosa.
 */
export async function bsaleTestConnection(apiKey: string): Promise<boolean> {
  try {
    const res = await bsaleFetch(apiKey, "/users.json")
    return res.ok
  } catch {
    return false
  }
}

/**
 * Emite un documento tributario electrónico (boleta o factura) en Bsale.
 */
export async function bsaleCreateDocument(
  input: BsaleDocumentInput
): Promise<BsaleDocumentResult> {
  const { apiKey, docType, amount, clientName, clientRut, clientEmail, description, date } = input

  // Bsale API v1 — structure for /documents.json
  const body: Record<string, unknown> = {
    documentTypeId: DOC_TYPE_ID[docType],
    officeId: 1, // oficina principal (ajustable por negocio en futuras versiones)
    emissionDate: Math.floor((date ?? new Date()).getTime() / 1000),
    expirationDate: Math.floor((date ?? new Date()).getTime() / 1000),
    declare: 1,
    details: [
      {
        quantity: 1,
        netUnitValue: docType === "FACTURA" ? Math.round(amount / 1.19) : amount,
        comment: description,
        taxId: docType === "FACTURA" ? "[1]" : undefined,
      },
    ],
    ...(clientRut || clientName || clientEmail
      ? {
          client: {
            code: clientRut ?? undefined,
            firstName: clientName ?? "Consumidor",
            lastName: "Final",
            email: clientEmail ?? undefined,
            activity: docType === "FACTURA" ? "Sin actividad" : undefined,
          },
        }
      : {}),
  }

  const res = await bsaleFetch(apiKey, "/documents.json", {
    method: "POST",
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bsale error ${res.status}: ${err}`)
  }

  const data = await res.json()

  // Bsale retorna el documento creado — extraemos lo que necesitamos
  const doc = data
  const pdfUrl: string = doc.urlPdf ?? doc.pdf?.urlInternal ?? ""
  const xmlUrl: string | undefined = doc.urlXml ?? undefined

  return {
    bsaleId: doc.id,
    number: doc.number ?? doc.folio,
    pdfUrl,
    xmlUrl,
  }
}
