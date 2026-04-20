import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlexaEnvelope = {
  version: string;
  session?: { application?: { applicationId?: string } };
  request: {
    type: "LaunchRequest" | "IntentRequest" | "SessionEndedRequest";
    intent?: {
      name: string;
      slots?: Record<string, { name: string; value?: string }>;
    };
  };
};

function speak(text: string, shouldEndSession = true) {
  return NextResponse.json({
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text },
      shouldEndSession,
    },
  });
}

export async function POST(req: NextRequest) {
  const expectedSkillId = process.env.ALEXA_SKILL_ID;
  let body: AlexaEnvelope;
  try {
    body = (await req.json()) as AlexaEnvelope;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const skillId = body.session?.application?.applicationId;
  if (expectedSkillId && skillId !== expectedSkillId) {
    return NextResponse.json({ error: "skill id mismatch" }, { status: 401 });
  }

  if (body.request.type === "LaunchRequest") {
    return speak("AraTrack ready. You can say log a feed of 3 ounces, or log a wet diaper.", false);
  }
  if (body.request.type === "SessionEndedRequest") {
    return NextResponse.json({ version: "1.0", response: { shouldEndSession: true } });
  }
  if (body.request.type !== "IntentRequest" || !body.request.intent) {
    return speak("I didn't catch that.");
  }

  const intentName = body.request.intent.name;
  const slots = body.request.intent.slots ?? {};
  const supabase = getServerSupabase();
  if (!supabase) return speak("AraTrack is not configured. Check the server environment variables.");

  const caregiver = "Alexa";

  if (intentName === "LogFeedIntent") {
    const oz = Number(slots.ounces?.value);
    if (!Number.isFinite(oz) || oz <= 0) return speak("How many ounces? Try: log a feed of three ounces.");
    const { error } = await supabase.from("events").insert({
      event_type: "feed",
      quantity_oz: Math.round(oz * 10) / 10,
      logged_by: caregiver,
    });
    if (error) return speak(`Sorry, I couldn't save that. ${error.message}`);
    return speak(`Logged ${oz} ounce feed.`);
  }

  if (intentName === "LogDiaperIntent") {
    const type = (slots.type?.value ?? "").toLowerCase();
    const valid = ["wet", "dirty", "both"];
    const subtype = valid.includes(type) ? type : null;
    if (!subtype) return speak("Was it wet, dirty, or both?");
    const { error } = await supabase.from("events").insert({
      event_type: "diaper",
      subtype,
      logged_by: caregiver,
    });
    if (error) return speak(`Sorry, I couldn't save that. ${error.message}`);
    return speak(`Logged ${subtype} diaper.`);
  }

  if (intentName === "AMAZON.HelpIntent") {
    return speak("Try: log a feed of three ounces, or log a dirty diaper.", false);
  }
  if (intentName === "AMAZON.CancelIntent" || intentName === "AMAZON.StopIntent") {
    return speak("Goodbye.");
  }

  return speak("I didn't understand that intent.");
}
