import { GoogleGenAI } from "@google/genai"
import { jwtVerify } from "jose"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const SYSTEM_INSTRUCTION = `You are Omni, the AI workspace assistant for huzlr.
Help users think through projects, teams, issues, planning, execution, and coordination.
Be concise, practical, and clear. Ask one focused follow-up question when context is missing.
Never claim that you changed workspace data unless a tool result explicitly confirms it.`

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const secretKey = process.env.JWT_SECRET || "your-super-secret-key-change-it"
    const secret = new TextEncoder().encode(secretKey)
    const { payload } = await jwtVerify(token, secret)

    if (payload.has_access !== true) {
      return NextResponse.json({ error: "Access required" }, { status: 403 })
    }

    const body = await request.json()
    const rawMessages: unknown[] = Array.isArray(body?.messages) ? body.messages : []
    const messages: ChatMessage[] = rawMessages
      .filter(
        (message: unknown): message is ChatMessage =>
          typeof message === "object" &&
          message !== null &&
          (message as ChatMessage).role !== undefined &&
          ["user", "assistant"].includes((message as ChatMessage).role) &&
          typeof (message as ChatMessage).content === "string",
      )
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content.trim().slice(0, 4_000),
      }))
      .filter((message) => message.content.length > 0)

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "A user message is required" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Omni is not configured" }, { status: 503 })
    }

    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    })

    const message = response.text?.trim()
    if (!message) {
      return NextResponse.json({ error: "Omni returned an empty response" }, { status: 502 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Omni chat failed:", error)
    return NextResponse.json({ error: "Omni could not respond right now" }, { status: 500 })
  }
}
