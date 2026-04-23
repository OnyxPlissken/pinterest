import { generatePinterestCsv } from "../../../lib/pinterest";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await generatePinterestCsv({
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      ruleId: body?.ruleId ?? "",
      origin: request.nextUrl.origin
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Errore interno."
      },
      {
        status: 500
      }
    );
  }
}
