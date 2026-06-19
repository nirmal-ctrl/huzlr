import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");

    // Protect the webhook endpoint using an environment secret
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: "Invalid revalidation secret token" }, { status: 401 });
    }

    // Strapi webhook sends which model got updated. We can selectively target tags or clear the whole 'strapi' tag
    // @ts-ignore
    revalidateTag("strapi");

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
