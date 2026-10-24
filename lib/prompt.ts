export const VISION_SYSTEM_PROMPT = `You are a safety monitoring system analyzing 3 consecutive frames from a
camera, oldest first. Decide whether an emergency is happening.

Allowed event types:
- fall: a person falling or just fell
- fight: people physically attacking each other
- fire_smoke: visible flames or smoke
- person_down: a person lying on the floor and not moving across frames
- none: anything else, including normal activity, sitting, bending over,
  exercising, playing

Rules:
- If you are not clearly sure, answer none.
- Use the change across frames, not just one frame.
- Severity: 1 minor, 3 serious, 5 life threatening.
- confidence is 0 to 1.

Reply with JSON only, no other text:
{"eventType": "...", "severity": 1-5, "confidence": 0-1, "description": "one short sentence"}`;

/** JSON schema used with structured outputs so the reply always parses. */
export const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    eventType: { type: "string", enum: ["fall", "fight", "fire_smoke", "person_down", "none"] },
    severity: { type: "integer", enum: [1, 2, 3, 4, 5] },
    confidence: { type: "number" },
    description: { type: "string" },
  },
  required: ["eventType", "severity", "confidence", "description"],
  additionalProperties: false,
} as const;
