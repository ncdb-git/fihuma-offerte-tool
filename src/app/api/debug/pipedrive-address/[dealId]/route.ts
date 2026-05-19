import { NextResponse } from "next/server";
import { fetchPipedriveDealBundle } from "@/lib/pipedrive";
import { discoverAddressFieldKeys, listAddressRelatedFields } from "@/lib/pipedrive-field-discovery";
import { resolveCustomerAddressFromBundle } from "@/lib/pipedrive-address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — debug adres-mapping voor een Pipedrive deal (geen secrets). */
export async function GET(_: Request, { params }: { params: { dealId: string } }) {
  try {
    if (!process.env.PIPEDRIVE_API_TOKEN) {
      return NextResponse.json({ ok: false, reason: "PIPEDRIVE_API_TOKEN ontbreekt" }, { status: 503 });
    }

    const dealId = params.dealId;
    const bundle = await fetchPipedriveDealBundle(dealId);
    const resolved = await resolveCustomerAddressFromBundle(bundle);
    const fieldKeys = await discoverAddressFieldKeys();
    const relatedFields = await listAddressRelatedFields();

    return NextResponse.json({
      ok: true,
      dealId,
      resolved: {
        address: resolved.address,
        postalCode: resolved.postalCode,
        city: resolved.city,
        sources: resolved.sources
      },
      envConfigured: {
        PIPEDRIVE_FIELD_ADRES: Boolean(process.env.PIPEDRIVE_FIELD_ADRES?.trim()),
        PIPEDRIVE_FIELD_POSTCODE: Boolean(process.env.PIPEDRIVE_FIELD_POSTCODE?.trim()),
        PIPEDRIVE_FIELD_WOONPLAATS: Boolean(process.env.PIPEDRIVE_FIELD_WOONPLAATS?.trim())
      },
      fieldKeys,
      relatedFields,
      rawFieldValues: resolved.debug,
      hint: "Als resolved leeg is: controleer of env keys de 40-char API hash zijn (niet de veldnaam). Zie relatedFields voor beschikbare velden."
    });
  } catch (error) {
    const err = error as { message?: string; code?: string };
    return NextResponse.json(
      { ok: false, error: { message: err.message ?? String(error), code: err.code } },
      { status: 500 }
    );
  }
}
