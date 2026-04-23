import { previewPinterestSelection } from "../../../lib/pinterest";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const preview = await previewPinterestSelection({
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      origin: request.nextUrl.origin
    });

    return Response.json(preview);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Errore durante la creazione dell'anteprima."
      },
      {
        status: 500
      }
    );
  }
}
